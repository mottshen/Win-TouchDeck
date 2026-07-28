import type { ButtonState, SurfaceState } from '../types'
import { decodeBase64Text, keyToIndex, parseProtocolLine, quoteProtocolValue } from './messages'
import { versionAtLeast } from './version'

export interface SurfaceDescriptor {
  id: string
  name: string
  columns: number
  rows: number
  bitmapSize: number
}

export type SessionEffect =
  | { type: 'send'; line: string }
  | { type: 'state'; state: SurfaceState }
  | { type: 'registered' }

const emptyButton = (index: number): ButtonState => ({
  id: String(index),
  index,
  type: 'BUTTON',
  pressed: false,
  color: '#111820',
  textColor: '#f5f7fa',
  text: '',
})

export class SatelliteSession {
  private apiVersion?: string
  private capabilities = new Map<string, string>()
  private registered = false
  private state: SurfaceState

  constructor(private readonly descriptor: SurfaceDescriptor) {
    this.state = {
      status: 'connecting',
      buttons: Array.from({ length: descriptor.columns * descriptor.rows }, (_, index) => emptyButton(index)),
      brightness: 100,
      locked: false,
      pinLength: 0,
    }
  }

  snapshot(): SurfaceState {
    return { ...this.state, buttons: this.state.buttons.map((button) => ({ ...button })) }
  }

  connected(): SessionEffect[] {
    this.registered = false
    this.state = { ...this.state, status: 'connecting', message: undefined }
    return [{ type: 'state', state: this.snapshot() }]
  }

  disconnected(message = 'Connection closed'): SessionEffect[] {
    this.registered = false
    this.state = { ...this.state, status: 'reconnecting', message }
    return [{ type: 'state', state: this.snapshot() }]
  }

  receive(rawLine: string): SessionEffect[] {
    const message = parseProtocolLine(rawLine)
    if (!message) return []

    if (message.command === 'PING') return [{ type: 'send', line: `PONG ${message.payload}` }]
    if (message.command === 'BEGIN') {
      this.apiVersion = message.args.APIVERSION
      this.state = {
        ...this.state,
        companionVersion: message.args.COMPANIONVERSION,
        apiVersion: this.apiVersion,
      }
      if (!versionAtLeast(this.apiVersion, '1.10.0')) return this.registrationEffects()
      return [{ type: 'state', state: this.snapshot() }]
    }
    if (message.command === 'CAPS') {
      Object.entries(message.args).forEach(([key, value]) => {
        this.capabilities.set(key, value)
      })
      return this.registrationEffects()
    }
    if (message.command === 'ADD-DEVICE' && message.payload.startsWith('OK')) {
      this.registered = true
      this.state = { ...this.state, status: 'online', message: undefined }
      return [{ type: 'registered' }, { type: 'state', state: this.snapshot() }]
    }
    if (message.command === 'KEY-STATE') return this.applyButtonState(message.args)
    if (message.command === 'KEYS-CLEAR') {
      this.state = { ...this.state, buttons: this.state.buttons.map((button) => emptyButton(button.index)) }
      return [{ type: 'state', state: this.snapshot() }]
    }
    if (message.command === 'BRIGHTNESS') {
      this.state = { ...this.state, brightness: Math.max(0, Math.min(100, Number(message.args.VALUE) || 0)) }
      return [{ type: 'state', state: this.snapshot() }]
    }
    if (message.command === 'LOCKED-STATE') {
      this.state = {
        ...this.state,
        locked: message.args.LOCKED === '1' || message.args.LOCKED === 'true',
        pinLength: Number(message.args.CHARACTER_COUNT) || 0,
      }
      return [{ type: 'state', state: this.snapshot() }]
    }
    if (message.command === 'ERROR' || message.payload.startsWith('ERROR')) {
      this.state = { ...this.state, status: 'error', message: message.args.MESSAGE ?? message.payload }
      return [{ type: 'state', state: this.snapshot() }]
    }
    return []
  }

  press(index: number, pressed: boolean): string | null {
    if (!this.registered) return null
    return `KEY-PRESS DEVICEID=${this.descriptor.id} KEY=${index} PRESSED=${pressed ? 'true' : 'false'}`
  }

  changePage(direction: -1 | 1): string | null {
    if (!this.registered || !versionAtLeast(this.apiVersion, '1.10.0')) return null
    return `CHANGE-PAGE DEVICEID=${this.descriptor.id} DIRECTION=${direction > 0 ? 1 : 0}`
  }

  pinKey(key: number): string | null {
    if (!this.registered || key < 0 || key > 9) return null
    return `PINCODE-KEY DEVICEID=${this.descriptor.id} KEY=${key}`
  }

  remove(): string | null {
    if (!this.registered) return null
    this.registered = false
    return `REMOVE-DEVICE DEVICEID=${this.descriptor.id}`
  }

  private registrationEffects(): SessionEffect[] {
    const { id, name, columns, rows, bitmapSize } = this.descriptor
    const args = [
      `DEVICEID=${id}`,
      `PRODUCT_NAME=${quoteProtocolValue(name)}`,
      `KEYS_TOTAL=${columns * rows}`,
      `KEYS_PER_ROW=${columns}`,
      `BITMAPS=${bitmapSize}`,
      'COLORS=hex',
      'TEXT=true',
      'TEXT_STYLE=true',
    ]
    if (versionAtLeast(this.apiVersion, '1.8.0')) args.push('PINCODE_LOCK=FULL')
    if (versionAtLeast(this.apiVersion, '1.10.0')) {
      // Preserve the legacy serial namespace so upgrades remain the same Companion device.
      args.push(`SERIAL=${quoteProtocolValue(`touchdeck:${id}`)}`)
      args.push(`CAN_CHANGE_PAGE=${quoteProtocolValue('Allow page changes from the touch surface')}`)
    }
    if (versionAtLeast(this.apiVersion, '1.12.0') && this.capabilities.get('BITMAP_FORMATS')?.split(',').includes('webp')) {
      args.push('BITMAP_FORMAT=webp')
    }
    return [
      { type: 'send', line: `ADD-DEVICE ${args.join(' ')}` },
      { type: 'state', state: this.snapshot() },
    ]
  }

  private applyButtonState(args: Record<string, string>): SessionEffect[] {
    const index = keyToIndex(args.KEY ?? args.CONTROLID, this.descriptor.columns)
    if (index === null || index < 0 || index >= this.state.buttons.length) return []
    const current = this.state.buttons[index]
    const next: ButtonState = {
      ...current,
      type: (args.TYPE as ButtonState['type']) || current.type,
      pressed: args.PRESSED ? args.PRESSED === '1' || args.PRESSED === 'true' : current.pressed,
      bitmap: args.BITMAP ?? current.bitmap,
      color: args.COLOR ?? current.color,
      textColor: args.TEXTCOLOR ?? current.textColor,
      text: args.TEXT ? decodeBase64Text(args.TEXT) : current.text,
      fontSize: args.FONT_SIZE ? Number(args.FONT_SIZE) : current.fontSize,
      location: args.LOCATION ?? current.location,
    }
    const buttons = [...this.state.buttons]
    buttons[index] = next
    this.state = { ...this.state, buttons }
    return [{ type: 'state', state: this.snapshot() }]
  }
}
