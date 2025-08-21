'use server'

export async function enableDomains(cdp) {
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
}

export async function navigate(cdp, url) {
  await cdp.send('Page.navigate', { url })
  await new Promise(r => setTimeout(r, 1000))
}

export async function evalOnPage(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
  })
  return result.result?.value
}

export async function waitForSelector(cdp, selector, timeoutMs = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const found = await evalOnPage(cdp, `!!document.querySelector(${JSON.stringify(selector)})`)
    if (found) return { ok: true, durationMs: Date.now() - start }
    await new Promise(r => setTimeout(r, 50))
  }
  return { ok: false, durationMs: Date.now() - start, error: 'Timeout waiting for selector' }
}

export async function setInputValue(cdp, selector, value) {
  return evalOnPage(cdp, `
    (function(){
      const el = document.querySelector(${JSON.stringify(selector)});
      if(!el) return { error: 'Selector not found' };
      el.focus();
      el.value = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { ok: true };
    })()
  `)
}

export async function clickSelector(cdp, selector) {
  return evalOnPage(cdp, `
    (function(){
      const el = document.querySelector(${JSON.stringify(selector)});
      if(!el) return { error: 'Selector not found' };
      el.click();
      return { ok: true };
    })()
  `)
}

export async function waitForNavigation(cdp, expectedUrlGlob = null, timeoutMs = 5000) {
  const start = Date.now()
  function globToRegex(glob) {
    return new RegExp('^' + glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*') + '$')
  }
  const re = expectedUrlGlob ? globToRegex(expectedUrlGlob) : null
  while (Date.now() - start < timeoutMs) {
    const href = await evalOnPage(cdp, 'location.href')
    if (!re || re.test(href)) {
      return { ok: true, url: href, durationMs: Date.now() - start }
    }
    await new Promise(r => setTimeout(r, 50))
  }
  const url = await evalOnPage(cdp, 'location.href')
  return { ok: false, url, durationMs: Date.now() - start, error: 'Timeout waiting for navigation' }
}

export async function startEventCapture(cdp) {
  const consoleMessages = []
  const networkRequests = []
  await cdp.send('Log.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')

  cdp.ws.on('message', raw => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.method === 'Runtime.consoleAPICalled') {
        const level = msg.params.type
        const text = (msg.params.args || []).map(a => a.value ?? a.description ?? '').join(' ')
        consoleMessages.push({ level, text })
      }
      if (msg.method === 'Network.requestWillBeSent') {
        const { requestId, request, timestamp } = msg.params
        networkRequests.push({
          id: requestId,
          url: request.url,
          method: request.method,
          timestamp,
          status: null,
          responseTime: null,
          requestHeaders: request.headers || {},
          responseBody: null
        })
      }
      if (msg.method === 'Network.responseReceived') {
        const { requestId, response, timestamp } = msg.params
        const item = networkRequests.find(r => r.id === requestId)
        if (item) {
          item.status = response.status
          item.responseTime = Math.round((timestamp - (item.timestamp || timestamp)) * 1000)
        }
      }
    } catch {}
  })
  return { consoleMessages, networkRequests }
}

export async function captureScreenshot(cdp) {
  try {
    const res = await cdp.send('Page.captureScreenshot', { format: 'png' })
    return res.data || null
  } catch { return null }
}

export async function domSnapshot(cdp) {
  return {
    finalTitle: await evalOnPage(cdp, 'document.title'),
    finalUrl: await evalOnPage(cdp, 'location.href'),
    elementsFound: await evalOnPage(cdp, `
      (function(){
        const els = [];
        if (document.querySelector('nav')) els.push('nav');
        if (document.querySelector('main')) els.push('main');
        if (document.querySelector('.welcome-message')) els.push('.welcome-message');
        return els;
      })()
    `)
  }
}
