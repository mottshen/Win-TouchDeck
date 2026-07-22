// @vitest-environment node
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DiagnosticsLogger, redactForDiagnostics } from './diagnostics.js'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

describe('diagnostics privacy', () => {
  it('redacts credentials, tokens and secret fields', () => {
    expect(redactForDiagnostics({
      url: 'wss://user:password@example.test/ws?token=abc123&mode=1',
      apiSecret: 'do-not-export',
    })).toEqual({
      url: 'wss://[redacted]@example.test/ws?token=[redacted]&mode=1',
      apiSecret: '[redacted]',
    })
  })

  it('writes structured JSONL without leaking credentials', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'win-touchdeck-diagnostics-'))
    temporaryDirectories.push(directory)
    const logger = new DiagnosticsLogger(directory)
    logger.log('error', 'surface.status', { url: 'ws://admin:secret@localhost:16623', token: 'secret-token' })
    const recent = await logger.recent()
    expect(recent).toContain('surface.status')
    expect(recent).toContain('[redacted]')
    expect(recent).not.toContain('secret-token')
    expect(() => JSON.parse(recent.trim())).not.toThrow()
  })
})
