import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, suggestGrid } from './defaults'

describe('normalizeSettings', () => {
  it('returns safe defaults for invalid input', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('clamps layout and rejects unsafe protocols', () => {
    const settings = normalizeSettings({
      companionUrl: 'file:///etc/passwd',
      adminUrl: 'javascript:alert(1)',
      profiles: [{ id: '../bad id', name: 'Test', columns: 99, rows: 0, gap: -10, bitmapSize: 9999 }],
    })
    expect(settings.companionUrl).toBe('mock://local')
    expect(settings.adminUrl).toBe('http://127.0.0.1:8000')
    expect(settings.profiles[0]).toMatchObject({ id: '---bad-id', columns: 16, rows: 1, gap: 0, bitmapSize: 512 })
  })

  it('keeps every built-in theme and falls back for unknown values', () => {
    for (const theme of ['dark', 'polar', 'ocean', 'paper', 'neon', 'high-contrast'] as const) {
      expect(normalizeSettings({ theme }).theme).toBe(theme)
    }
    expect(normalizeSettings({ theme: 'downloaded-theme' }).theme).toBe('dark')
  })
})

describe('suggestGrid', () => {
  it('uses logical dimensions and reserves toolbar space', () => {
    expect(suggestGrid({ width: 1920, height: 1080, scaleFactor: 1.5 })).toEqual({ columns: 12, rows: 7 })
  })
})
