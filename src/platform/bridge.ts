import { DEFAULT_SETTINGS, normalizeSettings } from '../config/defaults'
import type { AppSettings, DesktopBridge, DisplayInfo, RuntimeInfo } from '../types'

const browserDisplay = (): DisplayInfo => ({
  id: 'browser',
  label: 'Browser Preview',
  width: window.innerWidth,
  height: window.innerHeight,
  scaleFactor: window.devicePixelRatio || 1,
  rotation: 0,
  primary: true,
})

const SETTINGS_KEY = 'win-touchdeck.settings'
const LEGACY_SETTINGS_KEY = 'touchdeck.settings'

function readBrowserSettings(): AppSettings {
  const current = localStorage.getItem(SETTINGS_KEY)
  const legacy = current === null ? localStorage.getItem(LEGACY_SETTINGS_KEY) : null
  const settings = normalizeSettings(JSON.parse(current ?? legacy ?? 'null'))
  if (current === null && legacy !== null) localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return settings
}

function downloadJson(filename: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function importJsonFile(): Promise<AppSettings | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      try { resolve(normalizeSettings(JSON.parse(await file.text()))) } catch { resolve(null) }
    }
    input.click()
  })
}

const browserBridge: DesktopBridge = {
  async getRuntimeInfo(): Promise<RuntimeInfo> {
    return { platform: navigator.platform, version: '0.1.0-web', displayId: 'browser', isElectron: false }
  },
  async getDisplays() {
    return [browserDisplay()]
  },
  async getSettings() {
    try {
      return readBrowserSettings()
    } catch {
      return structuredClone(DEFAULT_SETTINGS)
    }
  },
  async saveSettings(input: AppSettings) {
    const settings = normalizeSettings(input)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return settings
  },
  async exportSettings(input: AppSettings) {
    downloadJson(`Win-TouchDeck-config-${new Date().toISOString().slice(0, 10)}.json`, normalizeSettings(input))
    return { saved: true }
  },
  async importSettings() {
    const imported = await importJsonFile()
    if (imported) localStorage.setItem(SETTINGS_KEY, JSON.stringify(imported))
    return imported
  },
  async exportDiagnostics() {
    downloadJson(`Win-TouchDeck-diagnostics-${Date.now()}.json`, {
      generatedAt: new Date().toISOString(),
      runtime: await this.getRuntimeInfo(),
      display: browserDisplay(),
      settings: await this.getSettings(),
    })
    return { saved: true }
  },
  logSurfaceEvent() {},
  async openAdmin(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  async setKiosk() {},
  async exitKiosk() {},
  onDisplaysChanged() {
    return () => undefined
  },
  onSettingsChanged() {
    return () => undefined
  },
}

export const desktopBridge = window.winTouchDeck ?? browserBridge
