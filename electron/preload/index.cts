import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('winTouchDeck', {
  getRuntimeInfo: () => ipcRenderer.invoke('runtime:get-info'),
  getDisplays: () => ipcRenderer.invoke('displays:list'),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: unknown) => ipcRenderer.invoke('settings:save', settings),
  exportSettings: (settings: unknown) => ipcRenderer.invoke('settings:export', settings),
  importSettings: () => ipcRenderer.invoke('settings:import'),
  exportDiagnostics: () => ipcRenderer.invoke('diagnostics:export'),
  logSurfaceEvent: (event: unknown) => ipcRenderer.send('diagnostics:surface-event', event),
  openAdmin: (url: string) => ipcRenderer.invoke('admin:open', url),
  setKiosk: (enabled: boolean) => ipcRenderer.invoke('window:set-kiosk', enabled),
  exitKiosk: () => ipcRenderer.invoke('window:exit-kiosk'),
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
