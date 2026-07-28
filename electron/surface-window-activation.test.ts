import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_SETTINGS } from './shared-types.js'
import { activateSurfaceWindow, type ActivatableSurfaceWindow } from './surface-window-activation.js'

function createWindow(options: { minimized?: boolean; visible?: boolean } = {}) {
  const window: ActivatableSurfaceWindow = {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => options.minimized ?? false),
    restore: vi.fn(),
    show: vi.fn(),
    moveTop: vi.fn(),
    focus: vi.fn(),
    webContents: {
      invalidate: vi.fn(),
    },
  }
  return window
}

describe('surface window activation', () => {
  it('raises only the selected existing window without changing the window map', () => {
    const sevenInch = createWindow()
    const twelveInch = createWindow({ minimized: true, visible: false })
    const windows = new Map<string, ActivatableSurfaceWindow>([
      ['7-inch', sevenInch],
      ['12.25-inch', twelveInch],
    ])
    const settings = {
      ...FALLBACK_SETTINGS,
      profiles: [
        { ...FALLBACK_SETTINGS.profiles[0], id: '7-inch', name: '7-inch' },
        { ...FALLBACK_SETTINGS.profiles[0], id: '12.25-inch', name: '12.25INCH' },
      ],
    }

    activateSurfaceWindow(windows, settings, '12.25-inch')

    expect(windows.size).toBe(2)
    expect(sevenInch.moveTop).not.toHaveBeenCalled()
    expect(sevenInch.focus).not.toHaveBeenCalled()
    expect(twelveInch.restore).toHaveBeenCalledOnce()
    expect(twelveInch.show).toHaveBeenCalledOnce()
    expect(twelveInch.moveTop).toHaveBeenCalledOnce()
    expect(twelveInch.focus).toHaveBeenCalledOnce()
    expect(twelveInch.webContents.invalidate).toHaveBeenCalledOnce()
  })

  it('does not activate a disabled surface', () => {
    const target = createWindow()
    const windows = new Map([['disabled', target]])
    const settings = {
      ...FALLBACK_SETTINGS,
      profiles: [{ ...FALLBACK_SETTINGS.profiles[0], id: 'disabled', enabled: false }],
    }

    activateSurfaceWindow(windows, settings, 'disabled')

    expect(target.moveTop).not.toHaveBeenCalled()
    expect(target.focus).not.toHaveBeenCalled()
  })
})
