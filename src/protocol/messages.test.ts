import { describe, expect, it } from 'vitest'
import { decodeBase64Text, keyToIndex, parseProtocolLine, quoteProtocolValue } from './messages'

describe('Satellite protocol messages', () => {
  it('parses quoted and plain arguments', () => {
    const message = parseProtocolLine('KEY-STATE DEVICEID=main KEY=2 TEXT="SGVsbG8=" COLOR=#00ff00')
    expect(message).toMatchObject({
      command: 'KEY-STATE',
      args: { DEVICEID: 'main', KEY: '2', TEXT: 'SGVsbG8=', COLOR: '#00ff00' },
    })
  })

  it('preserves spaces and escaped quotes', () => {
    const message = parseProtocolLine('ERROR MESSAGE="Invalid \\"surface\\" name"')
    expect(message?.args.MESSAGE).toBe('Invalid "surface" name')
    expect(quoteProtocolValue('Touch "A"')).toBe('"Touch \\"A\\""')
  })

  it('decodes text and maps row/column keys', () => {
    expect(decodeBase64Text('SGVsbG8=')).toBe('Hello')
    expect(keyToIndex('2/3', 5)).toBe(13)
    expect(keyToIndex('17', 5)).toBe(17)
    expect(keyToIndex('bad', 5)).toBeNull()
  })
})
