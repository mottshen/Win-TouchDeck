import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { MediaControlAction, MediaState } from '../types'

interface MediaBarProps {
  media: MediaState
  onControl(action: MediaControlAction, value?: number): Promise<void>
}

function formatTime(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function TransportIcon({ name }: { name: 'shuffle' | 'previous' | 'play' | 'pause' | 'next' | 'repeat' }) {
  if (name === 'shuffle') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16.6 3.6 3.8 3.8-3.8 3.8-1.4-1.4 1.4-1.4h-1.2c-2.1 0-3.2 1.3-4.6 3.4-1.4 2.2-3.2 4.8-7.2 4.8v-2c2.8 0 4.1-1.7 5.5-3.9 1.5-2.3 3.1-4.3 6.3-4.3h1.2L15.2 5l1.4-1.4ZM3.6 7.4v-2c3.3 0 5.1 1.8 6.4 3.5L8.8 10.6C7.5 8.9 6.3 7.4 3.6 7.4Zm13 5.4 3.8 3.8-3.8 3.8-1.4-1.4 1.4-1.4h-1.2c-2.2 0-3.7-1-4.9-2.3l1.2-1.7c1.1 1.2 2.1 2 3.7 2h1.2l-1.4-1.4 1.4-1.4Z" /></svg>
  if (name === 'previous') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zm3 7 10-7v14z" /></svg>
  if (name === 'next') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM5 5l10 7-10 7z" /></svg>
  if (name === 'repeat') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m17 2.6 4 4-4 4V7.7H7a3 3 0 0 0-3 3v1H2v-1a5 5 0 0 1 5-5h10V2.6Zm3 9.7h2v1a5 5 0 0 1-5 5H7v3.1l-4-4 4-4v2.9h10a3 3 0 0 0 3-3v-1Z" /></svg>
  if (name === 'pause') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zm8 0h4v14h-4z" /></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
}

export function MediaBar({ media, onControl }: MediaBarProps) {
  const [position, setPosition] = useState(media.positionMs)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!dragging) setPosition(media.positionMs)
  }, [dragging, media.positionMs])

  useEffect(() => {
    if (!media.isPlaying || dragging) return
    const timer = window.setInterval(() => {
      setPosition((current) => Math.min(media.durationMs || current + 250, current + 250))
    }, 250)
    return () => window.clearInterval(timer)
  }, [dragging, media.durationMs, media.isPlaying])

  const progress = media.durationMs > 0 ? Math.min(100, position / media.durationMs * 100) : 0
  const send = (action: MediaControlAction, value?: number) => void onControl(action, value)

  return (
    <footer className={`media-bar${media.available ? '' : ' is-idle'}`} aria-label="Spotify media controls">
      <div className="media-identity">
        <div className="media-art" aria-hidden="true">
          {media.artworkDataUrl
            ? <img src={media.artworkDataUrl} alt="" />
            : <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.86.2c-2.36-1.44-5.33-1.77-8.83-.97a.625.625 0 1 1-.28-1.22c3.83-.87 7.13-.5 9.77 1.12.3.18.39.57.2.87Zm1.23-2.74a.78.78 0 0 1-1.08.26c-2.7-1.66-6.82-2.14-10.01-1.17a.781.781 0 1 1-.45-1.5c3.65-1.1 8.18-.57 11.28 1.34.37.22.48.7.26 1.07Zm.1-2.85C14.68 8.9 9.33 8.71 6.24 9.65a.94.94 0 1 1-.55-1.8c3.55-1.08 9.46-.85 13.2 1.37a.94.94 0 0 1-.97 1.61Z" /></svg>}
        </div>
        <div className="media-copy">
          <strong>{media.available ? media.title || 'Unknown track' : 'Open Spotify to connect'}</strong>
          <span>{media.available ? media.artist || media.album || 'Spotify' : 'Windows media session is waiting'}</span>
        </div>
      </div>

      <div className="media-main">
        <div className="media-progress-row">
          <span>{formatTime(position)}</span>
          <input
            type="range"
            min="0"
            max={Math.max(1, media.durationMs)}
            step="1000"
            value={Math.min(position, Math.max(1, media.durationMs))}
            disabled={!media.canSeek || !media.durationMs}
            aria-label="Playback position"
            style={{ '--range-progress': `${progress}%` } as CSSProperties}
            onPointerDown={() => setDragging(true)}
            onChange={(event) => setPosition(Number(event.target.value))}
            onPointerUp={(event) => {
              setDragging(false)
              send('seek', Number(event.currentTarget.value))
            }}
            onKeyUp={(event) => {
              if (event.key.startsWith('Arrow') || event.key === 'Home' || event.key === 'End') send('seek', Number(event.currentTarget.value))
            }}
          />
          <span>{formatTime(media.durationMs)}</span>
        </div>
        <div className="media-transport">
          <button type="button" className={media.isShuffleActive ? 'is-active' : ''} disabled={!media.canShuffle} onClick={() => send('shuffle')} aria-label={media.isShuffleActive ? 'Disable shuffle' : 'Enable shuffle'} title={media.isShuffleActive ? 'Disable shuffle' : 'Enable shuffle'} aria-pressed={media.isShuffleActive}><TransportIcon name="shuffle" /></button>
          <button type="button" disabled={!media.canPrevious} onClick={() => send('previous')} aria-label="Previous track"><TransportIcon name="previous" /></button>
          <button type="button" className="media-play" disabled={!media.canToggle} onClick={() => send('toggle')} aria-label={media.isPlaying ? 'Pause' : 'Play'}><TransportIcon name={media.isPlaying ? 'pause' : 'play'} /></button>
          <button type="button" disabled={!media.canNext} onClick={() => send('next')} aria-label="Next track"><TransportIcon name="next" /></button>
          <button type="button" className={media.repeatMode !== 'none' ? 'is-active' : ''} disabled={!media.canRepeat} onClick={() => send('repeat')} aria-label={`Repeat: ${media.repeatMode}`} title={`Repeat: ${media.repeatMode}`} aria-pressed={media.repeatMode !== 'none'}><TransportIcon name="repeat" />{media.repeatMode === 'track' && <small>1</small>}</button>
        </div>
      </div>

      <div className="media-source">
        <span className={media.available ? 'is-live' : ''} />
        <div><strong>SPOTIFY</strong><small>{media.available ? 'WINDOWS SESSION' : 'STANDBY'}</small></div>
      </div>
    </footer>
  )
}
