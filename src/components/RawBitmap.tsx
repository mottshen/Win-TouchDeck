import { useEffect, useRef } from 'react'

interface RawBitmapProps {
  data: string
  size: number
}

export function RawBitmap({ data, size }: RawBitmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const decoded = atob(data)
      const pixelCount = decoded.length / 3
      const edge = Math.round(Math.sqrt(pixelCount)) || size
      if (edge * edge * 3 !== decoded.length) return
      canvas.width = edge
      canvas.height = edge
      const rgba = new Uint8ClampedArray(edge * edge * 4)
      for (let source = 0, target = 0; source < decoded.length; source += 3, target += 4) {
        rgba[target] = decoded.charCodeAt(source)
        rgba[target + 1] = decoded.charCodeAt(source + 1)
        rgba[target + 2] = decoded.charCodeAt(source + 2)
        rgba[target + 3] = 255
      }
      canvas.getContext('2d')?.putImageData(new ImageData(rgba, edge, edge), 0, 0)
    } catch {
      // A malformed frame is ignored; the next Companion state update will repaint it.
    }
  }, [data, size])

  return <canvas ref={canvasRef} className="button-bitmap" aria-hidden="true" />
}
