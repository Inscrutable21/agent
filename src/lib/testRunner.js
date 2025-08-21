'use server'

// Minimal in-house runner that performs real HTTP requests against your app
// and evaluates simple assertions. Falls back to basic reachability checks.

import { runBrowserTest } from './browserRunner.js'

function resolveBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.VERCEL_URL?.startsWith('http') ? process.env.VERCEL_URL : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'http://localhost:3000'
  )
}

function joinUrl(base, path) {
  try {
    if (!path) return base
    const url = new URL(path, base)
    return url.toString()
  } catch {
    return path
  }
}

export async function executeTestCaseReal(testCase) {
  // Prefer CDP when possible:
  // 1) Explicit browserSteps
  if (testCase?.metadata?.browserSteps && Array.isArray(testCase.metadata.browserSteps) && testCase.metadata.browserSteps.length > 0) {
    return await runBrowserTest(testCase.metadata)
  }
  // 2) Fallback CDP if pageUrl exists (auto-construct basic steps)
  if (testCase?.pageUrl) {
    const meta = {
      pageUrl: testCase.pageUrl,
      action: 'page_load',
      browserSteps: [
        { action: 'goto', url: testCase.pageUrl },
        { action: 'wait_for_selector', selector: 'body' }
      ],
      stopOnFirstFailure: true
    }
    return await runBrowserTest(meta)
  }

  // 3) HTTP runner only if neither browserSteps nor pageUrl exist but httpRequests provided
  const startedAt = Date.now()
  const logs = []
  let status = 'passed'
  let firstError = null

  const baseUrl = resolveBaseUrl()

  const runHttp = async (step) => {
    const method = (step.method || 'GET').toUpperCase()
    const url = joinUrl(baseUrl, step.url || testCase.pageUrl || '/')
    const headers = step.headers || { 'Content-Type': 'application/json' }
    const body = step.body ? (typeof step.body === 'string' ? step.body : JSON.stringify(step.body)) : undefined
    const t0 = Date.now()
    let ok = true
    let error = null
    let responseText = null
    let respStatus = 0
    try {
      const controller = new AbortController()
      const timeoutMs = Number(process.env.QA_HTTP_TIMEOUT_MS || 15000)
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      const resp = await fetch(url, { method, headers, body, cache: 'no-store', signal: controller.signal })
      clearTimeout(timeout)
      respStatus = resp.status
      responseText = await resp.text()
      if (step.expect?.status && resp.status !== step.expect.status) {
        ok = false
        error = `Expected status ${step.expect.status}, got ${resp.status}`
      }
      if (ok && step.expect?.contains && !responseText.includes(step.expect.contains)) {
        ok = false
        error = `Response does not contain required text`
      }
      if (ok && step.expect?.notContains && responseText.includes(step.expect.notContains)) {
        ok = false
        error = `Response contains forbidden text`
      }
    } catch (e) {
      ok = false
      error = e?.name === 'AbortError' ? `Request timeout after ${process.env.QA_HTTP_TIMEOUT_MS || 15000}ms` : (e?.message || 'Request failed')
    }
    const t1 = Date.now()
    logs.push({
      type: 'http',
      method,
      url,
      status: respStatus,
      durationMs: t1 - t0,
      ok,
      error
    })
    if (!ok) {
      status = 'failed'
      if (!firstError) firstError = error || 'HTTP step failed'
    }
  }

  const httpRequests = testCase?.metadata?.httpRequests
  if (Array.isArray(httpRequests) && httpRequests.length > 0) {
    for (const step of httpRequests) {
      await runHttp(step)
      if (status === 'failed' && testCase?.metadata?.stopOnFirstFailure) break
    }
  } else {
    status = 'failed'
    firstError = 'No executable pageUrl/browserSteps/httpRequests to run'
    logs.push({ type: 'info', message: firstError })
  }

  const duration = Date.now() - startedAt
  return {
    status,
    duration,
    errors: firstError ? [{ message: firstError }] : [],
    logs
  }
}


