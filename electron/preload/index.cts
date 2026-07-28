import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('winTouchDeck', {
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:get-info'),
  getDisplays: () => ipcRenderer.invoke('displays:list'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: unknown, activeProfileId?: string) => ipcRenderer.invoke('settings:save', settings, activeProfileId),
  deleteSurface: (profileId: string) => ipcRenderer.invoke('settings:delete-surface', profileId),
  setToolbarVisibility: (profileId: string, visible: boolean) => ipcRenderer.invoke('settings:set-toolbar', profileId, visible),
  exportSettings: (settings: unknown) => ipcRenderer.invoke('settings:export', settings),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  exportDiagnostics: () => ipcRenderer.invoke('diagnostics:export'),
  logSurfaceEvent: (event: unknown) => ipcRenderer.send('diagnostics:surface-event', event),
  openAdmin: (url: string) => ipcRenderer.invoke('admin:open', url),
  setKiosk: (enabled: boolean) => ipcRenderer.invoke('window:set-kiosk', enabled),
  exitKiosk: () => ipcRenderer.invoke('window:exit-kiosk'),
  getMediaState: () => ipcRenderer.invoke('media:get-state'),
  controlMedia: (action: string, value?: number) => ipcRenderer.invoke('media:control', action, value),
  onDisplaysChanged: (callback: (displays: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, displays: unknown[]) => callback(displays)
    ipcRenderer.on('displays:changed', listener)
    return () => ipcRenderer.removeListener('displays:changed', listener)
  },
  onSettingsChanged: (callback: (settings: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: unknown) => callback(settings)
    ipcRenderer.on('settings:changed', listener)
    return () => ipcRenderer.removeListener('settings:changed', listener)
  },
})
