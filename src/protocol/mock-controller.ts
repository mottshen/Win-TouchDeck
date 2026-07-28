import type { ButtonState, SurfaceState } from '../types'
import type { ControllerCallbacks, SurfaceController } from './controller'
import type { SurfaceDescriptor } from './session'

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6']
const LABELS = ['PROGRAM', 'PREVIEW', 'CAM 1', 'CAM 2', 'CAM 3', 'AUTO', 'CUT', 'RECORD', 'STREAM', 'MUTE', 'LOWER 3RD', 'BLACK']

export class MockSurfaceController implements SurfaceController {
  private state: SurfaceState
  private timer?: ReturnType<typeof setInterval>

  constructor(private readonly descriptor: SurfaceDescriptor, private readonly callbacks: ControllerCallbacks) {
    const total = descriptor.columns * descriptor.rows
    this.state = {
      status: 'mock',
      companionVersion: 'Mock 5.0.1',
      apiVersion: '1.12.0',
      brightness: 100,
      locked: false,
      pinLength: 0,
      buttons: Array.from({ length: total }, (_, index): ButtonState => ({
        id: String(index),
        index,
        type: index === total - 2 ? 'PAGEUP' : index === total - 1 ? 'PAGEDOWN' : 'BUTTON',
        pressed: false,
        color: index === 0 ? '#b91c1c' : COLORS[index % COLORS.length],
        textColor: '#ffffff',
        text: index === total - 2 ? '‹ PAGE' : index === total - 1 ? 'PAGE ›' : LABELS[index % LABELS.length],
        fontSize: 16,
      })),
    }
  }

  connect(): void {
    this.emit()
    this.timer = setInterval(() => {
      const index = Math.floor(Math.random() * Math.max(1, this.state.buttons.length - 2))
      const buttons = [...this.state.buttons]
      const button = buttons[index]
      buttons[index] = { ...button, color: button.color === '#155e75' ? COLORS[index % COLORS.length] : '#155e75' }
      this.state = { ...this.state, buttons }
      this.emit()
    }, 4000)
  }

  disconnect(): void {
    if (this.timer) clearInterval(this.timer)
  }

  remove(): void {
    this.disconnect()
  }

  press(index: number, pressed: boolean): void {
    const button = this.state.buttons[index]
    if (!button) return
    const buttons = [...this.state.buttons]
    buttons[index] = { ...button, pressed }
    this.state = { ...this.state, buttons }
    this.emit()
  }

  changePage(direction: -1 | 1): void {
    const buttons = this.state.buttons.map((button, index) => ({
      ...button,
      text: button.type === 'BUTTON' ? `P${direction > 0 ? 2 : 1} - ${LABELS[index % LABELS.length]}` : button.text,
    }))
    this.state = { ...this.state, buttons }
    this.emit()
  }

  pinKey(key: number): void {
    if (key === 0 && this.state.pinLength >= 3) {
      this.state = { ...this.state, locked: false, pinLength: 0 }
    } else {
      this.state = { ...this.state, pinLength: this.state.pinLength + 1 }
    }
    this.emit()
  }

  setLocked(locked: boolean): void {
    this.state = { ...this.state, locked, pinLength: 0 }
    this.emit()
  }

  private emit() {
    this.callbacks.onState({ ...this.state, buttons: this.state.buttons.map((button) => ({ ...button })) })
  }
}
