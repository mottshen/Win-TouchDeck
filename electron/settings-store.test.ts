// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { SettingsStore, sanitizeSettings } from './settings-store.js'

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
})
