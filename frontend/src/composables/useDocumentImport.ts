import { readonly, shallowRef } from 'vue'
import type { ApiErrorResponse, ImportedDocument } from '../types/document'

export function useDocumentImport() {
  const document = shallowRef<ImportedDocument | null>(null)
  const error = shallowRef<string | null>(null)
  const isImporting = shallowRef(false)

  async function importFile(file: File) {
    isImporting.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/documents/import', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as ApiErrorResponse | null
        throw new Error(payload?.message || '导入失败，请检查文件内容。')
      }

      document.value = (await response.json()) as ImportedDocument
    } catch (requestError) {
      document.value = null
      error.value = requestError instanceof Error ? requestError.message : '导入失败。'
    } finally {
      isImporting.value = false
    }
  }

  function clearDocument() {
    document.value = null
    error.value = null
  }

  return {
    document: readonly(document),
    error: readonly(error),
    isImporting: readonly(isImporting),
    importFile,
    clearDocument,
  }
}
