import { describe, expect, it, vi } from 'vitest'
import {
  closeWriterPrintPreview,
  printWriterDocument,
  showWriterPrintPreview,
  type WriterPrintTarget,
} from './writerPrint'

describe('writerPrint', () => {
  it('reports preview mode when no external writer target is available', () => {
    const result = printWriterDocument(null)

    expect(result).toEqual({
      ok: false,
      reason: 'external-renderer-unavailable',
      message: '当前为简易预览，需外部渲染加载成功后才能高保真打印。',
    })
  })

  it('prints all pages through the EMRWriterLite writer API', () => {
    const target: WriterPrintTarget = {
      PrintDocument: vi.fn(() => true),
    }

    const result = printWriterDocument(target)

    expect(target.PrintDocument).toHaveBeenCalledWith({ PrintRange: 'AllPages' })
    expect(result).toEqual({ ok: true })
  })

  it('falls back to legacy Print when PrintDocument is unavailable', () => {
    const target: WriterPrintTarget = {
      Print: vi.fn(() => true),
    }

    expect(printWriterDocument(target)).toEqual({ ok: true })
    expect(target.Print).toHaveBeenCalledWith({ PrintRange: 'AllPages' })
  })

  it('opens and closes print preview through the EMRWriterLite writer API', () => {
    const target: WriterPrintTarget = {
      LoadPrintPreview: vi.fn(() => true),
      ClosePrintPreview: vi.fn(() => true),
    }

    expect(showWriterPrintPreview(target)).toEqual({ ok: true })
    expect(target.LoadPrintPreview).toHaveBeenCalledWith({ PrintRange: 'AllPages' })

    expect(closeWriterPrintPreview(target)).toEqual({ ok: true })
    expect(target.ClosePrintPreview).toHaveBeenCalled()
  })
})
