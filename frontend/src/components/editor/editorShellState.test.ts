import { describe, expect, it, vi } from 'vitest'
import type { EditorDocument } from '../../types/document'
import { canReplaceCurrentDocument, toPreviewDocument } from './editorShellState'

const editorDocument: EditorDocument = {
  id: 'doc-1',
  fileName: 'record.xml',
  xml: '<XTextDocument />',
  warnings: ['本地导入未上传服务器。'],
  source: 'local',
}

describe('editorShellState', () => {
  it('maps the active editor document to the preview document contract', () => {
    expect(toPreviewDocument(editorDocument)).toEqual({
      id: 'doc-1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: ['本地导入未上传服务器。'],
      renderMode: 'canvas',
    })
  })

  it('keeps an empty preview document when no editor document is active', () => {
    expect(toPreviewDocument(null)).toBeNull()
  })

  it('allows replacing a clean document without prompting', () => {
    const confirmDiscard = vi.fn()

    expect(canReplaceCurrentDocument(false, confirmDiscard)).toBe(true)
    expect(confirmDiscard).not.toHaveBeenCalled()
  })

  it('asks before replacing a dirty document', () => {
    const confirmDiscard = vi.fn(() => false)

    expect(canReplaceCurrentDocument(true, confirmDiscard)).toBe(false)
    expect(confirmDiscard).toHaveBeenCalledTimes(1)
  })
})
