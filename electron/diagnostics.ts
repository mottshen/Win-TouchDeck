import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

export interface DiagnosticEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  event: string
  detail?: unknown
}

const MAX_LOG_BYTES = 2 * 1024 * 1024
const MAX_EXPORT_LOG_BYTES = 256 * 1024

export function redactForDiagnostics(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/(wss?:\/\/)[^\s/@]+@/gi, '$1[redacted]@')
      .replace(/([?&](?:token|key|password|secret)=)[^&\s]+/gi, '$1[redacted]')
      .slice(0, 1000)
  }
  if (Array.isArray(value)) return value.slice(0, 100).map(redactForDiagnostics)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, /token|password|secret/i.test(key) ? '[redacted]' : redactForDiagnostics(item)]))
  }
  return value
}

export class DiagnosticsLogger {
  private readonly directory: string
  private readonly logPath: string
  private queue: Promise<void> = Promise.resolve()

  constructor(userDataPath: string) {
    this.directory = path.join(userDataPath, 'logs')
    this.logPath = path.join(this.directory, 'win-touchdeck.jsonl')
  }

  log(level: DiagnosticEntry['level'], event: string, detail?: unknown): void {
    const entry: DiagnosticEntry = { time: new Date().toISOString(), level, event: event.slice(0, 100), detail: redactForDiagnostics(detail) }
    this.queue = this.queue.then(async () => {
      await mkdir(this.directory, { recursive: true })
      await this.rotateIfNeeded()
      await writeFile(this.logPath, `${JSON.stringify(entry)}\n`, { encoding: 'utf8', flag: 'a' })
    }).catch(() => undefined)
  }

  async recent(): Promise<string> {
    await this.queue
    try {
      const content = await readFile(this.logPath, 'utf8')
      return content.slice(-MAX_EXPORT_LOG_BYTES)
    } catch {
      return ''
    }
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      if ((await stat(this.logPath)).size < MAX_LOG_BYTES) return
      await rename(this.logPath, path.join(this.directory, `win-touchdeck-${Date.now()}.jsonl`))
    } catch {
      // The first log write has nothing to rotate.
    }
  }
}
