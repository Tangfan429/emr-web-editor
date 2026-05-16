import { computed, readonly, shallowRef } from 'vue'
import type {
  EditorDocument,
  ImportedDocument,
  SaveState,
  TemplateContent,
  ValidationIssue,
} from '../types/document'

export function useDocumentSession() {
  const document = shallowRef<EditorDocument | null>(null)
  const saveState = shallowRef<SaveState>('idle')
  const lastSavedXml = shallowRef('')
  const validationIssues = shallowRef<ValidationIssue[]>([])
  const error = shallowRef<string | null>(null)
  const isLoading = shallowRef(false)
  const isSaving = shallowRef(false)

  const isDirty = computed(() => saveState.value === 'dirty')

  function loadTemplate(template: TemplateContent) {
    document.value = {
      id: template.id,
      fileName: template.fileName,
      xml: template.xml,
      warnings: [],
      source: 'template',
      templateId: template.id,
    }
    lastSavedXml.value = template.xml
    validationIssues.value = []
    error.value = null
    isLoading.value = false
    isSaving.value = false
    saveState.value = 'saved'
  }

  function loadLocalDocument(imported: ImportedDocument) {
    document.value = {
      id: imported.id,
      fileName: imported.fileName,
      xml: imported.xml,
      warnings: [...imported.warnings],
      source: 'local',
    }
    lastSavedXml.value = imported.xml
    validationIssues.value = []
    error.value = null
    isLoading.value = false
    isSaving.value = false
    saveState.value = 'saved'
  }

  function markDirty() {
    if (document.value) {
      saveState.value = 'dirty'
    }
  }

  function markSaving() {
    isSaving.value = true
    saveState.value = 'saving'
  }

  function markSaved(xml: string) {
    isSaving.value = false
    lastSavedXml.value = xml
    saveState.value = 'saved'
  }

  function markFailed(message: string) {
    isSaving.value = false
    error.value = message
    saveState.value = 'failed'
  }

  function setValidationIssues(issues: ValidationIssue[]) {
    validationIssues.value = issues
  }

  function clearDocument() {
    document.value = null
    lastSavedXml.value = ''
    validationIssues.value = []
    error.value = null
    isSaving.value = false
    isLoading.value = false
    saveState.value = 'idle'
  }

  return {
    document: readonly(document),
    saveState: readonly(saveState),
    lastSavedXml: readonly(lastSavedXml),
    validationIssues: readonly(validationIssues),
    error: readonly(error),
    isLoading: readonly(isLoading),
    isSaving: readonly(isSaving),
    isDirty,
    loadTemplate,
    loadLocalDocument,
    markDirty,
    markSaving,
    markSaved,
    markFailed,
    setValidationIssues,
    clearDocument,
  }
}
