import type { DocumentSource, SaveDocumentResponse, ValidationIssue } from '../types/document'
import type { WriterSaveResult } from '../utils/writerControlAdapter'
import { validateDocumentXml } from './documentValidationService'

interface SaveAdapter {
  saveXml: () => WriterSaveResult
}

export interface SaveDocumentOptions {
  sessionId: string
  fileName: string
  source: DocumentSource
}

export type BackendSaveResult =
  | { ok: true; response: SaveDocumentResponse; xml: string }
  | { ok: false; reason: 'adapter-failed'; message: string }
  | { ok: false; reason: 'validation-failed'; issues: ValidationIssue[] }
  | { ok: false; reason: 'backend-failed'; message: string }

export async function saveDocumentToBackend(
  adapter: SaveAdapter,
  options: SaveDocumentOptions,
): Promise<BackendSaveResult> {
  const saveResult = adapter.saveXml()
  if (!saveResult.ok) {
    return { ok: false, reason: 'adapter-failed', message: saveResult.message }
  }

  const issues = validateDocumentXml(saveResult.xml)
  if (issues.some(issue => issue.severity === 'error')) {
    return { ok: false, reason: 'validation-failed', issues }
  }

  let response: Response
  try {
    response = await fetch('/api/documents/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: options.sessionId,
        fileName: options.fileName,
        xml: saveResult.xml,
        source: options.source,
        updatedAt: new Date().toISOString(),
      }),
    })
  } catch (error) {
    return {
      ok: false,
      reason: 'backend-failed',
      message: error instanceof Error ? error.message : '文档保存失败。',
    }
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return {
      ok: false,
      reason: 'backend-failed',
      message: readErrorMessage(payload) || '文档保存失败。',
    }
  }

  return { ok: true, response: payload as SaveDocumentResponse, xml: saveResult.xml }
}

export function downloadXml(fileName: string, xml: string) {
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName || 'document.xml'
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

function readErrorMessage(payload: unknown) {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    return String((payload as { message?: unknown }).message || '')
  }

  return ''
}
