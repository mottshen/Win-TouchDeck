import type { Rectangle } from 'electron'

export interface PlaceableSurfaceWindow {
  isDestroyed(): boolean
  isMinimized(): boolean
  isVisible(): boolean
  isKiosk(): boolean
  isFullScreen(): boolean
  getBounds(): Rectangle
  restore(): void
  setKiosk(enabled: boolean): void
  setFullScreen(enabled: boolean): void
  setBounds(bounds: Rectangle, animate?: boolean): void
  show(): void
  moveTop(): void
  focus(): void
  webContents: {
    invalidate(): void
  }
}

export interface SurfacePlacementResult {
  moved: boolean
  boundsMatch: boolean
}

function sameBounds(left: Rectangle, right: Rectangle): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height
}

function yieldToWindowManager(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Moves an existing frameless window without asking Windows to reposition a
 * fullscreen window. Leaving fullscreen first is important: setBounds() can be
 * ignored while DWM still owns the kiosk/fullscreen placement.
 */
export async function placeSurfaceWindow(
  window: PlaceableSurfaceWindow,
  bounds: Rectangle,
  kiosk: boolean,
  settle: () => Promise<void> = yieldToWindowManager,
): Promise<SurfacePlacementResult> {
  if (window.isDestroyed()) return { moved: false, boundsMatch: false }

  if (window.isMinimized()) window.restore()
  if (window.isDestroyed()) return { moved: false, boundsMatch: false }

  const moved = !sameBounds(window.getBounds(), bounds)
  const mustLeaveFullscreen = !kiosk || moved
  let leftFullscreen = false

  if (mustLeaveFullscreen && window.isKiosk()) {
    window.setKiosk(false)
    leftFullscreen = true
  }
  if (mustLeaveFullscreen && window.isFullScreen()) {
    window.setFullScreen(false)
    leftFullscreen = true
  }
  if (leftFullscreen) await settle()
  if (window.isDestroyed()) return { moved, boundsMatch: false }

  // Exiting fullscreen can restore an old pre-fullscreen rectangle, so place
  // again even when the fullscreen bounds originally matched the target.
  if (moved || leftFullscreen) {
    window.setBounds(bounds, false)
    await settle()
    if (window.isDestroyed()) return { moved, boundsMatch: false }

    // A second placement handles the occasional stale DWM placement observed
    // immediately after a fullscreen window crosses displays.
    if (!sameBounds(window.getBounds(), bounds)) {
      window.setBounds(bounds, false)
      await settle()
    }
  }
  if (window.isDestroyed()) return { moved, boundsMatch: false }

  if (kiosk && !window.isKiosk()) {
    window.setKiosk(true)
    await settle()
  }
  if (window.isDestroyed()) return { moved, boundsMatch: false }

  // show() is intentional even when isVisible() is true: a visible Electron
  // window can still be DWM-cloaked after a cross-display fullscreen change.
  window.show()
  window.moveTop()
  window.focus()
  window.webContents.invalidate()

  return { moved, boundsMatch: sameBounds(window.getBounds(), bounds) }
}
