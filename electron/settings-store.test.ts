// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { deleteSurfaceProfile, SettingsStore, sanitizeSettings } from './settings-store.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'win-touchdeck-settings-'))
  temporaryDirectories.push(directory)
  return directory
}

describe('SettingsStore recovery', () => {
  it('keeps an atomic backup and recovers a corrupt primary file', async () => {
    const directory = await temporaryDirectory()
    const store = new SettingsStore(directory)
    const written = await store.write({
      companionUrl: 'ws://127.0.0.1:16623',
      adminUrl: 'http://127.0.0.1:8000',
      profiles: [{ id: 'backup-test', name: 'Backup', columns: 7, rows: 4 }],
    })
    expect(written.profiles[0].columns).toBe(7)
    await writeFile(path.join(directory, 'settings.json'), '{broken json', 'utf8')

    const restarted = new SettingsStore(directory)
    const recovered = await restarted.read()
    expect(restarted.recoveredFromBackup).toBe(true)
    expect(recovered.profiles[0]).toMatchObject({ id: 'backup-test', columns: 7, rows: 4 })
    expect(JSON.parse(await readFile(path.join(directory, 'settings.json'), 'utf8')).profiles[0].id).toBe('backup-test')
  })

  it('sanitizes imported configuration before persistence', () => {
    const settings = sanitizeSettings({
      companionUrl: 'file:///unsafe',
      adminUrl: 'javascript:alert(1)',
      profiles: [{ id: 'unsafe/id', columns: 100, rows: -1 }],
    })
    expect(settings.companionUrl).toBe('mock://local')
    expect(settings.adminUrl).toBe('http://127.0.0.1:8000')
    expect(settings.profiles[0]).toMatchObject({ id: 'unsafe-id', columns: 16, rows: 1 })
  })

  it('persists built-in themes and rejects unknown theme ids', () => {
    expect(sanitizeSettings({ theme: 'paper' }).theme).toBe('paper')
    expect(sanitizeSettings({ theme: 'neon' }).theme).toBe('neon')
    expect(sanitizeSettings({ theme: 'external' }).theme).toBe('dark')
  })

  it('preserves an explicit show-desktop preference and leaves old profiles on automatic defaults', () => {
    expect(sanitizeSettings({
      profiles: [{ id: 'secondary', keepVisibleOnShowDesktop: true }],
    }).profiles[0].keepVisibleOnShowDesktop).toBe(true)
    expect(sanitizeSettings({
      profiles: [{ id: 'primary', keepVisibleOnShowDesktop: false }],
    }).profiles[0].keepVisibleOnShowDesktop).toBe(false)
    expect(sanitizeSettings({
      profiles: [{ id: 'legacy' }],
    }).profiles[0].keepVisibleOnShowDesktop).toBeUndefined()
  })

  it('enables close-to-tray for legacy settings and preserves an explicit opt-out', () => {
    expect(sanitizeSettings({}).closeToTray).toBe(true)
    expect(sanitizeSettings({ closeToTray: true }).closeToTray).toBe(true)
    expect(sanitizeSettings({ closeToTray: false }).closeToTray).toBe(false)
  })

  it('permanently removes a selected surface while protecting the final surface', () => {
    const settings = sanitizeSettings({
      profiles: [
        { id: 'surface-1', name: 'One' },
        { id: 'surface-2', name: 'Two' },
      ],
    })
    const deleted = deleteSurfaceProfile(settings, 'surface-2')
    expect(deleted?.profiles.map((profile) => profile.id)).toEqual(['surface-1'])
    expect(deleteSurfaceProfile(deleted!, 'surface-1')).toBeNull()
    expect(deleteSurfaceProfile(settings, 'missing')).toBeNull()
  })

  it('does not restore a deleted surface from either settings file after restart', async () => {
    const directory = await temporaryDirectory()
    const store = new SettingsStore(directory)
    const settings = await store.write({
      profiles: [
        { id: 'keep-me', name: 'Keep' },
        { id: 'delete-me', name: 'Delete' },
      ],
    })
    await store.write(deleteSurfaceProfile(settings, 'delete-me'))

    const restarted = new SettingsStore(directory)
    expect((await restarted.read()).profiles.map((profile) => profile.id)).toEqual(['keep-me'])
    expect(JSON.parse(await readFile(path.join(directory, 'settings.backup.json'), 'utf8')).profiles).toHaveLength(1)
  })
})
