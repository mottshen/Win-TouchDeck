import { describe, expect, it } from 'vitest'
import { compareVersions, versionAtLeast } from './version'

describe('protocol version comparison', () => {
  it('compares semver-like protocol versions', () => {
    expect(compareVersions('1.12.0', '1.9.0')).toBe(1)
    expect(compareVersions('1.10', '1.10.0')).toBe(0)
    expect(compareVersions('1.8.9', '1.9.0')).toBe(-1)
    expect(versionAtLeast('1.12.0', '1.12.0')).toBe(true)
  })
})
