export interface ImportedDocument {
  id: string
  fileName: string
  xml: string
  warnings: readonly string[]
  renderMode: 'canvas'
}

export interface ApiErrorResponse {
  errorCode: string
  message: string
}

export interface RendererStatus {
  renderMode: 'canvas'
  rendererPath: string
  ready: boolean
  missingAssets: readonly string[]
  hasAssetRoot: boolean
  hasBootstrapScript: boolean
  hasControlScripts: boolean
  hasBootResource: boolean
  hasBootResourceText: boolean
  hasBootManifest: boolean
  hasRuntimeScript: boolean
  hasRuntimeWasm: boolean
}
