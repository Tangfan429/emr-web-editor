import { describe, expect, it } from 'vitest'
import { getCanvasLayerStyle, getSurfaceStyle } from './canvasPreviewLayout'

describe('canvas preview layout styles', () => {
  it('lets the external renderer use its intrinsic page width', () => {
    expect(getSurfaceStyle('external', 1)).toEqual({
      width: 'max-content',
      minWidth: 'max-content',
      minHeight: '1123px',
    })
    expect(getCanvasLayerStyle('external', 1.2)).toEqual({
      zoom: '1.2',
    })
  })

  it('keeps the fallback canvas reserving a scaled A4 layout box', () => {
    expect(getSurfaceStyle('preview', 0.8)).toEqual({
      width: 'min(636px, 100%)',
      minHeight: '899px',
    })
    expect(getCanvasLayerStyle('preview', 0.8)).toEqual({
      transform: 'scale(0.8)',
    })
  })
})
