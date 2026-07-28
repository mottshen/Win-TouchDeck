import type { AppSettings } from './shared-types.js'

export interface SurfaceSettingsWindow {
  isDestroyed(): boolean
  webContents: {
    send(channel: string, settings: AppSettings): void
  }
}

export function setSurfaceToolbarVisibility(
  settings: AppSettings,
  profileId: unknown,
  visible: unknown,
): AppSettings | null {
  if (typeof profileId !== 'string' || typeof visible !== 'boolean') return null
  if (!settings.profiles.some((profile) => profile.id === profileId)) return null
  return {
    ...settings,
    profiles: settings.profiles.map((profile) => profile.id === profileId
      ? { ...profile, showToolbar: visible }
      : profile),
  }
}

export function notifyExistingSurfaceWindows(
  windows: ReadonlyMap<string, SurfaceSettingsWindow>,
  settings: AppSettings,
) {
  for (const window of windows.values()) {
    if (!window.isDestroyed()) window.webContents.send('settings:changed', settings)
  }
}
