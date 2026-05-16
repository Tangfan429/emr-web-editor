import type { DocumentSource, ImportedDocument } from '../../types/document'

export interface PreviewDocumentInput {
  id: string
  fileName: string
  xml: string
  warnings: readonly string[]
  source: DocumentSource
  templateId?: string
}

export function toPreviewDocument(document: PreviewDocumentInput | null): ImportedDocument | null {
  if (!document) {
    return null
  }

  return {
    id: document.id,
    fileName: document.fileName,
    xml: document.xml,
    warnings: [...document.warnings],
    renderMode: 'canvas',
  }
}

export function canReplaceCurrentDocument(
  isDirty: boolean,
  confirmDiscard: () => boolean,
) {
  return !isDirty || confirmDiscard()
}
