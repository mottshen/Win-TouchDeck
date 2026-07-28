import type { Rectangle } from 'electron'

export interface ShowDesktopSurfaceWindow {
  isDestroyed(): boolean
  isMinimized(): boolean
  isVisible(): boolean
  isKiosk(): boolean
  restore(): void
  setBounds(bounds: Rectangle): void
  setKiosk(enabled: boolean): void
  showInactive(): void
  moveTop(): void
}

export function shouldKeepVisibleOnShowDesktop(
  preference: boolean | undefined,
  isPrimaryDisplay: boolean,
): boolean {
  return preference ?? !isPrimaryDisplay
}

export function restoreSurfaceAfterShowDesktop(
  window: ShowDesktopSurfaceWindow,
  bounds: Rectangle,
  kiosk: boolean,
): boolean {
  if (window.isDestroyed()) return false
  if (window.isMinimized()) window.restore()
  if (window.isDestroyed()) return false

  window.setBounds(bounds)
  if (kiosk && !window.isKiosk()) window.setKiosk(true)
  if (!window.isVisible()) window.showInactive()
  window.moveTop()
  return true
}
