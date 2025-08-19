'use server'

import { launchChrome, getWebSocketDebuggerUrl, connectCDP } from './cdpClient.js'
import { enableDomains, navigate, evalOnPage } from './pageOps.js'
import { assertSelectOptions, assertSelectSelectable } from './selectTest.js'

function resolveBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function runBrowserTest(test) {
  const logs = []
  const results = []
  const startedAt = Date.now()
  const baseUrl = resolveBaseUrl()

  const chromePath = process.env.CHROME_PATH || process.env.GOOGLE_CHROME_SHIM || 'google-chrome'
  const { port } = await launchChrome({ chromePath })
  const wsUrl = await getWebSocketDebuggerUrl(port)
  const cdp = await connectCDP(wsUrl)
  await enableDomains(cdp)

  try {
    for (const step of test.browserSteps || []) {
      if (step.action === 'goto') {
        const url = new URL(step.url || test.pageUrl || '/', baseUrl).toString()
        logs.push({ type: 'info', message: `Navigating to ${url}` })
        await navigate(cdp, url)
      } else if (step.action === 'focus') {
        const selector = step.selector || test.selector
        logs.push({ type: 'info', message: `Focusing ${selector}` })
        await evalOnPage(cdp, `document.querySelector(${JSON.stringify(selector)})?.focus()`)
      } else if (step.action === 'assertSelectOptions') {
        const r = await assertSelectOptions(cdp, step.selector || test.selector, step.expected || test.expectedOptions)
        results.push({ name: 'assertSelectOptions', ...r })
      } else if (step.action === 'assertSelectSelectable') {
        const r = await assertSelectSelectable(cdp, step.selector || test.selector)
        results.push({ name: 'assertSelectSelectable', ...r })
      } else {
        logs.push({ type: 'warn', message: `Unknown action: ${step.action}` })
      }
    }
  } catch (e) {
    results.push({ name: 'runnerError', pass: false, message: e.message })
  } finally {
    try { cdp.ws.close() } catch {}
  }

  const pass = results.every(r => r.pass)
  return {
    status: pass ? 'passed' : 'failed',
    duration: Date.now() - startedAt,
    logs,
    assertions: results
  }
}


