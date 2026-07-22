import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { access, copyFile, mkdir, writeFile } from 'node:fs/promises'
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  powerSaveBlocker,
  screen,
  shell,
} from 'electron'
import type { OpenDialogOptions, SaveDialogOptions } from 'electron'
import { DiagnosticsLogger, redactForDiagnostics } from '../diagnostics.js'
import { SettingsStore } from '../settings-store.js'
import type { AppSettings, DisplayInfo, SurfaceProfile } from '../shared-types.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const smokeTest = process.argv.includes('--smoke-test')
const windows = new Map<string, BrowserWindow>()
let settingsStore: SettingsStore
let diagnostics: DiagnosticsLogger
let currentSettings: AppSettings
let displaySleepBlocker: number | null = null

async function migrateLegacySettings(userDataPath: string): Promise<boolean> {
  const target = path.join(userDataPath, 'settings.json')
  try {
    await access(target)
    return false
  } catch { /* migrate only when the new location has no settings */ }

  const appDataPath = app.getPath('appData')
  for (const legacyDirectoryName of ['TouchDeck', 'touchdeck-console']) {
    const legacyDirectory = path.join(appDataPath, legacyDirectoryName)
    try {
      await mkdir(userDataPath, { recursive: true })
      await copyFile(path.join(legacyDirectory, 'settings.json'), target)
      try {
        await copyFile(path.join(legacyDirectory, 'settings.backup.json'), path.join(userDataPath, 'settings.backup.json'))
      } catch { /* a backup was optional in older versions */ }
      return true
    } catch { /* try the next known legacy location */ }
  }
  return false
}

function listDisplays(): DisplayInfo[] {
  const primaryId = String(screen.getPrimaryDisplay().id)
  return screen.getAllDisplays().map((display) => ({
    id: String(display.id),
    label: display.label || `Display ${display.id}`,
    width: display.bounds.width,
    height: display.bounds.height,
    scaleFactor: display.scaleFactor,
    rotation: display.rotation,
    primary: String(display.id) === primaryId,
  }))
}

function displayForProfile(profile: SurfaceProfile) {
  return screen.getAllDisplays().find((display) => String(display.id) === profile.displayId)
    ?? screen.getPrimaryDisplay()
}

function rendererUrl(profileId: string, displayId: string) {
  const query = `profile=${encodeURIComponent(profileId)}&display=${encodeURIComponent(displayId)}`
  if (!app.isPackaged) return `http://127.0.0.1:5173/?${query}`
  return `${path.join(currentDir, '../../dist/index.html')}?${query}`
}

async function createSurfaceWindow(profile: SurfaceProfile) {
  const display = displayForProfile(profile)
  const displayId = String(display.id)
  const window = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    fullscreen: profile.kiosk,
    kiosk: profile.kiosk,
    show: false,
    backgroundColor: '#090c10',
    autoHideMenuBar: true,
    webPreferences: {
      // Electron sandboxed preloads must be CommonJS. TypeScript emits the
      // `.cts` source as `.cjs`, avoiding the silent ESM preload failure that
      // otherwise makes the renderer fall back to its browser/mock bridge.
      preload: path.join(currentDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  windows.set(profile.id, window)
  window.on('closed', () => windows.delete(profile.id))
  window.once('ready-to-show', () => window.show())
  if (app.isPackaged || smokeTest) await window.loadFile(path.join(currentDir, '../../dist/index.html'), { query: { profile: profile.id, display: displayId } })
  else await window.loadURL(rendererUrl(profile.id, displayId))
}

async function reconcileWindows() {
  const activeProfiles = currentSettings.profiles.filter((profile) => profile.enabled)
  const desiredIds = new Set(activeProfiles.map((profile) => profile.id))
  for (const [id, window] of windows) {
    if (!desiredIds.has(id)) window.close()
  }
  for (const profile of activeProfiles) {
    const existing = windows.get(profile.id)
    if (!existing || existing.isDestroyed()) await createSurfaceWindow(profile)
    else {
      const display = displayForProfile(profile)
      existing.setBounds(display.bounds)
      existing.setKiosk(profile.kiosk)
      existing.webContents.send('settings:changed', currentSettings)
    }
  }
}

function configurePowerAndLogin(settings: AppSettings) {
  if (!smokeTest) app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, args: ['--autostart'] })
  if (settings.preventDisplaySleep && displaySleepBlocker === null) {
    displaySleepBlocker = powerSaveBlocker.start('prevent-display-sleep')
  } else if (!settings.preventDisplaySleep && displaySleepBlocker !== null) {
    powerSaveBlocker.stop(displaySleepBlocker)
    displaySleepBlocker = null
  }
}

function registerIpc() {
  ipcMain.handle('runtime:get-info', (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender)
    const displayId = owner ? String(screen.getDisplayMatching(owner.getBounds()).id) : null
    return { platform: process.platform, version: app.getVersion(), displayId, isElectron: true }
  })
  ipcMain.handle('displays:list', () => listDisplays())
  ipcMain.handle('settings:get', () => currentSettings)
  ipcMain.handle('settings:save', async (_event, input) => {
    currentSettings = await settingsStore.write(input)
    diagnostics.log('info', 'settings.saved', { profiles: currentSettings.profiles.length })
    configurePowerAndLogin(currentSettings)
    await reconcileWindows()
    return currentSettings
  })
  ipcMain.handle('settings:export', async (event, input) => {
    const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const options: SaveDialogOptions = {
      title: 'Export Win-TouchDeck Configuration',
      defaultPath: `Win-TouchDeck-config-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'Win-TouchDeck JSON', extensions: ['json'] }],
    }
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { saved: false }
    await settingsStore.exportTo(result.filePath, input)
    diagnostics.log('info', 'settings.exported', { path: path.basename(result.filePath) })
    return { saved: true, path: result.filePath }
  })
  ipcMain.handle('settings:import', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const options: OpenDialogOptions = {
      title: 'Import Win-TouchDeck Configuration',
      properties: ['openFile'],
      filters: [{ name: 'Win-TouchDeck JSON', extensions: ['json'] }],
    }
    const result = owner ? await dialog.showOpenDialog(owner, options) : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    currentSettings = await settingsStore.importFrom(result.filePaths[0])
    diagnostics.log('info', 'settings.imported', { path: path.basename(result.filePaths[0]), profiles: currentSettings.profiles.length })
    configurePowerAndLogin(currentSettings)
    await reconcileWindows()
    return currentSettings
  })
  ipcMain.handle('diagnostics:export', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const options: SaveDialogOptions = {
      title: 'Export Win-TouchDeck Diagnostics',
      defaultPath: `Win-TouchDeck-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      filters: [{ name: 'Diagnostic JSON', extensions: ['json'] }],
    }
    const result = owner ? await dialog.showSaveDialog(owner, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return { saved: false }
    const payload = {
      generatedAt: new Date().toISOString(),
      app: { version: app.getVersion(), packaged: app.isPackaged },
      system: { platform: process.platform, arch: process.arch, release: process.getSystemVersion() },
      displays: listDisplays(),
      settings: redactForDiagnostics(currentSettings),
      settingsRecovery: { recoveredFromBackup: settingsStore.recoveredFromBackup },
      logs: await diagnostics.recent(),
    }
    await writeFile(result.filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
    diagnostics.log('info', 'diagnostics.exported', { path: path.basename(result.filePath) })
    return { saved: true, path: result.filePath }
  })
  ipcMain.on('diagnostics:surface-event', (_event, input: unknown) => {
    if (!input || typeof input !== 'object') return
    const source = input as Record<string, unknown>
    diagnostics.log(source.status === 'error' ? 'error' : 'info', 'surface.status', {
      profileId: typeof source.profileId === 'string' ? source.profileId.slice(0, 64) : 'unknown',
      status: typeof source.status === 'string' ? source.status.slice(0, 30) : 'unknown',
      companionVersion: typeof source.companionVersion === 'string' ? source.companionVersion.slice(0, 80) : undefined,
      apiVersion: typeof source.apiVersion === 'string' ? source.apiVersion.slice(0, 30) : undefined,
      message: typeof source.message === 'string' ? source.message.slice(0, 500) : undefined,
    })
  })
  ipcMain.handle('admin:open', async (_event, url: string) => {
    if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?(?:\/|$)/i.test(url)) {
      throw new Error('For security, only local Companion administration addresses can be opened')
    }
    await shell.openExternal(url)
  })
  ipcMain.handle('window:set-kiosk', (event, enabled: boolean) => {
    BrowserWindow.fromWebContents(event.sender)?.setKiosk(enabled === true)
  })
  ipcMain.handle('window:exit-kiosk', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    window?.setKiosk(false)
    window?.setFullScreen(false)
  })
}

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => windows.values().next().value?.focus())
  app.whenReady().then(async () => {
    const userDataPath = app.getPath('userData')
    const migratedLegacySettings = await migrateLegacySettings(userDataPath)
    settingsStore = new SettingsStore(userDataPath)
    diagnostics = new DiagnosticsLogger(userDataPath)
    diagnostics.log('info', 'app.starting', { version: app.getVersion(), packaged: app.isPackaged, platform: process.platform, arch: process.arch })
    if (migratedLegacySettings) diagnostics.log('info', 'settings.migrated-from-legacy-product-name')
    currentSettings = await settingsStore.read()
    if (settingsStore.recoveredFromBackup) diagnostics.log('warn', 'settings.recovered-from-backup')
    registerIpc()
    configurePowerAndLogin(currentSettings)
    await reconcileWindows()

    if (smokeTest) {
      const timeout = setTimeout(() => {
        process.stderr.write('SMOKE_TEST_FAILED timeout\n')
        app.exit(1)
      }, 15000)
      setTimeout(async () => {
        try {
          const window = windows.values().next().value as BrowserWindow | undefined
          if (!window) throw new Error('No surface window was created')
          const result = await window.webContents.executeJavaScript(`({
            title: document.title,
            buttons: document.querySelectorAll('.surface-button').length,
            status: document.querySelector('.status-block')?.textContent?.trim(),
            width: window.innerWidth,
            height: window.innerHeight,
            bridge: Boolean(window.winTouchDeck),
            fatal: document.querySelector('.fatal-error')?.textContent ?? null
          })`)
          if (result.fatal || result.buttons < 1 || !result.bridge) throw new Error(JSON.stringify(result))
          clearTimeout(timeout)
          process.stdout.write(`SMOKE_TEST_OK ${JSON.stringify(result)}\n`)
          app.exit(0)
        } catch (error) {
          clearTimeout(timeout)
          process.stderr.write(`SMOKE_TEST_FAILED ${error instanceof Error ? error.message : String(error)}\n`)
          app.exit(1)
        }
      }, 800)
    }

    const notifyDisplays = async () => {
      const displays = listDisplays()
      diagnostics.log('info', 'displays.changed', displays)
      windows.forEach((window) => window.webContents.send('displays:changed', displays))
      await reconcileWindows()
    }
    screen.on('display-added', notifyDisplays)
    screen.on('display-removed', notifyDisplays)
    screen.on('display-metrics-changed', notifyDisplays)
  })
}

process.on('uncaughtExceptionMonitor', (error) => diagnostics?.log('error', 'process.uncaught-exception', { name: error.name, message: error.message, stack: error.stack }))
process.on('unhandledRejection', (reason) => diagnostics?.log('error', 'process.unhandled-rejection', reason))

app.on('window-all-closed', () => app.quit())
