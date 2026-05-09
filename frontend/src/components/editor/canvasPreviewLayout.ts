import type { CSSProperties } from 'vue'
import type { RendererMode } from '../../composables/useCanvasRenderer'

const basePageWidth = 795.333
const basePageHeight = 1123.333

export function getSurfaceStyle(mode: RendererMode, zoom: number): CSSProperties {
  const minHeight = `${Math.round(basePageHeight * zoom)}px`
  if (mode === 'external') {
    return {
      width: 'max-content',
      minWidth: 'max-content',
      minHeight,
    }
  }

  return {
    width: `min(${Math.round(basePageWidth * zoom)}px, 100%)`,
    minHeight,
  }
}

export function getCanvasLayerStyle(mode: RendererMode, zoom: number): CSSProperties {
  if (mode === 'external') {
    return {
      zoom: String(zoom),
    } as CSSProperties
  }

  return {
    transform: `scale(${zoom})`,
  }
}
