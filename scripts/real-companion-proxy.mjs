import { WebSocket, WebSocketServer } from 'ws'

const listenPort = Number(process.env.WIN_TOUCHDECK_PROXY_PORT ?? process.env.TOUCHDECK_PROXY_PORT ?? 16624)
const upstreamUrl = process.env.WIN_TOUCHDECK_UPSTREAM_URL ?? process.env.TOUCHDECK_UPSTREAM_URL ?? 'ws://127.0.0.1:16623'
const lifetimeMs = Number(process.env.WIN_TOUCHDECK_PROXY_LIFETIME_MS ?? process.env.TOUCHDECK_PROXY_LIFETIME_MS ?? 180_000)

const redactLine = (line) => line
  .replace(/BITMAP=([^\s]+)/g, (_match, value) => `BITMAP=<${value.length} chars>`)
  .replace(/TEXT=([^\s]+)/g, (_match, value) => `TEXT=<${value.length} chars>`)

const record = (event, detail = {}) => {
  process.stdout.write(`${JSON.stringify({ time: new Date().toISOString(), event, ...detail })}\n`)
}

const recordFrame = (direction, data) => {
  const text = data.toString('utf8')
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) record('frame', { direction, line: redactLine(line) })
  }
}

const server = new WebSocketServer({ host: '127.0.0.1', port: listenPort })

server.on('listening', () => record('ready', { listen: `ws://127.0.0.1:${listenPort}`, upstreamUrl }))
server.on('connection', (downstream) => {
  record('client-connected')
  const upstream = new WebSocket(upstreamUrl)
  const queued = []

  downstream.on('message', (data, isBinary) => {
    recordFrame('client-to-companion', data)
    if (upstream.readyState === WebSocket.OPEN) upstream.send(data, { binary: isBinary })
    else queued.push({ data, isBinary })
  })
  downstream.on('close', (code) => {
    record('client-closed', { code })
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close()
  })
  downstream.on('error', (error) => record('client-error', { message: error.message }))

  upstream.on('open', () => {
    record('upstream-connected')
    for (const item of queued.splice(0)) upstream.send(item.data, { binary: item.isBinary })
  })
  upstream.on('message', (data, isBinary) => {
    recordFrame('companion-to-client', data)
    if (downstream.readyState === WebSocket.OPEN) downstream.send(data, { binary: isBinary })
  })
  upstream.on('close', (code) => {
    record('upstream-closed', { code })
    if (downstream.readyState === WebSocket.OPEN) downstream.close()
  })
  upstream.on('error', (error) => record('upstream-error', { message: error.message }))
})

server.on('error', (error) => {
  record('server-error', { message: error.message })
  process.exitCode = 1
})

setTimeout(() => {
  record('timeout')
  for (const client of server.clients) client.close()
  server.close(() => process.exit())
}, lifetimeMs).unref()
