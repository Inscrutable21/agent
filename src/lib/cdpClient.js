'use server'

import { spawn } from 'child_process'
import http from 'http'
import net from 'net'
import WebSocket from 'ws'
import fs from 'fs'
import os from 'os'
import path from 'path'

function exists(p) {
  try { return !!p && fs.existsSync(p) } catch { return false }
}

function resolveChromeBinary(preferredPath) {
  if (exists(preferredPath)) return preferredPath

  const platform = os.platform()
  const candidates = []

  if (platform === 'win32') {
    const localApp = process.env.LOCALAPPDATA || 'C:\\Users\\Default\\AppData\\Local'
    candidates.push(
      process.env.CHROME_PATH,
      process.env.GOOGLE_CHROME_SHIM,
      // Common Chrome install locations
      path.join('C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join('C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Per-user Chrome install location
      path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Fallback to Microsoft Edge if Chrome not present
      path.join('C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join('C:\\Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe')
    )
  } else if (platform === 'darwin') {
    candidates.push(
      process.env.CHROME_PATH,
      process.env.GOOGLE_CHROME_SHIM,
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    )
  } else {
    candidates.push(
      process.env.CHROME_PATH,
      process.env.GOOGLE_CHROME_SHIM,
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/snap/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge'
    )
  }

  for (const c of candidates) {
    if (exists(c)) return c
  }
  return null
}

export async function launchChrome({ chromePath, port = 9222 }) {
  const resolved = resolveChromeBinary(chromePath)
  if (!resolved) {
    throw new Error('Chrome/Edge binary not found. Set CHROME_PATH to your browser executable, e.g., C\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  }
  const usePort = port ?? await getFreePort()
  const args = [
    '--headless=new',
    `--remote-debugging-port=${usePort}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  const proc = spawn(resolved, args, { stdio: 'ignore', detached: true })
  await new Promise(r => setTimeout(r, 800))
  return { proc, port: usePort }
}

export async function getWebSocketDebuggerUrl(port = 9222) {
  // Retry a few times while Chrome starts
  for (let i = 0; i < 50; i++) {
    try {
      const json = await new Promise((resolve, reject) => {
        http.get({ host: '127.0.0.1', port, path: '/json/version' }, res => {
          let data = ''
          res.on('data', d => (data += d))
          res.on('end', () => resolve(JSON.parse(data)))
        }).on('error', reject)
      })
      if (json?.webSocketDebuggerUrl) return json.webSocketDebuggerUrl
    } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  throw new Error(`Unable to get WebSocket debugger URL on port ${port}`)
}

export async function connectCDP(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  let id = 0
  const pending = new Map()
  ws.on('message', raw => {
    const msg = JSON.parse(raw.toString())
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) reject(new Error(msg.error.message))
      else resolve(msg.result)
    }
  })

  // Proactively reject all pending requests on close/error to prevent hangs
  const rejectAll = (err) => {
    for (const [key, waiter] of pending.entries()) {
      waiter.reject(err instanceof Error ? err : new Error(String(err)))
      pending.delete(key)
    }
  }
  ws.on('close', () => rejectAll(new Error('CDP socket closed')))
  ws.on('error', (err) => rejectAll(err || new Error('CDP socket error')))

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const messageId = ++id
      pending.set(messageId, { resolve, reject })
      const payload = { id: messageId, method, params }
      if (sessionId) {
        payload.sessionId = sessionId
      }
      if (ws.readyState !== WebSocket.OPEN) {
        pending.delete(messageId)
        return reject(new Error('CDP socket is not open'))
      }
      ws.send(JSON.stringify(payload))
    })

  return { ws, send }
}

export async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
    server.on('error', reject)
  })
}

// Create and attach to a new page target, returning a session-bound CDP interface
export async function createPageSession(cdp, initialUrl = 'about:blank') {
  const { targetId } = await cdp.send('Target.createTarget', { url: initialUrl })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  return {
    ws: cdp.ws,
    sessionId,
    send: (method, params = {}) => cdp.send(method, params, sessionId)
  }
}


