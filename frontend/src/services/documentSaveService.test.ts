import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ValidationIssue } from '../types/document'
import { downloadXml, saveDocumentToBackend } from './documentSaveService'

const invalidXmlIssue: ValidationIssue = {
  id: 'invalid-xml',
  fieldId: 'document',
  fieldName: 'XML',
  message: '文档 XML 无法解析。',
  severity: 'error',
}

vi.mock('./documentValidationService', () => ({
  validateDocumentXml: vi.fn(),
}))

describe('documentSaveService', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('blocks backend save when validation returns invalid XML issue', async () => {
    const { validateDocumentXml } = await import('./documentValidationService')
    vi.mocked(validateDocumentXml).mockReturnValue([invalidXmlIssue])
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveDocumentToBackend(
        { saveXml: () => ({ ok: true, xml: '<broken>' }) },
        {
          sessionId: 'session-1',
          fileName: 'test.xml',
          source: 'local',
        },
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'validation-failed',
      issues: [invalidXmlIssue],
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts latest XML from adapter to backend and returns response', async () => {
    const { validateDocumentXml } = await import('./documentValidationService')
    vi.mocked(validateDocumentXml).mockReturnValue([])
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-16T08:30:00.000Z'))
    const backendResponse = {
      id: 'saved-1',
      fileName: 'test.xml',
      source: 'local',
      savedAt: '2026-05-16T08:30:01.000Z',
    }
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => backendResponse,
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveDocumentToBackend(
        { saveXml: () => ({ ok: true, xml: '<document />' }) },
        {
          sessionId: 'session-1',
          fileName: 'test.xml',
          source: 'local',
        },
      ),
    ).resolves.toEqual({ ok: true, response: backendResponse })

    expect(fetchMock).toHaveBeenCalledWith('/api/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'session-1',
        fileName: 'test.xml',
        xml: '<document />',
        source: 'local',
        updatedAt: '2026-05-16T08:30:00.000Z',
      }),
    })
  })

  it('returns adapter failure and skips fetch when adapter saveXml fails', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      saveDocumentToBackend(
        {
          saveXml: () => ({
            ok: false,
            reason: 'save-empty',
            message: '编辑器未返回可保存的 XML 内容。',
          }),
        },
        {
          sessionId: 'session-1',
          fileName: 'test.xml',
          source: 'local',
        },
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'adapter-failed',
      message: '编辑器未返回可保存的 XML 内容。',
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns backend failure message when backend responds with message', async () => {
    const { validateDocumentXml } = await import('./documentValidationService')
    vi.mocked(validateDocumentXml).mockReturnValue([])
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ message: '保存被后端拒绝。' }),
      })),
    )

    await expect(
      saveDocumentToBackend(
        { saveXml: () => ({ ok: true, xml: '<document />' }) },
        {
          sessionId: 'session-1',
          fileName: 'test.xml',
          source: 'local',
        },
      ),
    ).resolves.toEqual({
      ok: false,
      reason: 'backend-failed',
      message: '保存被后端拒绝。',
    })
  })

  it('downloads XML through a blob URL', () => {
    const click = vi.fn()
    const anchor = {
      href: '',
      download: '',
      click,
    }
    const createObjectURL = vi.fn(() => 'blob:document')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('document', {
      createElement: vi.fn(() => anchor),
    })
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })

    downloadXml('test.xml', '<document />')

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchor.href).toBe('blob:document')
    expect(anchor.download).toBe('test.xml')
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document')
  })
})
