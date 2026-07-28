import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export type MediaAction = 'shuffle' | 'previous' | 'toggle' | 'next' | 'repeat' | 'seek'

export interface MediaState {
  available: boolean
  source: string
  title: string
  artist: string
  album: string
  artworkDataUrl: string
  isPlaying: boolean
  isShuffleActive: boolean
  repeatMode: 'none' | 'list' | 'track'
  positionMs: number
  durationMs: number
  canPrevious: boolean
  canToggle: boolean
  canNext: boolean
  canShuffle: boolean
  canRepeat: boolean
  canSeek: boolean
}

const EMPTY_MEDIA: MediaState = {
  available: false,
  source: '',
  title: '',
  artist: '',
  album: '',
  artworkDataUrl: '',
  isPlaying: false,
  isShuffleActive: false,
  repeatMode: 'none',
  positionMs: 0,
  durationMs: 0,
  canPrevious: false,
  canToggle: false,
  canNext: false,
  canShuffle: false,
  canRepeat: false,
  canSeek: false,
}

const bootstrap = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.MediaPlaybackAutoRepeatMode, Windows.Media, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
[Windows.Storage.Streams.RandomAccessStream, Windows.Storage.Streams, ContentType=WindowsRuntime] | Out-Null
function Await-Result($operation, [Type]$resultType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait()
  return $task.Result
}
function Await-ProgressResult($operation, [Type]$resultType, [Type]$progressType) {
  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 2 -and $_.GetParameters().Count -eq 1 } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($resultType, $progressType).Invoke($null, @($operation))
  $task.Wait()
  return $task.Result
}
function Get-SpotifySession {
  $manager = Await-Result ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  return $manager.GetSessions() | Where-Object { $_.SourceAppUserModelId -match 'spotify' } | Select-Object -First 1
}
function Get-ThumbnailDataUrl($thumbnail) {
  if ($null -eq $thumbnail) { return '' }
  try {
    $source = Await-Result ($thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
    if ($null -eq $source) { return '' }
    # PowerShell 5 cannot directly bind the WinRT COM stream to DataReader.
    # Copying through the WinRT static method via reflection produces a projected stream it can consume.
    $memory = [Windows.Storage.Streams.InMemoryRandomAccessStream]::new()
    $copyMethod = [Windows.Storage.Streams.RandomAccessStream].GetMethods() |
      Where-Object { $_.Name -eq 'CopyAsync' -and $_.GetParameters().Count -eq 2 } |
      Select-Object -First 1
    $copyOperation = $copyMethod.Invoke($null, @($source, $memory))
    $null = Await-ProgressResult $copyOperation ([UInt64]) ([UInt64])
    if ($memory.Size -le 0 -or $memory.Size -gt 4194304) { return '' }
    $memory.Seek(0)
    $reader = [Windows.Storage.Streams.DataReader]::new($memory)
    $size = [uint32]$memory.Size
    $null = Await-Result ($reader.LoadAsync($size)) ([UInt32])
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)
    $contentType = [string]$source.ContentType
    if ($contentType -notmatch '^image/') {
      if ($bytes.Length -ge 4 -and $bytes[0] -eq 0x89 -and $bytes[1] -eq 0x50 -and $bytes[2] -eq 0x4E -and $bytes[3] -eq 0x47) {
        $contentType = 'image/png'
      } elseif ($bytes.Length -ge 4 -and $bytes[0] -eq 0x47 -and $bytes[1] -eq 0x49 -and $bytes[2] -eq 0x46 -and $bytes[3] -eq 0x38) {
        $contentType = 'image/gif'
      } elseif ($bytes.Length -ge 12 -and $bytes[0] -eq 0x52 -and $bytes[1] -eq 0x49 -and $bytes[2] -eq 0x46 -and $bytes[3] -eq 0x46 -and $bytes[8] -eq 0x57 -and $bytes[9] -eq 0x45 -and $bytes[10] -eq 0x42 -and $bytes[11] -eq 0x50) {
        $contentType = 'image/webp'
      } else {
        $contentType = 'image/jpeg'
      }
    }
    return "data:$contentType;base64,$([Convert]::ToBase64String($bytes))"
  } catch {
    return ''
  }
}
function Get-State($session) {
  if ($null -eq $session) {
    return [ordered]@{ available=$false; source=''; title=''; artist=''; album=''; artworkDataUrl=''; isPlaying=$false; isShuffleActive=$false; repeatMode='none'; positionMs=0; durationMs=0; canPrevious=$false; canToggle=$false; canNext=$false; canShuffle=$false; canRepeat=$false; canSeek=$false }
  }
  $properties = Await-Result ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $playback = $session.GetPlaybackInfo()
  $timeline = $session.GetTimelineProperties()
  $controls = $playback.Controls
  return [ordered]@{
    available=$true
    source=[string]$session.SourceAppUserModelId
    title=[string]$properties.Title
    artist=[string]$properties.Artist
    album=[string]$properties.AlbumTitle
    artworkDataUrl=Get-ThumbnailDataUrl $properties.Thumbnail
    isPlaying=([string]$playback.PlaybackStatus -eq 'Playing')
    isShuffleActive=($playback.IsShuffleActive -eq $true)
    repeatMode=([string]$playback.AutoRepeatMode).ToLowerInvariant()
    positionMs=[math]::Max(0, [math]::Round($timeline.Position.TotalMilliseconds))
    durationMs=[math]::Max(0, [math]::Round(($timeline.EndTime - $timeline.StartTime).TotalMilliseconds))
    canPrevious=[bool]$controls.IsPreviousEnabled
    canToggle=[bool]$controls.IsPlayPauseToggleEnabled
    canNext=[bool]$controls.IsNextEnabled
    canShuffle=[bool]$controls.IsShuffleEnabled
    canRepeat=[bool]$controls.IsRepeatEnabled
    canSeek=[bool]$controls.IsPlaybackPositionEnabled
  }
}
`

function encodePowerShell(script: string) {
  return Buffer.from(script, 'utf16le').toString('base64')
}

async function runPowerShell(body: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy', 'Bypass',
    '-EncodedCommand', encodePowerShell(`${bootstrap}\n${body}`),
  ], { windowsHide: true, timeout: 6_000, maxBuffer: 8 * 1024 * 1024 })
  return stdout.trim()
}

function safeState(input: unknown): MediaState {
  if (!input || typeof input !== 'object') return EMPTY_MEDIA
  const source = input as Record<string, unknown>
  const text = (key: string) => typeof source[key] === 'string' ? String(source[key]).slice(0, 500) : ''
  const artwork = typeof source.artworkDataUrl === 'string'
    && /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(source.artworkDataUrl)
    && source.artworkDataUrl.length <= 6 * 1024 * 1024
      ? source.artworkDataUrl
      : ''
  const number = (key: string) => Number.isFinite(Number(source[key])) ? Math.max(0, Number(source[key])) : 0
  const repeatMode = source.repeatMode === 'list' || source.repeatMode === 'track' ? source.repeatMode : 'none'
  return {
    available: source.available === true,
    source: text('source'),
    title: text('title'),
    artist: text('artist'),
    album: text('album'),
    artworkDataUrl: artwork,
    isPlaying: source.isPlaying === true,
    isShuffleActive: source.isShuffleActive === true,
    repeatMode,
    positionMs: number('positionMs'),
    durationMs: number('durationMs'),
    canPrevious: source.canPrevious === true,
    canToggle: source.canToggle === true,
    canNext: source.canNext === true,
    canShuffle: source.canShuffle === true,
    canRepeat: source.canRepeat === true,
    canSeek: source.canSeek === true,
  }
}

export class WindowsMediaSession {
  private cached: { at: number; value: MediaState } | null = null
  private pending: Promise<MediaState> | null = null

  async getState(force = false): Promise<MediaState> {
    if (process.platform !== 'win32') return EMPTY_MEDIA
    if (!force && this.cached && Date.now() - this.cached.at < 900) return this.cached.value
    if (this.pending) return this.pending
    this.pending = runPowerShell('$session = Get-SpotifySession\n(Get-State $session) | ConvertTo-Json -Compress')
      .then((output) => safeState(JSON.parse(output)))
      .catch(() => EMPTY_MEDIA)
      .then((value) => {
        this.cached = { at: Date.now(), value }
        return value
      })
      .finally(() => { this.pending = null })
    return this.pending
  }

  async control(action: MediaAction, value?: number): Promise<MediaState> {
    if (process.platform !== 'win32') return EMPTY_MEDIA
    const safeValue = Math.round(Math.max(0, Math.min(24 * 60 * 60 * 1000, Number(value) || 0)))
    const commands: Record<MediaAction, string> = {
      shuffle: '$active = $session.GetPlaybackInfo().IsShuffleActive\n$null = Await-Result ($session.TryChangeShuffleActiveAsync(-not ($active -eq $true))) ([Boolean])',
      previous: '$null = Await-Result ($session.TrySkipPreviousAsync()) ([Boolean])',
      toggle: '$null = Await-Result ($session.TryTogglePlayPauseAsync()) ([Boolean])',
      next: '$null = Await-Result ($session.TrySkipNextAsync()) ([Boolean])',
      repeat: '$current = [string]$session.GetPlaybackInfo().AutoRepeatMode\n$nextMode = if ($current -eq "List") { [Windows.Media.MediaPlaybackAutoRepeatMode]::Track } elseif ($current -eq "Track") { [Windows.Media.MediaPlaybackAutoRepeatMode]::None } else { [Windows.Media.MediaPlaybackAutoRepeatMode]::List }\n$null = Await-Result ($session.TryChangeAutoRepeatModeAsync($nextMode)) ([Boolean])',
      seek: `$null = Await-Result ($session.TryChangePlaybackPositionAsync([Int64]${safeValue * 10_000})) ([Boolean])`,
    }
    await runPowerShell(`$session = Get-SpotifySession\nif ($null -ne $session) { ${commands[action]} }`).catch(() => undefined)
    this.cached = null
    return this.getState(true)
  }
}
