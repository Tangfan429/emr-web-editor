<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import CanvasPreview from './CanvasPreview.vue'
import EditorStatusBar from './EditorStatusBar.vue'
import ImportToolbar from './ImportToolbar.vue'
import TemplatePanel from './TemplatePanel.vue'
import ValidationPanel from './ValidationPanel.vue'
import type { ExternalWriterElement } from '../../composables/useCanvasRenderer'
import { useDocumentImport } from '../../composables/useDocumentImport'
import { useDocumentSession } from '../../composables/useDocumentSession'
import { downloadXml, saveDocumentToBackend } from '../../services/documentSaveService'
import { fetchTemplateContent, fetchTemplates } from '../../services/templateService'
import type { EditorCommandId, TemplateSummary, ValidationIssue } from '../../types/document'
import { createWriterControlAdapter } from '../../utils/writerControlAdapter'
import type { WriterPrintResult } from '../../utils/writerPrint'
import { canReplaceCurrentDocument, toPreviewDocument } from './editorShellState'
import { createWriterCommandPayload } from './ribbonCommands'

const importState = useDocumentImport()
const session = useDocumentSession()

const zoom = shallowRef(1)
const rendererMode = shallowRef('preview')
const rendererError = shallowRef<string | null>(null)
const printMessage = shallowRef<string | null>(null)
const writerElement = shallowRef<ExternalWriterElement | null>(null)
const isPrintPreviewing = shallowRef(false)
const activeToolbarTab = shallowRef('start')
const templates = shallowRef<TemplateSummary[]>([])
const templatesError = shallowRef<string | null>(null)
const isLoadingTemplates = shallowRef(false)

const adapter = computed(() => createWriterControlAdapter(writerElement.value))
const previewDocument = computed(() => toPreviewDocument(session.document.value))
const canUseWriter = computed(() => writerElement.value !== null)
const statusRenderMode = computed(() => (rendererMode.value === 'external' ? '外部渲染' : '结构化预览'))
const statusMessage = computed(() => {
  if (importState.isImporting.value) return '正在导入 XML'
  if (importState.error.value) return importState.error.value
  if (session.error.value) return session.error.value
  if (rendererError.value) return rendererError.value
  if (printMessage.value) return printMessage.value
  if (!session.document.value) return '请选择模板或导入 XML'
  return isPrintPreviewing.value ? '已进入打印预览' : '文档已加载'
})
const warningText = computed(() => session.document.value?.warnings.join('；') || '')

onMounted(() => {
  loadTemplates()
})

async function loadTemplates() {
  isLoadingTemplates.value = true
  templatesError.value = null

  try {
    templates.value = await fetchTemplates()
  } catch (error) {
    templatesError.value = error instanceof Error ? error.message : '模板列表加载失败。'
  } finally {
    isLoadingTemplates.value = false
  }
}

function zoomIn() {
  zoom.value = Math.min(2, Math.round((zoom.value + 0.1) * 10) / 10)
}

function zoomOut() {
  zoom.value = Math.max(0.5, Math.round((zoom.value - 0.1) * 10) / 10)
}

function resetZoom() {
  zoom.value = 1
}

async function handleTemplateSelect(id: string) {
  if (!canReplaceCurrentDocument(session.isDirty.value, confirmDiscardChanges)) {
    return
  }

  rendererError.value = null
  printMessage.value = null
  templatesError.value = null

  try {
    const template = await fetchTemplateContent(id)
    session.loadTemplate(template)
  } catch (error) {
    const message = error instanceof Error ? error.message : '模板内容加载失败。'
    templatesError.value = message
    if (session.document.value) {
      session.markFailed(message)
    }
  }
}

async function handleLocalImport(file: File) {
  if (!canReplaceCurrentDocument(session.isDirty.value, confirmDiscardChanges)) {
    return
  }

  rendererError.value = null
  printMessage.value = null
  templatesError.value = null
  await importState.importFile(file)
  if (importState.document.value) {
    session.loadLocalDocument(importState.document.value)
  } else if (importState.error.value) {
    session.markFailed(importState.error.value)
  }
}

function runEditorCommand(commandId: EditorCommandId) {
  const payload = createWriterCommandPayload(commandId)
  if (!payload) {
    return
  }

  const result = adapter.value.executeCommand(payload)
  if (result.ok) {
    session.markDirty()
    return
  }

  session.markFailed(result.message)
}

async function saveToBackend() {
  const document = session.document.value
  if (!document) {
    return
  }

  session.markSaving(document.id)
  const result = await saveDocumentToBackend(adapter.value, {
    sessionId: document.id,
    fileName: document.fileName,
    source: document.source,
  })

  if (result.ok) {
    session.setValidationIssues([])
    session.markSaved(result.xml, document.id)
  } else if (result.reason === 'validation-failed') {
    session.setValidationIssues(result.issues)
    session.markFailed('保存前校验未通过。', document.id)
  } else {
    session.markFailed(result.message, document.id)
  }
}

function downloadCurrentXml() {
  const document = session.document.value
  if (!document) {
    return
  }

  const result = adapter.value.saveXml()
  if (!result.ok) {
    session.markFailed(result.message, document.id)
    return
  }

  downloadXml(document.fileName, result.xml)
}

function printDocument() {
  applyPrintResult(adapter.value.print())
}

function openPrintPreview() {
  const result = adapter.value.openPrintPreview()
  applyPrintResult(result)
  if (result.ok) {
    isPrintPreviewing.value = true
  }
}

function closePrintPreview() {
  const result = adapter.value.closePrintPreview()
  applyPrintResult(result)
  if (result.ok) {
    isPrintPreviewing.value = false
  }
}

function updateWriterElement(element: ExternalWriterElement | null) {
  writerElement.value = element
  isPrintPreviewing.value = false
  printMessage.value = null
}

function applyPrintResult(result: WriterPrintResult) {
  printMessage.value = result.ok ? null : result.message
}

function clear() {
  if (!canReplaceCurrentDocument(session.isDirty.value, confirmDiscardChanges)) {
    return
  }

  session.clearDocument()
  importState.clearDocument()
  writerElement.value = null
  isPrintPreviewing.value = false
  printMessage.value = null
  rendererError.value = null
}

function selectToolbarTab(tabId: string) {
  activeToolbarTab.value = tabId
}

function handleValidationIssue(issue: ValidationIssue) {
  session.markFailed(issue.message)
}

function confirmDiscardChanges() {
  return window.confirm('当前文档有未保存修改，是否继续切换？')
}
</script>

<template>
  <div class="app-shell">
    <ImportToolbar
      :is-importing="importState.isImporting.value"
      :can-print="Boolean(session.document.value)"
      :can-use-writer-print="canUseWriter"
      :can-use-writer-commands="canUseWriter"
      :can-save="Boolean(session.document.value)"
      :is-saving="session.isSaving.value"
      :is-print-previewing="isPrintPreviewing"
      :zoom="zoom"
      :file-name="session.document.value?.fileName"
      :active-tab-id="activeToolbarTab"
      @import-file="handleLocalImport"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @print="printDocument"
      @print-preview="openPrintPreview"
      @close-print-preview="closePrintPreview"
      @clear="clear"
      @select-tab="selectToolbarTab"
      @tab-change="selectToolbarTab"
      @run-command="runEditorCommand"
      @save="saveToBackend"
      @download-xml="downloadCurrentXml"
    />

    <main class="app-shell__body">
      <TemplatePanel
        :templates="templates"
        :selected-template-id="session.document.value?.templateId"
        :is-loading="isLoadingTemplates"
        :error="templatesError"
        @select-template="handleTemplateSelect"
        @import-file="handleLocalImport"
      />

      <section class="app-shell__workspace">
        <div v-if="statusMessage || warningText" class="app-shell__message-row">
          <span class="app-shell__message">{{ statusMessage }}</span>
          <span v-if="warningText" class="app-shell__warning">{{ warningText }}</span>
        </div>

        <CanvasPreview
          :document="previewDocument"
          :zoom="zoom"
          @mode-change="rendererMode = $event"
          @render-error="rendererError = $event"
          @writer-ready="updateWriterElement"
        />

        <ValidationPanel
          :issues="session.validationIssues.value"
          @select-issue="handleValidationIssue"
        />
      </section>
    </main>

    <EditorStatusBar
      :file-name="session.document.value?.fileName"
      :save-state="session.saveState.value"
      :render-mode="statusRenderMode"
      :zoom="zoom"
      :validation-count="session.validationIssues.value.length"
      :is-print-previewing="isPrintPreviewing"
    />
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #eef2f6;
  color: #1f2937;
  font-family: "Microsoft YaHei UI", "Segoe UI", Arial, sans-serif;
}

.app-shell__body {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 230px minmax(0, 1fr);
}

.app-shell__workspace {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.app-shell__message-row {
  display: flex;
  min-width: 0;
  min-height: 30px;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  border-bottom: 1px solid #d7e0e8;
  background: #ffffff;
  font-size: 12px;
}

.app-shell__message,
.app-shell__warning {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-shell__message {
  color: #334155;
}

.app-shell__warning {
  margin-left: auto;
  color: #8a5a00;
}

@media (max-width: 860px) {
  .app-shell__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-shell__body :deep(.template-panel) {
    display: none;
  }
}
</style>
