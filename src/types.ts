export type ConnectionStatus = 'mock' | 'connecting' | 'online' | 'reconnecting' | 'offline' | 'error'
export type ThemeId = 'dark' | 'polar' | 'ocean' | 'paper' | 'neon' | 'high-contrast'

export interface DisplayInfo {
  id: string
  label: string
  width: number
  height: number
  scaleFactor: number
  rotation: number
  primary: boolean
}

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
  showToolbar: boolean
}

export interface AppSettings {
  schemaVersion: 1
  companionUrl: string
  adminUrl: string
  launchAtLogin: boolean
  preventDisplaySleep: boolean
  theme: ThemeId
  profiles: SurfaceProfile[]
}

export interface RuntimeInfo {
  platform: string
  version: string
  displayId: string | null
  isElectron: boolean
}

export interface DesktopBridge {
  getRuntimeInfo(): Promise<RuntimeInfo>
  getDisplays(): Promise<DisplayInfo[]>
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<AppSettings>
  exportSettings(settings: AppSettings): Promise<{ saved: boolean; path?: string }>
  importSettings(): Promise<AppSettings | null>
  exportDiagnostics(): Promise<{ saved: boolean; path?: string }>
  logSurfaceEvent(event: SurfaceDiagnosticEvent): void
  openAdmin(url: string): Promise<void>
  setKiosk(enabled: boolean): Promise<void>
  exitKiosk(): Promise<void>
  onDisplaysChanged(callback: (displays: DisplayInfo[]) => void): () => void
  onSettingsChanged(callback: (settings: AppSettings) => void): () => void
}

export interface SurfaceDiagnosticEvent {
  profileId: string
  status: ConnectionStatus
  companionVersion?: string
  apiVersion?: string
  message?: string
}

export interface ButtonState {
  id: string
  index: number
  type: 'BUTTON' | 'PAGEUP' | 'PAGEDOWN' | 'PAGENUM'
  pressed: boolean
  bitmap?: string
  color: string
  textColor: string
  text: string
  fontSize?: number
  location?: string
}

export interface SurfaceState {
  status: ConnectionStatus
  companionVersion?: string
  apiVersion?: string
  message?: string
  buttons: ButtonState[]
  brightness: number
  locked: boolean
  pinLength: number
}
