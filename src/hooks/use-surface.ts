import { useEffect, useMemo, useState } from 'react'
import type { SurfaceProfile, SurfaceState } from '../types'
import { CompanionSurfaceController, type SurfaceController } from '../protocol/controller'
import { MockSurfaceController } from '../protocol/mock-controller'

const initialState: SurfaceState = {
  status: 'offline',
  buttons: [],
  brightness: 100,
  locked: false,
  pinLength: 0,
}

export function useSurface(url: string, profile: SurfaceProfile) {
  const [state, setState] = useState<SurfaceState>(initialState)
  const controller = useMemo<SurfaceController>(() => {
    const descriptor = {
      id: profile.id,
      name: `Win-TouchDeck - ${profile.name}`,
      columns: profile.columns,
      rows: profile.rows,
      bitmapSize: profile.bitmapSize,
    }
    const callbacks = { onState: setState }
    return url === 'mock://local'
      ? new MockSurfaceController(descriptor, callbacks)
      : new CompanionSurfaceController(url, descriptor, callbacks)
  }, [url, profile.id, profile.name, profile.columns, profile.rows, profile.bitmapSize])

  useEffect(() => {
    controller.connect()
    return () => controller.disconnect()
  }, [controller])

  return { state, controller }
}
