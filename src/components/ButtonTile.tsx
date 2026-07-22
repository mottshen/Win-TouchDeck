import type { PointerEvent } from 'react'
import type { ButtonState } from '../types'
import { RawBitmap } from './RawBitmap'

interface ButtonTileProps {
  button: ButtonState
  bitmapSize: number
  onPress(index: number, pressed: boolean, pointerId: number): void
}

export function ButtonTile({ button, bitmapSize, onPress }: ButtonTileProps) {
  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onPress(button.index, true, event.pointerId)
  }

  const release = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    onPress(button.index, false, event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const bitmapIsImage = button.bitmap?.startsWith('data:image/')
  return (
    <button
      className={`surface-button ${button.pressed ? 'is-pressed' : ''}`}
      style={{ '--button-color': button.color, '--text-color': button.textColor } as React.CSSProperties}
      type="button"
      aria-label={button.text || `Button ${button.index + 1}`}
      onPointerDown={down}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={(event) => onPress(button.index, false, event.pointerId)}
      onContextMenu={(event) => event.preventDefault()}
    >
      {bitmapIsImage && <img className="button-bitmap" src={button.bitmap} alt="" draggable={false} />}
      {button.bitmap && !bitmapIsImage && <RawBitmap data={button.bitmap} size={bitmapSize} />}
      {!button.bitmap && (
        <span className="button-label" style={{ fontSize: button.fontSize ? `${Math.max(12, button.fontSize)}px` : undefined }}>
          {button.text || `KEY ${button.index + 1}`}
        </span>
      )}
      <span className="button-index">{String(button.index + 1).padStart(2, '0')}</span>
    </button>
  )
}
