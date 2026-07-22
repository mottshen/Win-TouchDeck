import { useEffect, useMemo } from 'react'
import { PressController } from '../input/press-controller'
import type { ButtonState, SurfaceProfile } from '../types'
import { ButtonTile } from './ButtonTile'

interface SurfaceGridProps {
  profile: SurfaceProfile
  buttons: ButtonState[]
  brightness: number
  onPress(index: number, pressed: boolean): void
}

export function SurfaceGrid({ profile, buttons, brightness, onPress }: SurfaceGridProps) {
  const pressController = useMemo(() => new PressController(onPress), [onPress])
  useEffect(() => {
    const release = () => pressController.releaseAll()
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', release)
    return () => {
      release()
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', release)
    }
  }, [pressController])

  const handlePress = (index: number, pressed: boolean, pointerId: number) => {
    if (pressed) pressController.down(pointerId, index)
    else pressController.up(pointerId)
  }

  return (
    <main
      className="surface-grid"
      aria-label={`${profile.name} button grid`}
      style={{
        gridTemplateColumns: `repeat(${profile.columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${profile.rows}, minmax(0, 1fr))`,
        gap: `${profile.gap}px`,
        filter: `brightness(${Math.max(15, brightness)}%)`,
      }}
    >
      {buttons.map((button) => (
        <ButtonTile key={button.id} button={button} bitmapSize={profile.bitmapSize} onPress={handlePress} />
      ))}
    </main>
  )
}
