'use server'

import { launchChrome, getWebSocketDebuggerUrl, connectCDP, createPageSession } from './cdpClient.js'
import {
  enableDomains, navigate, evalOnPage,
  waitForSelector, setInputValue, clickSelector, waitForNavigation,
  startEventCapture, captureScreenshot, domSnapshot
} from './pageOps.js'
import { assertSelectOptions, assertSelectSelectable } from './selectTest.js'

function resolveBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'
}

export async function runBrowserTest(test) {
  const stepsOut = []
  const startedAt = Date.now()
  const baseUrl = resolveBaseUrl()

  let cdp = null
  let capture = { consoleMessages: [], networkRequests: [] }
  try {
    const chromePath = process.env.CHROME_PATH || process.env.GOOGLE_CHROME_SHIM
    const { port } = await launchChrome({ chromePath })
    const wsUrl = await getWebSocketDebuggerUrl(port)
    const root = await connectCDP(wsUrl)
    // Create a page target and attach a session scoped to that page
    cdp = await createPageSession(root, new URL(test.pageUrl || '/', baseUrl).toString())
    await enableDomains(cdp)
    capture = await startEventCapture(cdp)
  } catch (e) {
    stepsOut.push({ step: 'launch_browser', status: 'failed', error: e.message })
    return {
      status: 'failed',
      duration: Date.now() - startedAt,
      logs: [{
        type: 'cdp',
        action: test.action || 'browser_flow',
        url: new URL(test.pageUrl || '/', baseUrl).toString(),
        steps: stepsOut,
        totalDurationMs: Date.now() - startedAt,
        screenshot: null,
        consoleMessages: capture.consoleMessages,
        networkRequests: capture.networkRequests,
        domSnapshot: null,
        validations: [],
        status: 'failed',
        error: e.message
      }]
    }
  }

  try {
    for (const step of test.browserSteps || []) {
      if (step.action === 'goto') {
        const url = new URL(step.url || test.pageUrl || '/', baseUrl).toString()
        const t0 = Date.now()
        await navigate(cdp, url)
        stepsOut.push({ step: 'navigate', url, status: 'success', durationMs: Date.now() - t0, domContentLoaded: true, networkIdle: true })
      } else if (step.action === 'wait_for_selector') {
        const t0 = Date.now()
        const r = await waitForSelector(cdp, step.selector)
        stepsOut.push({ step: 'wait_for_selector', selector: step.selector, status: r.ok ? 'success' : 'failed', durationMs: r.durationMs, elementFound: r.ok })
        if (!r.ok && test.stopOnFirstFailure) break
      } else if (step.action === 'fill_input') {
        const t0 = Date.now()
        const r = await setInputValue(cdp, step.selector, step.value)
        stepsOut.push({ step: 'fill_input', selector: step.selector, value: step.value, status: r?.ok ? 'success' : 'failed', durationMs: Date.now() - t0 })
        if (!r?.ok && test.stopOnFirstFailure) break
      } else if (step.action === 'click') {
        const t0 = Date.now()
        const r = await clickSelector(cdp, step.selector)
        stepsOut.push({ step: 'click', selector: step.selector, status: r?.ok ? 'success' : 'failed', durationMs: Date.now() - t0 })
        if (!r?.ok && test.stopOnFirstFailure) break
      } else if (step.action === 'wait_for_navigation') {
        const t0 = Date.now()
        const r = await waitForNavigation(cdp, step.expectedUrl)
        stepsOut.push({ step: 'wait_for_navigation', expectedUrl: step.expectedUrl || null, actualUrl: r.url, status: r.ok ? 'success' : 'failed', durationMs: r.durationMs })
        if (!r.ok && test.stopOnFirstFailure) break
      } else if (step.action === 'assertSelectOptions') {
        const r = await assertSelectOptions(cdp, step.selector || test.selector, step.expected || test.expectedOptions)
        stepsOut.push({ step: 'assert_select_options', selector: step.selector || test.selector, status: r.pass ? 'success' : 'failed', message: r.message })
      } else if (step.action === 'assertSelectSelectable') {
        const r = await assertSelectSelectable(cdp, step.selector || test.selector)
        stepsOut.push({ step: 'assert_select_selectable', selector: step.selector || test.selector, status: r.pass ? 'success' : 'failed', message: r.message })
      } else {
        stepsOut.push({ step: step.action, status: 'skipped', note: 'unknown action' })
      }
    }
  } catch (e) {
    stepsOut.push({ step: 'runner_error', status: 'failed', error: e.message })
  }

  const pass = stepsOut.every(s => s.status !== 'failed')

  // Capture artifacts before closing the CDP connection to avoid hanging sends
  let screenshotData = null
  let domData = null
  try { screenshotData = await captureScreenshot(cdp) } catch { screenshotData = null }
  try { domData = await domSnapshot(cdp) } catch { domData = null }

  // Now it is safe to close the websocket
  try { cdp && cdp.ws && cdp.ws.close() } catch {}

  return {
    status: pass ? 'passed' : 'failed',
    duration: Date.now() - startedAt,
    logs: [{
      type: 'cdp',
      action: test.action || 'browser_flow',
      url: new URL(test.pageUrl || '/', baseUrl).toString(),
      steps: stepsOut,
      totalDurationMs: Date.now() - startedAt,
      screenshot: screenshotData,
      consoleMessages: capture.consoleMessages,
      networkRequests: capture.networkRequests,
      domSnapshot: domData,
      validations: [],
      status: pass ? 'passed' : 'failed',
      error: pass ? null : (stepsOut.find(s => s.status === 'failed')?.error || 'Failed step')
    }]
  }
}


