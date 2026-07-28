import type { AppSettings } from './shared-types.js'

export interface ActivatableSurfaceWindow {
  isDestroyed(): boolean
  isMinimized(): boolean
  restore(): void
  show(): void
  moveTop(): void
  focus(): void
  webContents: {
    invalidate(): void
  }
}

export function activateSurfaceWindow(
  windows: ReadonlyMap<string, ActivatableSurfaceWindow>,
  settings: AppSettings,
  profileId: unknown,
) {
  if (typeof profileId !== 'string') return
  const profile = settings.profiles.find((item) => item.id === profileId && item.enabled)
  const target = profile ? windows.get(profile.id) : undefined
  if (!target || target.isDestroyed()) return
  if (target.isMinimized()) target.restore()
  // Calling show even for a nominally visible window removes DWM cloaking
  // left behind by a fullscreen cross-display transition.
  target.show()
  target.moveTop()
  target.focus()
  target.webContents.invalidate()
}
