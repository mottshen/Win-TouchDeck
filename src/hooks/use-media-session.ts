import { useCallback, useEffect, useRef, useState } from 'react'
import { desktopBridge } from '../platform/bridge'
import type { MediaControlAction, MediaState } from '../types'

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

export function useMediaSession(enabled: boolean) {
  const [state, setState] = useState<MediaState>(EMPTY_MEDIA)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const next = await desktopBridge.getMediaState()
      if (mounted.current) setState(next)
    } catch {
      if (mounted.current) setState(EMPTY_MEDIA)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!enabled) return () => { mounted.current = false }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 1500)
    return () => {
      mounted.current = false
      window.clearInterval(timer)
    }
  }, [enabled, refresh])

  const control = useCallback(async (action: MediaControlAction, value?: number) => {
    const next = await desktopBridge.controlMedia(action, value)
    if (mounted.current) setState(next)
  }, [])

  return { state, control }
}
