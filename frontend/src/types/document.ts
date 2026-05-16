export interface ImportedDocument {
  id: string
  fileName: string
  xml: string
  warnings: string[] | readonly string[]
  renderMode: 'canvas'
}

export type DocumentSource = 'template' | 'local' | 'imported' | 'unknown'

export interface EditorDocument {
  id: string
  fileName: string
  xml: string
  warnings: string[]
  source: DocumentSource
  templateId?: string
}

export interface TemplateSummary {
  id: string
  name: string
  fileName: string
  category: string
}

export interface TemplateContent extends TemplateSummary {
  xml: string
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'failed'

export interface SaveDocumentResponse {
  id: string
  fileName: string
  source: string
  savedAt: string
}

export interface ValidationIssue {
  id: string
  fieldId: string
  fieldName: string
  message: string
  severity: 'error' | 'warning'
}

export type EditorCommandId =
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'fontSize'
  | 'fontName'
  | 'foreColor'
  | 'backColor'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'insertInputField'
  | 'insertDateTime'
  | 'insertCheckbox'
  | 'insertRadio'
  | 'insertPageBreak'
  | 'insertPageInfo'
  | 'insertTable'
  | 'deleteTable'
  | 'insertRowUp'
  | 'insertRowDown'
  | 'insertColumnLeft'
  | 'insertColumnRight'
  | 'mergeCell'
  | 'splitCell'
  | 'tableProperties'
  | 'rowProperties'
  | 'cellProperties'

export interface WriterCommandPayload {
  commandName: string
  showUI: boolean
  parameter?: unknown
  executor?: 'dc' | 'legacy'
}
