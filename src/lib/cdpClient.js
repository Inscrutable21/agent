'use server'

import { spawn } from 'child_process'
import http from 'http'
import WebSocket from 'ws'

export async function launchChrome({ chromePath, port = 9222 }) {
  const args = [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ]
  const proc = spawn(chromePath, args, { stdio: 'ignore', detached: true })
  await new Promise(r => setTimeout(r, 800))
  return { proc, port }
}

export async function getWebSocketDebuggerUrl(port = 9222) {
  const json = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/json/version' }, res => {
      let data = ''
      res.on('data', d => (data += d))
      res.on('end', () => resolve(JSON.parse(data)))
    }).on('error', reject)
  })
  return json.webSocketDebuggerUrl
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

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id
      pending.set(messageId, { resolve, reject })
      ws.send(JSON.stringify({ id: messageId, method, params }))
    })

  return { ws, send }
}


