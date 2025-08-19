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


