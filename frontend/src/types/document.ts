export interface ImportedDocument {
  id: string
  fileName: string
  xml: string
  warnings: readonly string[]
  renderMode: 'canvas'
}
