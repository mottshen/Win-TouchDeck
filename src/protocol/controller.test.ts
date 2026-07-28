import { describe, expect, it, vi } from 'vitest'
import { CompanionSurfaceController } from './controller'
import type { SurfaceState } from '../types'

class FakeSocket extends EventTarget {
  readyState: number = WebSocket.CONNECTING
  sent: string[] = []

  open() {
    this.readyState = WebSocket.OPEN
    this.dispatchEvent(new Event('open'))
  }

  message(data: string) {
    this.dispatchEvent(new MessageEvent('message', { data }))
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.dispatchEvent(new CloseEvent('close'))
  }
}

class DeferredCloseSocket extends FakeSocket {
  close() {
    this.readyState = WebSocket.CLOSED
  }

  emitClose() {
    this.dispatchEvent(new CloseEvent('close'))
  }
}

describe('CompanionSurfaceController integration', () => {
  it('connects transport, negotiates, registers and sends touch events', () => {
    vi.useFakeTimers()
    const socket = new FakeSocket()
    const states: SurfaceState[] = []
    const controller = new CompanionSurfaceController(
      'ws://127.0.0.1:16623',
      { id: 'test', name: 'Test', columns: 3, rows: 2, bitmapSize: 72 },
      { onState: (state) => states.push(state) },
      () => socket as unknown as WebSocket,
    )

    controller.connect()
    socket.open()
    socket.message('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0\nCAPS BITMAP_FORMATS=rgb,png,webp\n')
    expect(socket.sent.some((line) => line.includes('ADD-DEVICE') && line.includes('KEYS_TOTAL=6'))).toBe(true)
    socket.message('ADD-DEVICE OK\n')
    controller.press(4, true)
    controller.press(4, false)
    expect(states.at(-1)?.status).toBe('online')
    expect(socket.sent).toContain('KEY-PRESS DEVICEID=test KEY=4 PRESSED=true\n')
    expect(socket.sent).toContain('KEY-PRESS DEVICEID=test KEY=4 PRESSED=false\n')
    controller.remove()
    expect(socket.sent).toContain('REMOVE-DEVICE DEVICEID=test\n')
    controller.disconnect()
    vi.useRealTimers()
  })

  it('ignores a delayed close from a superseded StrictMode connection', () => {
    vi.useFakeTimers()
    const first = new DeferredCloseSocket()
    const second = new DeferredCloseSocket()
    const sockets = [first, second]
    const states: SurfaceState[] = []
    const controller = new CompanionSurfaceController(
      'ws://127.0.0.1:16623',
      { id: 'test', name: 'Test', columns: 3, rows: 2, bitmapSize: 72 },
      { onState: (state) => states.push(state) },
      () => sockets.shift() as unknown as WebSocket,
    )

    controller.connect()
    controller.disconnect()
    controller.connect()
    second.open()
    second.message('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0\nCAPS BITMAP_FORMATS=webp\nADD-DEVICE OK\n')
    expect(states.at(-1)?.status).toBe('online')

    first.emitClose()
    vi.advanceTimersByTime(10_000)

    expect(states.at(-1)?.status).toBe('online')
    expect(sockets).toHaveLength(0)
    expect(second.sent.some((line) => line.startsWith('PING win-touchdeck-'))).toBe(true)

    controller.disconnect()
    vi.useRealTimers()
  })

  it('reconnects when Companion rejects an overlapping device registration', () => {
    vi.useFakeTimers()
    const first = new FakeSocket()
    const second = new FakeSocket()
    const sockets = [first, second]
    const states: SurfaceState[] = []
    const controller = new CompanionSurfaceController(
      'ws://127.0.0.1:16623',
      { id: 'test', name: 'Test', columns: 3, rows: 2, bitmapSize: 72 },
      { onState: (state) => states.push(state) },
      () => sockets.shift() as unknown as WebSocket,
    )

    controller.connect()
    first.open()
    first.message('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0\nCAPS BITMAP_FORMATS=webp\n')
    first.message('ERROR MESSAGE="Device exists elsewhere"\n')

    expect(first.readyState).toBe(WebSocket.CLOSED)
    expect(states.at(-1)).toMatchObject({
      status: 'reconnecting',
      message: 'Waiting for the previous surface connection to close',
    })

    vi.advanceTimersByTime(350)
    second.open()
    second.message('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0\nCAPS BITMAP_FORMATS=webp\nADD-DEVICE OK\n')

    expect(states.at(-1)?.status).toBe('online')
    expect(sockets).toHaveLength(0)

    controller.disconnect()
    vi.useRealTimers()
  })
})
