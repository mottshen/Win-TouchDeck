export interface DisplayInfo {
  id: string
  label: string
  width: number
  height: number
  scaleFactor: number
  rotation: number
  primary: boolean
}

export type ThemeId = 'dark' | 'polar' | 'ocean' | 'paper' | 'neon' | 'high-contrast'

export interface SurfaceProfile {
  id: string
  name: string
  displayId: string
  enabled: boolean
  columns: number
  rows: number
  gap: number
  bitmapSize: number
  kiosk: boolean
  keepVisibleOnShowDesktop?: boolean
  showToolbar: boolean
  showMediaBar: boolean
}

export interface AppSettings {
  schemaVersion: 1
  companionUrl: string
  adminUrl: string
  launchAtLogin: boolean
  closeToTray: boolean
  preventDisplaySleep: boolean
  theme: ThemeId
  profiles: SurfaceProfile[]
}

export const FALLBACK_SETTINGS: AppSettings = {
  schemaVersion: 1,
  companionUrl: 'mock://local',
  adminUrl: 'http://127.0.0.1:8000',
  launchAtLogin: false,
  closeToTray: true,
  preventDisplaySleep: false,
  theme: 'dark',
  profiles: [{
    id: 'main-surface',
    name: 'Main Touch Surface',
    displayId: '',
    enabled: true,
    columns: 5,
    rows: 3,
    gap: 10,
    bitmapSize: 144,
    kiosk: false,
    showToolbar: true,
    showMediaBar: true,
  }],
}
