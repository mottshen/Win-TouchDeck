import type { SurfaceState } from '../types'
import { SatelliteSession, type SessionEffect, type SurfaceDescriptor } from './session'

export interface SurfaceController {
  connect(): void
  disconnect(): void
  press(index: number, pressed: boolean): void
  changePage(direction: -1 | 1): void
  pinKey(key: number): void
}

export interface ControllerCallbacks {
  onState(state: SurfaceState): void
  onTraffic?(direction: 'in' | 'out', line: string): void
}

type WebSocketLike = Pick<WebSocket, 'readyState' | 'send' | 'close' | 'addEventListener'>
type SocketFactory = (url: string) => WebSocketLike
const SOCKET_OPEN = 1

export class CompanionSurfaceController implements SurfaceController {
  private socket?: WebSocketLike
  private session: SatelliteSession
  private reconnectTimer?: ReturnType<typeof setTimeout>
  private heartbeatTimer?: ReturnType<typeof setInterval>
  private reconnectAttempt = 0
  private stopped = true

  constructor(
    private readonly url: string,
    descriptor: SurfaceDescriptor,
    private readonly callbacks: ControllerCallbacks,
    private readonly socketFactory: SocketFactory = (socketUrl) => new WebSocket(socketUrl),
  ) {
    this.session = new SatelliteSession(descriptor)
  }

  connect(): void {
    if (!this.stopped && (this.socket || this.reconnectTimer)) return
    this.stopped = false
    this.openSocket()
  }

  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.reconnectTimer = undefined
    this.heartbeatTimer = undefined
    const socket = this.socket
    this.socket = undefined
    socket?.close(1000, 'Surface closing')
  }

  press(index: number, pressed: boolean): void {
    this.send(this.session.press(index, pressed))
  }

  changePage(direction: -1 | 1): void {
    this.send(this.session.changePage(direction))
  }

  pinKey(key: number): void {
    this.send(this.session.pinKey(key))
  }

  private openSocket(): void {
    if (this.stopped) return
    this.applyEffects(this.session.connected())
    try {
      const socket = this.socketFactory(this.url)
      this.socket = socket
      socket.addEventListener('open', () => {
        if (this.stopped || this.socket !== socket) {
          socket.close(1000, 'Superseded connection')
          return
        }
        this.reconnectAttempt = 0
        this.heartbeatTimer = setInterval(() => this.send(`PING win-touchdeck-${Date.now()}`), 2000)
      })
      socket.addEventListener('message', (event) => {
        if (this.stopped || this.socket !== socket) return
        const text = typeof event.data === 'string' ? event.data : ''
        text.split(/\r?\n/).forEach((line) => {
          if (!line.trim()) return
          this.callbacks.onTraffic?.('in', line)
          this.applyEffects(this.session.receive(line))
        })
      })
      socket.addEventListener('error', () => {
        if (this.stopped || this.socket !== socket) return
        this.applyEffects(this.session.disconnected('Unable to connect to Companion'))
      })
      socket.addEventListener('close', () => {
        if (this.socket !== socket) return
        this.socket = undefined
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
        this.heartbeatTimer = undefined
        if (this.stopped) return
        this.applyEffects(this.session.disconnected())
        this.scheduleReconnect()
      })
    } catch (error) {
      this.applyEffects(this.session.disconnected(error instanceof Error ? error.message : 'Connection failed'))
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    const delay = Math.min(5000, 350 * 2 ** this.reconnectAttempt)
    this.reconnectAttempt += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.openSocket()
    }, delay)
  }

  private send(line: string | null): void {
    if (!line || !this.socket || this.socket.readyState !== SOCKET_OPEN) return
    this.callbacks.onTraffic?.('out', line)
    this.socket.send(`${line}\n`)
  }

  private applyEffects(effects: SessionEffect[]): void {
    effects.forEach((effect) => {
      if (effect.type === 'send') this.send(effect.line)
      if (effect.type === 'state') this.callbacks.onState(effect.state)
    })
  }
}
