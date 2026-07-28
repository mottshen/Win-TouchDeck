// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  restoreSurfaceAfterShowDesktop,
  shouldKeepVisibleOnShowDesktop,
  type ShowDesktopSurfaceWindow,
} from './show-desktop-retention.js'

function createWindow(options: { minimized?: boolean; visible?: boolean; kiosk?: boolean } = {}) {
  const window: ShowDesktopSurfaceWindow = {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => options.minimized ?? true),
    isVisible: vi.fn(() => options.visible ?? false),
    isKiosk: vi.fn(() => options.kiosk ?? false),
    restore: vi.fn(),
    setBounds: vi.fn(),
    setKiosk: vi.fn(),
    showInactive: vi.fn(),
    moveTop: vi.fn(),
  }
  return window
}

describe('show desktop retention', () => {
  it('defaults to enabled on secondary displays and disabled on the primary display', () => {
    expect(shouldKeepVisibleOnShowDesktop(undefined, false)).toBe(true)
    expect(shouldKeepVisibleOnShowDesktop(undefined, true)).toBe(false)
    expect(shouldKeepVisibleOnShowDesktop(false, false)).toBe(false)
    expect(shouldKeepVisibleOnShowDesktop(true, true)).toBe(true)
  })

  it('restores and raises a minimized surface without focusing it', () => {
    const window = createWindow()
    const bounds = { x: 1920, y: 0, width: 1024, height: 600 }

    expect(restoreSurfaceAfterShowDesktop(window, bounds, true)).toBe(true)
    expect(window.restore).toHaveBeenCalledOnce()
    expect(window.setBounds).toHaveBeenCalledWith(bounds)
    expect(window.setKiosk).toHaveBeenCalledWith(true)
    expect(window.showInactive).toHaveBeenCalledOnce()
    expect(window.moveTop).toHaveBeenCalledOnce()
  })

  it('does not repeat restore, visibility, or kiosk operations when unnecessary', () => {
    const window = createWindow({ minimized: false, visible: true, kiosk: true })

    restoreSurfaceAfterShowDesktop(window, { x: 0, y: 0, width: 800, height: 600 }, true)

    expect(window.restore).not.toHaveBeenCalled()
    expect(window.setKiosk).not.toHaveBeenCalled()
    expect(window.showInactive).not.toHaveBeenCalled()
    expect(window.moveTop).toHaveBeenCalledOnce()
  })
})
