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

export type WriterEditorCommandId =
  | 'undo'
  | 'redo'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'selectAll'
  | 'bold'
  | 'italic'
  | 'underline'
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

export type AppCommandId =
  | 'importXml'
  | 'save'
  | 'saveAsTemplate'
  | 'downloadXml'
  | 'uploadTemplate'
  | 'batchUploadTemplates'
  | 'cancelUpload'
  | 'historyVersions'
  | 'print'
  | 'printPreview'
  | 'closePrintPreview'
  | 'clearDocument'
  | 'zoomIn'
  | 'zoomOut'
  | 'resetZoom'

export type PlaceholderCommandId =
  | 'fontSize'
  | 'fontName'
  | 'foreColor'
  | 'backColor'
  | 'advancedHistoryVersions'
  | 'templateAudit'
  | 'advancedTemplateAudit'
  | 'dataElementManager'
  | 'dictionaryManager'
  | 'dataSourceManager'
  | 'pageSettings'
  | 'advancedPermissions'
  | 'batchReplace'
  | 'signatureSettings'

export type EditorCommandId = WriterEditorCommandId | AppCommandId | PlaceholderCommandId

export interface WriterCommandPayload {
  commandName: string
  showUI: boolean
  parameter?: unknown
  executor?: 'dc' | 'legacy'
}
