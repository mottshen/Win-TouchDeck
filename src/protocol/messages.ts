export interface ProtocolMessage {
  command: string
  args: Record<string, string>
  payload: string
  raw: string
}

export function parseProtocolLine(rawLine: string): ProtocolMessage | null {
  const raw = rawLine.trim()
  if (!raw) return null
  const firstSpace = raw.indexOf(' ')
  const command = (firstSpace === -1 ? raw : raw.slice(0, firstSpace)).toUpperCase()
  const payload = firstSpace === -1 ? '' : raw.slice(firstSpace + 1)
  const args: Record<string, string> = {}
  const matcher = /([A-Z0-9_-]+)=("(?:\\.|[^"\\])*"|[^\s]+)/gi
  for (const match of payload.matchAll(matcher)) {
    const value = match[2]
    args[match[1].toUpperCase()] = value.startsWith('"')
      ? value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      : value
  }
  return { command, args, payload, raw }
}

export function quoteProtocolValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function decodeBase64Text(value: string | undefined): string {
  if (!value) return ''
  try {
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return ''
  }
}

export function keyToIndex(key: string | undefined, columns: number): number | null {
  if (!key) return null
  if (/^\d+$/.test(key)) return Number(key)
  const match = /^(\d+)\/(\d+)$/.exec(key)
  if (!match) return null
  return Number(match[1]) * columns + Number(match[2])
}
