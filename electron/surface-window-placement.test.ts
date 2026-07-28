// @vitest-environment node
import type { Rectangle } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import {
  placeSurfaceWindow,
  type PlaceableSurfaceWindow,
} from './surface-window-placement.js'

function createWindow(options: {
  bounds?: Rectangle
  minimized?: boolean
  visible?: boolean
  kiosk?: boolean
  fullscreen?: boolean
  rejectFirstBounds?: boolean
} = {}) {
  let bounds = options.bounds ?? { x: 1920, y: 0, width: 1024, height: 600 }
  let kiosk = options.kiosk ?? false
  let fullscreen = options.fullscreen ?? kiosk
  let setBoundsCalls = 0
  const calls: string[] = []
  const window: PlaceableSurfaceWindow = {
    isDestroyed: vi.fn(() => false),
    isMinimized: vi.fn(() => options.minimized ?? false),
    isVisible: vi.fn(() => options.visible ?? true),
    isKiosk: vi.fn(() => kiosk),
    isFullScreen: vi.fn(() => fullscreen),
    getBounds: vi.fn(() => bounds),
    restore: vi.fn(() => calls.push('restore')),
    setKiosk: vi.fn((enabled) => {
      calls.push(`kiosk:${enabled}`)
      kiosk = enabled
      fullscreen = enabled
    }),
    setFullScreen: vi.fn((enabled) => {
      calls.push(`fullscreen:${enabled}`)
      fullscreen = enabled
    }),
    setBounds: vi.fn((nextBounds) => {
      calls.push('bounds')
      setBoundsCalls += 1
      if (!(options.rejectFirstBounds && setBoundsCalls === 1)) bounds = nextBounds
    }),
    show: vi.fn(() => calls.push('show')),
    moveTop: vi.fn(() => calls.push('top')),
    focus: vi.fn(() => calls.push('focus')),
    webContents: {
      invalidate: vi.fn(() => calls.push('invalidate')),
    },
  }
  return { window, calls }
}

describe('surface window placement', () => {
  it('leaves kiosk before crossing displays, then restores kiosk and redraws', async () => {
    const { window, calls } = createWindow({ kiosk: true })
    const target = { x: 0, y: 0, width: 2048, height: 1152 }

    const result = await placeSurfaceWindow(window, target, true, async () => {
      calls.push('settle')
    })

    expect(result).toEqual({ moved: true, boundsMatch: true })
    expect(calls).toEqual([
      'kiosk:false',
      'settle',
      'bounds',
      'settle',
      'kiosk:true',
      'settle',
      'show',
      'top',
      'focus',
      'invalidate',
    ])
  })

  it('restores a minimized hidden window before moving it to non-kiosk mode', async () => {
    const { window, calls } = createWindow({
      minimized: true,
      visible: false,
      kiosk: true,
    })

    await placeSurfaceWindow(
      window,
      { x: 0, y: 0, width: 2048, height: 1152 },
      false,
      async () => {
        calls.push('settle')
      },
    )

    expect(calls).toEqual([
      'restore',
      'kiosk:false',
      'settle',
      'bounds',
      'settle',
      'show',
      'top',
      'focus',
      'invalidate',
    ])
  })

  it('retries and verifies bounds when Windows ignores the first move', async () => {
    const { window } = createWindow({ rejectFirstBounds: true })
    const target = { x: 0, y: 0, width: 2048, height: 1152 }

    const result = await placeSurfaceWindow(window, target, false, async () => {})

    expect(window.setBounds).toHaveBeenCalledTimes(2)
    expect(result.boundsMatch).toBe(true)
  })

  it('does not cycle kiosk when the window is already correctly placed', async () => {
    const target = { x: 0, y: 0, width: 2048, height: 1152 }
    const { window } = createWindow({ bounds: target, kiosk: true })

    await placeSurfaceWindow(window, target, true, async () => {})

    expect(window.setKiosk).not.toHaveBeenCalled()
    expect(window.setBounds).not.toHaveBeenCalled()
    expect(window.show).toHaveBeenCalledOnce()
    expect(window.webContents.invalidate).toHaveBeenCalledOnce()
  })

  it('reapplies bounds after leaving kiosk on the same display', async () => {
    const target = { x: 0, y: 0, width: 2048, height: 1152 }
    const { window, calls } = createWindow({ bounds: target, kiosk: true })

    await placeSurfaceWindow(window, target, false, async () => {
      calls.push('settle')
    })

    expect(calls.slice(0, 4)).toEqual([
      'kiosk:false',
      'settle',
      'bounds',
      'settle',
    ])
    expect(window.setKiosk).toHaveBeenLastCalledWith(false)
  })
})
