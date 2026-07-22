import type { AppSettings, DisplayInfo, SurfaceProfile } from '../types'
import { isThemeId } from './themes'

export const DEFAULT_PROFILE: SurfaceProfile = {
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
}

export const DEFAULT_SETTINGS: AppSettings = {
  schemaVersion: 1,
  companionUrl: 'mock://local',
  adminUrl: 'http://127.0.0.1:8000',
  launchAtLogin: false,
  preventDisplaySleep: false,
  theme: 'dark',
  profiles: [DEFAULT_PROFILE],
}

const clampInteger = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

const safeText = (value: unknown, fallback: string, max = 120) =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback

export function normalizeSettings(input: unknown): AppSettings {
  if (!input || typeof input !== 'object') return structuredClone(DEFAULT_SETTINGS)
  const source = input as Partial<AppSettings>
  const profiles = Array.isArray(source.profiles) && source.profiles.length
    ? source.profiles.slice(0, 8).map((profile, index) => {
        const item = profile as Partial<SurfaceProfile>
        return {
          id: safeText(item.id, `surface-${index + 1}`, 64).replace(/[^a-zA-Z0-9-]/g, '-'),
          name: safeText(item.name, `Touch Surface ${index + 1}`),
          displayId: typeof item.displayId === 'string' ? item.displayId : '',
          enabled: item.enabled !== false,
          columns: clampInteger(item.columns, 5, 1, 16),
          rows: clampInteger(item.rows, 3, 1, 16),
          gap: clampInteger(item.gap, 10, 0, 32),
          bitmapSize: clampInteger(item.bitmapSize, 144, 48, 512),
          kiosk: item.kiosk === true,
          showToolbar: item.showToolbar !== false,
        }
      })
    : [structuredClone(DEFAULT_PROFILE)]

  const companionUrl = safeText(source.companionUrl, DEFAULT_SETTINGS.companionUrl, 300)
  const adminUrl = safeText(source.adminUrl, DEFAULT_SETTINGS.adminUrl, 300)

  return {
    schemaVersion: 1,
    companionUrl: companionUrl.startsWith('ws://') || companionUrl.startsWith('wss://') || companionUrl === 'mock://local'
      ? companionUrl
      : DEFAULT_SETTINGS.companionUrl,
    adminUrl: /^https?:\/\//.test(adminUrl) ? adminUrl : DEFAULT_SETTINGS.adminUrl,
    launchAtLogin: source.launchAtLogin === true,
    preventDisplaySleep: source.preventDisplaySleep === true,
    theme: isThemeId(source.theme) ? source.theme : 'dark',
    profiles,
  }
}

export function selectProfile(settings: AppSettings, displayId: string | null): SurfaceProfile {
  return settings.profiles.find((profile) => profile.enabled && profile.displayId === displayId)
    ?? settings.profiles.find((profile) => profile.enabled)
    ?? settings.profiles[0]
    ?? structuredClone(DEFAULT_PROFILE)
}

export function suggestGrid(display: Pick<DisplayInfo, 'width' | 'height' | 'scaleFactor'>, toolbar = true) {
  const logicalWidth = display.width / Math.max(1, display.scaleFactor)
  const logicalHeight = display.height / Math.max(1, display.scaleFactor) - (toolbar ? 64 : 0)
  const target = 92
  return {
    columns: Math.max(2, Math.min(12, Math.floor(logicalWidth / target))),
    rows: Math.max(2, Math.min(8, Math.floor(logicalHeight / target))),
  }
}
