import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { AppSettings } from './shared-types.js'
import { FALLBACK_SETTINGS } from './shared-types.js'

const integer = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback
}

const themeIds = new Set(['dark', 'polar', 'ocean', 'paper', 'neon', 'high-contrast'])

export function sanitizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== 'object') return structuredClone(FALLBACK_SETTINGS)
  const source = input as Partial<AppSettings>
  const profiles = Array.isArray(source.profiles) && source.profiles.length
    ? source.profiles.slice(0, 8).map((profile, index) => ({
        id: typeof profile.id === 'string' && profile.id ? profile.id.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 64) : `surface-${index + 1}`,
        name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 120) : `Touch Surface ${index + 1}`,
        displayId: typeof profile.displayId === 'string' ? profile.displayId : '',
        enabled: profile.enabled !== false,
        columns: integer(profile.columns, 5, 1, 16),
        rows: integer(profile.rows, 3, 1, 16),
        gap: integer(profile.gap, 10, 0, 32),
        bitmapSize: integer(profile.bitmapSize, 144, 48, 512),
        kiosk: profile.kiosk === true,
        showToolbar: profile.showToolbar !== false,
      }))
    : structuredClone(FALLBACK_SETTINGS.profiles)

  const companionUrl = typeof source.companionUrl === 'string' ? source.companionUrl.trim().slice(0, 300) : ''
  const adminUrl = typeof source.adminUrl === 'string' ? source.adminUrl.trim().slice(0, 300) : ''
  return {
    schemaVersion: 1,
    companionUrl: /^(wss?:\/\/|mock:\/\/local$)/.test(companionUrl) ? companionUrl : FALLBACK_SETTINGS.companionUrl,
    adminUrl: /^https?:\/\//.test(adminUrl) ? adminUrl : FALLBACK_SETTINGS.adminUrl,
    launchAtLogin: source.launchAtLogin === true,
    preventDisplaySleep: source.preventDisplaySleep === true,
    theme: typeof source.theme === 'string' && themeIds.has(source.theme)
      ? source.theme as AppSettings['theme']
      : 'dark',
    profiles,
  }
}

export class SettingsStore {
  private readonly filePath: string
  private readonly backupPath: string
  recoveredFromBackup = false

  constructor(userDataPath: string) {
    this.filePath = path.join(userDataPath, 'settings.json')
    this.backupPath = path.join(userDataPath, 'settings.backup.json')
  }

  async read(): Promise<AppSettings> {
    try {
      this.recoveredFromBackup = false
      return sanitizeSettings(JSON.parse(await readFile(this.filePath, 'utf8')))
    } catch {
      try {
        const recovered = sanitizeSettings(JSON.parse(await readFile(this.backupPath, 'utf8')))
        await this.writePrimary(recovered)
        this.recoveredFromBackup = true
        return recovered
      } catch {
        return structuredClone(FALLBACK_SETTINGS)
      }
    }
  }

  async write(input: unknown): Promise<AppSettings> {
    const settings = sanitizeSettings(input)
    await this.writePrimary(settings)
    const backupTemporary = `${this.backupPath}.tmp`
    await writeFile(backupTemporary, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
    await rename(backupTemporary, this.backupPath)
    return settings
  }

  async exportTo(destination: string, input: unknown): Promise<AppSettings> {
    const settings = sanitizeSettings(input)
    await writeFile(destination, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
    return settings
  }

  async importFrom(source: string): Promise<AppSettings> {
    return this.write(JSON.parse(await readFile(source, 'utf8')))
  }

  async readRawFiles(): Promise<{ primary?: string; backup?: string }> {
    const result: { primary?: string; backup?: string } = {}
    try { result.primary = await readFile(this.filePath, 'utf8') } catch { /* absent */ }
    try { result.backup = await readFile(this.backupPath, 'utf8') } catch { /* absent */ }
    return result
  }

  private async writePrimary(settings: AppSettings): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.tmp`
    await writeFile(temporary, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
    await rename(temporary, this.filePath)
  }
}
