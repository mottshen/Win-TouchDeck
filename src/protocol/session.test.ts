import { describe, expect, it } from 'vitest'
import { SatelliteSession } from './session'

const descriptor = { id: 'surface-1', name: 'Touch Surface', columns: 5, rows: 3, bitmapSize: 144 }

function sentLines(effects: ReturnType<SatelliteSession['receive']>) {
  return effects.filter((effect) => effect.type === 'send').map((effect) => effect.line)
}

describe('SatelliteSession', () => {
  it('negotiates v5 capabilities and registers the surface', () => {
    const session = new SatelliteSession(descriptor)
    expect(sentLines(session.receive('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0'))).toEqual([])
    const [registration] = sentLines(session.receive('CAPS SUBSCRIPTIONS=1 NONSQUARE=1 BITMAP_FORMATS=rgb,png,webp'))
    expect(registration).toContain('ADD-DEVICE')
    expect(registration).toContain('KEYS_TOTAL=15')
    expect(registration).toContain('KEYS_PER_ROW=5')
    expect(registration).toContain('BITMAP_FORMAT=webp')
    session.receive('ADD-DEVICE OK')
    expect(session.snapshot().status).toBe('online')
    expect(session.press(4, true)).toBe('KEY-PRESS DEVICEID=surface-1 KEY=4 PRESSED=true')
    expect(session.changePage(-1)).toContain('DIRECTION=0')
  })

  it('supports legacy API without new arguments', () => {
    const session = new SatelliteSession(descriptor)
    const [registration] = sentLines(session.receive('BEGIN CompanionVersion=3.4.0 ApiVersion=1.7.0'))
    expect(registration).not.toContain('SERIAL=')
    expect(registration).not.toContain('PINCODE_LOCK')
    expect(registration).not.toContain('BITMAP_FORMAT')
  })

  it('applies button, brightness and lock states', () => {
    const session = new SatelliteSession(descriptor)
    session.receive('BEGIN CompanionVersion=5.0.1 ApiVersion=1.12.0')
    session.receive('CAPS BITMAP_FORMATS=rgb,png,webp')
    session.receive('ADD-DEVICE OK')
    session.receive('KEY-STATE DEVICEID=surface-1 KEY=2 TYPE=BUTTON PRESSED=1 COLOR=#ff0000 TEXT=SGVsbG8= LOCATION=1/0/2')
    session.receive('BRIGHTNESS DEVICEID=surface-1 VALUE=42')
    session.receive('LOCKED-STATE DEVICEID=surface-1 LOCKED=true CHARACTER_COUNT=2')
    expect(session.snapshot()).toMatchObject({
      brightness: 42,
      locked: true,
      pinLength: 2,
      buttons: expect.arrayContaining([expect.objectContaining({ index: 2, pressed: true, color: '#ff0000', text: 'Hello' })]),
    })
  })
})
