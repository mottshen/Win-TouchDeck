import { describe, expect, it, vi } from 'vitest'
import { FALLBACK_SETTINGS } from './shared-types.js'
import {
  notifyExistingSurfaceWindows,
  setSurfaceToolbarVisibility,
  type SurfaceSettingsWindow,
} from './surface-toolbar-settings.js'

describe('surface toolbar settings', () => {
  const settings = {
    ...FALLBACK_SETTINGS,
    profiles: [
      { ...FALLBACK_SETTINGS.profiles[0], id: '7-inch', showToolbar: true },
      { ...FALLBACK_SETTINGS.profiles[0], id: '12.25-inch', showToolbar: true },
    ],
  }

  it('changes only the requested surface', () => {
    const updated = setSurfaceToolbarVisibility(settings, '12.25-inch', false)

    expect(updated?.profiles.find((profile) => profile.id === '12.25-inch')?.showToolbar).toBe(false)
    expect(updated?.profiles.find((profile) => profile.id === '7-inch')?.showToolbar).toBe(true)
  })

  it('notifies only windows that already exist and never adds a missing surface', () => {
    const send = vi.fn()
    const twelveInch: SurfaceSettingsWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: { send },
    }
    const windows = new Map<string, SurfaceSettingsWindow>([['12.25-inch', twelveInch]])
    const updated = setSurfaceToolbarVisibility(settings, '12.25-inch', false)

    expect(updated).not.toBeNull()
    notifyExistingSurfaceWindows(windows, updated!)

    expect([...windows.keys()]).toEqual(['12.25-inch'])
    expect(send).toHaveBeenCalledOnce()
    expect(send).toHaveBeenCalledWith('settings:changed', updated)
  })

  it('rejects unknown surfaces and invalid visibility values', () => {
    expect(setSurfaceToolbarVisibility(settings, 'missing', false)).toBeNull()
    expect(setSurfaceToolbarVisibility(settings, '12.25-inch', 'false')).toBeNull()
  })
})
