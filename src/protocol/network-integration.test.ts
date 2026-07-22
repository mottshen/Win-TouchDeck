// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import WebSocket, { WebSocketServer } from 'ws'
import { CompanionSurfaceController } from './controller'
import type { SurfaceState } from '../types'

const servers: WebSocketServer[] = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

describe('real WebSocket transport', () => {
  it('completes a Companion-style handshake over loopback', async () => {
    const server = new WebSocketServer({ host: '127.0.0.1', port: 0 })
    servers.push(server)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const address = server.address()
    if (typeof address === 'string' || !address) throw new Error('No TCP address')

    const received: string[] = []
    server.on('connection', (socket) => {
      socket.send('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0\nCAPS SUBSCRIPTIONS=1 NONSQUARE=1 BITMAP_FORMATS=rgb,png,webp\n')
      socket.on('message', (buffer) => {
        const lines = buffer.toString().trim().split(/\r?\n/)
        received.push(...lines)
        if (lines.some((line) => line.startsWith('ADD-DEVICE'))) socket.send('ADD-DEVICE OK\n')
      })
    })

    let resolveOnline!: (state: SurfaceState) => void
    const online = new Promise<SurfaceState>((resolve) => { resolveOnline = resolve })
    const controller = new CompanionSurfaceController(
      `ws://127.0.0.1:${address.port}`,
      { id: 'network-test', name: 'Network Test', columns: 4, rows: 2, bitmapSize: 72 },
      { onState: (state) => { if (state.status === 'online') resolveOnline(state) } },
      (url) => new WebSocket(url) as unknown as globalThis.WebSocket,
    )
    controller.connect()
    const state = await Promise.race([
      online,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Handshake timed out')), 3000)),
    ])
    expect(state.apiVersion).toBe('1.12.0')
    expect(received.find((line) => line.startsWith('ADD-DEVICE'))).toContain('BITMAP_FORMAT=webp')

    controller.press(6, true)
    await new Promise((resolve) => setTimeout(resolve, 25))
    expect(received).toContain('KEY-PRESS DEVICEID=network-test KEY=6 PRESSED=true')
    controller.disconnect()
    server.clients.forEach((socket) => socket.terminate())
  })
})
