<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import EditorStatusBar from './EditorStatusBar.vue'
import PropertyInspectorPanel from './PropertyInspectorPanel.vue'
import TemplateTreePanel from './TemplateTreePanel.vue'
import WorkbenchAssistPanel from './WorkbenchAssistPanel.vue'
import WorkbenchDialog from './WorkbenchDialog.vue'
import WorkbenchEditorArea from './WorkbenchEditorArea.vue'
import WorkbenchTopMenu from './WorkbenchTopMenu.vue'
import type { ExternalWriterElement } from '../../composables/useCanvasRenderer'
import { useDocumentImport } from '../../composables/useDocumentImport'
import { useElementInspector } from '../../composables/useElementInspector'
import { useDocumentSession } from '../../composables/useDocumentSession'
import { useWorkbenchDialog } from '../../composables/useWorkbenchDialog'
import { downloadXml, saveDocumentToBackend } from '../../services/documentSaveService'
import {
  bindMetadataToInputField,
  createDefaultElementProperties,
  toInputFieldWriterOptions,
} from '../../services/elementPropertyService'
import { refreshFragmentTemplateTree } from '../../services/fragmentTemplateService'
import { refreshMetadataTree } from '../../services/metadataService'
import {
  batchUploadTemplates,
  beginTemplateUpload,
  cancelTemplateUpload,
  closeTemplateTab,
  completeTemplateUpload,
  createTemplateDirectory,
  createTemplateFile,
  deleteTemplateDirectory,
  deleteTemplateFile,
  fetchTemplateWorkbenchData,
  markTemplateDirty,
  openTemplateContent,
  renameTemplateDirectory,
  renameTemplateFile,
  requestTemplateUpload,
  saveTemplateAsContent,
  saveTemplateContent,
  type TemplateTreeNode,
  type TemplateWorkbenchData,
} from '../../services/templateWorkbenchService'
import type { EditorCommandId, ValidationIssue, WriterCommandPayload } from '../../types/document'
import type { EditorElementProperties, FragmentTemplateTreeNode, MetadataTreeNode } from '../../types/editorElement'
import { insertCodeElement as insertWriterCodeElement, insertFragmentTemplate } from '../../utils/writerElementAdapter'
import { createWriterControlAdapter } from '../../utils/writerControlAdapter'
import type { WriterPrintResult } from '../../utils/writerPrint'
import { createWriterCommandPayload, findCommandDefinition } from './commandRegistry'
import { toPreviewDocument } from './editorShellState'

const importState = useDocumentImport()
const session = useDocumentSession()
const dialog = useWorkbenchDialog()

const zoom = shallowRef(1)
const rendererMode = shallowRef('preview')
const rendererError = shallowRef<string | null>(null)
const printMessage = shallowRef<string | null>(null)
const commandMessage = shallowRef<string | null>(null)
const writerElement = shallowRef<ExternalWriterElement | null>(null)
const isPrintPreviewing = shallowRef(false)
const templatesError = shallowRef<string | null>(null)
const isLoadingWorkbench = shallowRef(false)
const workbenchData = shallowRef<TemplateWorkbenchData | null>(null)
const workbenchError = shallowRef<string | null>(null)
const selectedTreeNodeId = shallowRef<string | undefined>()
const showHistoryVersions = shallowRef(false)
const selectedMetadataId = shallowRef<string | undefined>()
const selectedFragmentId = shallowRef<string | undefined>()
let disposeContentChanged: (() => void) | null = null

const adapter = computed(() => createWriterControlAdapter(writerElement.value))
const elementInspector = useElementInspector({ writerTarget: writerElement })
const previewDocument = computed(() => toPreviewDocument(session.document.value))
const canUseWriter = computed(() => writerElement.value !== null)
const canSaveFromWriter = computed(() => Boolean(session.document.value) && canUseWriter.value)
const canUseTemplateCommands = computed(() => Boolean(currentTemplateId.value))
const statusRenderMode = computed(() => (rendererMode.value === 'external' ? '外部渲染' : '结构化预览'))
const workbenchTree = computed(() => workbenchData.value?.templateTree || [])
const workbenchCategories = computed(() => workbenchData.value?.categories || ['全部分类'])
const metadataTree = computed(() => workbenchData.value?.metadataTree || [])
const fragmentTemplateTree = computed(() => workbenchData.value?.fragmentTemplateTree || [])
const templateProperties = computed(() => workbenchData.value?.templateProperties || null)
const elementProperties = computed<EditorElementProperties>(() => ({
  ...elementInspector.selectedElement.value,
  options: elementInspector.selectedElement.value.options
    ? [...elementInspector.selectedElement.value.options]
    : undefined,
}))
const historyVersions = computed(() => workbenchData.value?.historyVersions || [])
const openTabs = computed(() => workbenchData.value?.openTabs || [])
const activeTemplateId = computed(() => workbenchData.value?.activeTemplateId)
const currentTemplateId = computed(() => session.document.value?.templateId || activeTemplateId.value)
const statusMessage = computed(() => {
  if (importState.isImporting.value) return '正在导入 XML'
  if (importState.error.value) return importState.error.value
  if (session.error.value) return session.error.value
  if (rendererError.value) return rendererError.value
  if (commandMessage.value) return commandMessage.value
  if (printMessage.value) return printMessage.value
  if (!session.document.value) return '请选择模板或导入 XML'
  if (templateProperties.value?.isDirty) return '当前模板有未保存修改'
  return isPrintPreviewing.value ? '已进入打印预览' : '文档已加载'
})
const warningText = computed(() => session.document.value?.warnings.join('；') || '')

onMounted(() => {
  loadWorkbenchData()
})

async function loadWorkbenchData() {
  isLoadingWorkbench.value = true
  workbenchError.value = null

  try {
    workbenchData.value = await fetchTemplateWorkbenchData(currentTemplateId.value)
  } catch (error) {
    workbenchError.value = error instanceof Error ? error.message : '工作台数据加载失败。'
  } finally {
    isLoadingWorkbench.value = false
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

async function handleTemplateSelect(id: string, treeNodeId?: string) {
  if (!(await canReplaceCurrentDocumentAsync(session.isDirty.value))) {
    return
  }

  rendererError.value = null
  printMessage.value = null
  commandMessage.value = null
  templatesError.value = null

  try {
    const template = await openTemplateContent(id)
    session.loadTemplate(template)
    selectedTreeNodeId.value = treeNodeId
    showHistoryVersions.value = false
    await refreshWorkbenchData(id)
  } catch (error) {
    const message = error instanceof Error ? error.message : '模板内容加载失败。'
    templatesError.value = message
    if (session.document.value) {
      session.markFailed(message)
    }
  }
}

async function handleTemplateTreeSelect(node: TemplateTreeNode) {
  if (!node.templateId) {
    return
  }

  await handleTemplateSelect(node.templateId, node.id)
}

async function handleLocalImport(file: File) {
  if (!(await canReplaceCurrentDocumentAsync(session.isDirty.value))) {
    return
  }

  rendererError.value = null
  printMessage.value = null
  commandMessage.value = null
  templatesError.value = null
  await importState.importFile(file)
  if (importState.document.value) {
    session.loadLocalDocument(importState.document.value)
    selectedTreeNodeId.value = undefined
    await refreshWorkbenchData()
  } else if (importState.error.value) {
    session.markFailed(importState.error.value)
  }
}

function handleWorkbenchCommand(commandId: EditorCommandId) {
  const definition = findCommandDefinition(commandId)
  if (!definition || definition.kind === 'placeholder') {
    return
  }

  if (definition.kind === 'app') {
    void runAppCommand(commandId)
    return
  }

  runEditorCommand(commandId)
}

async function runAppCommand(commandId: EditorCommandId) {
  if (commandId === 'save') {
    void saveToBackend()
  } else if (commandId === 'saveAsTemplate') {
    await saveAsTemplate()
  } else if (commandId === 'downloadXml') {
    downloadCurrentXml()
  } else if (commandId === 'uploadTemplate') {
    uploadCurrentTemplate()
  } else if (commandId === 'batchUploadTemplates') {
    batchUploadOpenTemplates()
  } else if (commandId === 'cancelUpload') {
    cancelCurrentUpload()
  } else if (commandId === 'historyVersions') {
    showHistoryVersions.value = !showHistoryVersions.value
  } else if (commandId === 'print') {
    printDocument()
  } else if (commandId === 'printPreview') {
    openPrintPreview()
  } else if (commandId === 'closePrintPreview') {
    closePrintPreview()
  } else if (commandId === 'clearDocument') {
    clear()
  } else if (commandId === 'zoomIn') {
    zoomIn()
  } else if (commandId === 'zoomOut') {
    zoomOut()
  } else if (commandId === 'resetZoom') {
    resetZoom()
  } else if (commandId === 'insertBarcode') {
    insertCodeElement('barcode')
  } else if (commandId === 'insertQrcode') {
    insertCodeElement('qrcode')
  } else if (commandId === 'insertHeaderFooter') {
    useHeaderFooterMock('已创建页眉页脚配置占位，等待 WriterControl 页眉页脚命令接入。')
  } else if (commandId === 'saveAsHeaderFooter') {
    useHeaderFooterMock('已保存为页眉页脚 mock 状态，第四阶段可接页眉页脚库接口。')
  }
}

function runEditorCommand(commandId: EditorCommandId) {
  const payload = createWriterCommandPayload(commandId)
  if (!payload) {
    return
  }

  const result = adapter.value.executeCommand(payload)
  if (result.ok) {
    commandMessage.value = null
    session.markDirty()
    if (currentTemplateId.value) {
      markTemplateDirty(currentTemplateId.value)
      void refreshWorkbenchData(currentTemplateId.value)
    }
    return
  }

  commandMessage.value = result.message
}

function executeWriterPayload(payload: WriterCommandPayload) {
  const result = adapter.value.executeCommand(payload)
  if (result.ok) {
    commandMessage.value = null
    session.markDirty()
    if (currentTemplateId.value) {
      markTemplateDirty(currentTemplateId.value)
      void refreshWorkbenchData(currentTemplateId.value)
    }
    return true
  }

  commandMessage.value = result.message
  return false
}

async function saveToBackend() {
  const document = session.document.value
  if (!document) {
    return
  }

  commandMessage.value = null
  session.markSaving(document.id)
  const result = await saveDocumentToBackend(adapter.value, {
    sessionId: document.id,
    fileName: document.fileName,
    source: document.source,
  })

  if (result.ok) {
    session.setValidationIssues([])
    commandMessage.value = null
    session.markSaved(result.xml, document.id)
    if (document.templateId) {
      saveTemplateContent(document.templateId, result.xml, document.fileName)
      await refreshWorkbenchData(document.templateId)
    }
  } else if (result.reason === 'validation-failed') {
    session.setValidationIssues(result.issues)
    session.markFailed('保存前校验未通过。', document.id)
  } else if (result.reason === 'backend-failed' && document.templateId) {
    session.setValidationIssues([])
    session.markSaved(result.xml, document.id)
    saveTemplateContent(document.templateId, result.xml, document.fileName)
    commandMessage.value = `真实保存接口暂不可用：${result.message} 已保存到当前工作台 mock 模板。`
    await refreshWorkbenchData(document.templateId)
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
  if (document.templateId) {
    saveTemplateContent(document.templateId, result.xml, document.fileName)
    void refreshWorkbenchData(document.templateId)
  }
  commandMessage.value = null
}

async function saveAsTemplate() {
  const document = session.document.value
  if (!document) {
    return
  }

  const result = adapter.value.saveXml()
  if (!result.ok) {
    session.markFailed(result.message, document.id)
    return
  }

  const name = await dialog.requestText({
    title: '另存为模板',
    message: '请输入另存为模板名称',
    defaultValue: `${document.fileName.replace(/\.xml$/i, '')}-另存`,
    confirmText: '另存为',
    required: true,
  })
  if (!name) {
    return
  }

  const sourceId = document.templateId || currentTemplateId.value
  if (!sourceId) {
    const created = createTemplateFile('hospital-root', name, result.xml)
    session.loadTemplate({
      id: created.id,
      name: created.name,
      fileName: created.fileName,
      category: created.category,
      xml: created.xml,
    })
    void refreshWorkbenchData(created.id)
    return
  }

  const copied = saveTemplateAsContent(sourceId, name, result.xml)
  session.loadTemplate({
    id: copied.id,
    name: copied.name,
    fileName: copied.fileName,
    category: copied.category,
    xml: copied.xml,
  })
  selectedTreeNodeId.value = copied.id
  void refreshWorkbenchData(copied.id)
}

function uploadCurrentTemplate() {
  const templateId = currentTemplateId.value
  if (!templateId) {
    return
  }

  requestTemplateUpload(templateId)
  void refreshWorkbenchData(templateId)
  window.setTimeout(() => {
    beginTemplateUpload(templateId)
    void refreshWorkbenchData(templateId)
  }, 150)
  window.setTimeout(() => {
    completeTemplateUpload(templateId)
    void refreshWorkbenchData(templateId)
  }, 600)
}

function batchUploadOpenTemplates() {
  const ids = openTabs.value.map(tab => tab.id)
  if (ids.length === 0) {
    return
  }

  batchUploadTemplates(ids)
  void refreshWorkbenchData(currentTemplateId.value)
  window.setTimeout(() => {
    ids.forEach(completeTemplateUpload)
    void refreshWorkbenchData(currentTemplateId.value)
  }, 600)
}

function cancelCurrentUpload() {
  const templateId = currentTemplateId.value
  if (!templateId) {
    return
  }
  cancelTemplateUpload(templateId)
  void refreshWorkbenchData(templateId)
}

function printDocument() {
  commandMessage.value = null
  applyPrintResult(adapter.value.print())
}

function openPrintPreview() {
  commandMessage.value = null
  const result = adapter.value.openPrintPreview()
  applyPrintResult(result)
  if (result.ok) {
    isPrintPreviewing.value = true
  }
}

function closePrintPreview() {
  commandMessage.value = null
  const result = adapter.value.closePrintPreview()
  applyPrintResult(result)
  if (result.ok) {
    isPrintPreviewing.value = false
  }
}

function updateWriterElement(element: ExternalWriterElement | null) {
  disposeContentChanged?.()
  disposeContentChanged = null
  writerElement.value = element
  isPrintPreviewing.value = false
  printMessage.value = null
  commandMessage.value = null
  if (element) {
    elementInspector.refreshFromWriter()
    disposeContentChanged = createWriterControlAdapter(element).onContentChanged(() => {
      session.markDirty()
      if (currentTemplateId.value) {
        markTemplateDirty(currentTemplateId.value)
        void refreshWorkbenchData(currentTemplateId.value)
      }
    })
  }
}

async function refreshMetadataPanel() {
  await refreshMetadataTree()
  await refreshWorkbenchData(currentTemplateId.value)
  commandMessage.value = '元数据已刷新。'
}

async function refreshFragmentPanel() {
  await refreshFragmentTemplateTree()
  await refreshWorkbenchData(currentTemplateId.value)
  commandMessage.value = '片段模板已刷新。'
}

function selectMetadata(node: MetadataTreeNode) {
  selectedMetadataId.value = node.id
  if (node.kind === 'item') {
    elementInspector.setStatus({
      ok: false,
      status: 'unsupported',
      reason: 'unsupported',
      message: `已选择数据元：${node.label}。可绑定到当前输入域或插入为输入域。`,
    })
  }
}

function bindMetadata(node: MetadataTreeNode) {
  selectedMetadataId.value = node.id
  elementInspector.bindMetadata(node)
  commandMessage.value = elementInspector.updateStatus.value.message
}

function insertMetadataAsInputField(node: MetadataTreeNode) {
  selectedMetadataId.value = node.id
  const inputField = bindMetadataToInputField(createDefaultElementProperties('input-field'), node)
  elementInspector.replaceElement(inputField, {
    ok: false,
    status: 'unsupported',
    reason: 'unsupported',
    message: `已准备将数据元“${node.label}”插入为输入域。`,
  })
  const inserted = executeWriterPayload({
    commandName: 'InsertInputField',
    showUI: false,
    parameter: toInputFieldWriterOptions(inputField),
    executor: 'dc',
  })
  if (inserted) {
    elementInspector.setStatus({
      ok: true,
      status: 'success',
      message: `已将数据元“${node.label}”插入为输入域。`,
    })
  }
}

function selectFragment(node: FragmentTemplateTreeNode) {
  selectedFragmentId.value = node.id
  if (node.kind === 'item') {
    commandMessage.value = `已选择片段模板：${node.label}。`
  }
}

function insertFragment(node: FragmentTemplateTreeNode) {
  selectedFragmentId.value = node.id
  if (node.kind !== 'item' || !node.xml) {
    return
  }

  const result = insertFragmentTemplate(writerElement.value, node.xml)
  elementInspector.setStatus(result)
  commandMessage.value = result.message
  if (result.ok) {
    session.markDirty()
  }
}

function selectElementType(type: EditorElementProperties['type']) {
  elementInspector.selectElementType(type)
}

function updateElementProperties(patch: Partial<EditorElementProperties>) {
  elementInspector.updateProperties(patch)
  commandMessage.value = elementInspector.updateStatus.value.message
}

function insertCodeElement(type: 'barcode' | 'qrcode') {
  const element = createDefaultElementProperties(type)
  const result = insertWriterCodeElement(writerElement.value, type, element)
  elementInspector.replaceElement(element, result)
  commandMessage.value = result.message
  if (result.ok) {
    session.markDirty()
  }
}

function useHeaderFooterMock(message: string) {
  elementInspector.replaceElement(createDefaultElementProperties('header-footer'), {
    ok: false,
    status: 'unsupported',
    reason: 'unsupported',
    message,
  })
  commandMessage.value = message
}

function applyPrintResult(result: WriterPrintResult) {
  printMessage.value = result.ok ? null : result.message
}

function clear() {
  void clearDocument()
}

async function clearDocument() {
  if (!(await canReplaceCurrentDocumentAsync(session.isDirty.value))) {
    return
  }

  session.clearDocument()
  importState.clearDocument()
  writerElement.value = null
  selectedTreeNodeId.value = undefined
  showHistoryVersions.value = false
  isPrintPreviewing.value = false
  printMessage.value = null
  commandMessage.value = null
  rendererError.value = null
}

async function createDirectory(parentId: string) {
  const name = await dialog.requestText({
    title: '新建目录',
    message: '请输入目录名称',
    defaultValue: '新建目录',
    confirmText: '创建',
    required: true,
  })
  if (!name) {
    return
  }
  createTemplateDirectory(parentId, name)
  await refreshWorkbenchData(currentTemplateId.value)
}

async function createTemplate(parentId: string) {
  const name = await dialog.requestText({
    title: '新建模板',
    message: '请输入模板名称',
    defaultValue: '新建模板',
    confirmText: '创建',
    required: true,
  })
  if (!name) {
    return
  }
  const template = createTemplateFile(parentId, name)
  session.loadTemplate({
    id: template.id,
    name: template.name,
    fileName: template.fileName,
    category: template.category,
    xml: template.xml,
  })
  selectedTreeNodeId.value = template.id
  await refreshWorkbenchData(template.id)
}

async function renameTreeNode(node: TemplateTreeNode) {
  const name = await dialog.requestText({
    title: '重命名',
    message: `请输入“${node.label}”的新名称`,
    defaultValue: node.label,
    confirmText: '重命名',
    required: true,
  })
  if (!name) {
    return
  }

  if (node.kind === 'template') {
    const template = renameTemplateFile(node.id, name)
    if (session.document.value?.templateId === template.id) {
      session.loadTemplate({
        id: template.id,
        name: template.name,
        fileName: template.fileName,
        category: template.category,
        xml: template.xml,
      })
      session.markDirty()
    }
  } else {
    renameTemplateDirectory(node.id, name)
  }

  await refreshWorkbenchData(currentTemplateId.value)
}

async function deleteTreeNode(node: TemplateTreeNode) {
  const confirmed = await dialog.requestConfirm({
    title: '删除确认',
    message: `确认删除“${node.label}”？`,
    confirmText: '删除',
    tone: 'danger',
  })
  if (!confirmed) {
    return
  }

  if (node.kind === 'template') {
    const wasActive = session.document.value?.templateId === node.id
    deleteTemplateFile(node.id)
    if (wasActive) {
      session.clearDocument()
      writerElement.value = null
    }
  } else {
    deleteTemplateDirectory(node.id)
    if (node.id === selectedTreeNodeId.value) {
      selectedTreeNodeId.value = undefined
    }
  }

  await refreshWorkbenchData(currentTemplateId.value)
}

async function selectOpenTab(templateId: string) {
  await handleTemplateSelect(templateId, templateId)
}

async function closeOpenTab(templateId: string) {
  const nextId = closeTemplateTab(templateId)
  if (session.document.value?.templateId === templateId) {
    if (nextId) {
      await handleTemplateSelect(nextId, nextId)
    } else {
      session.clearDocument()
      writerElement.value = null
    }
  }
  await refreshWorkbenchData(nextId || undefined)
}

async function refreshWorkbenchData(activeId?: string) {
  workbenchData.value = await fetchTemplateWorkbenchData(activeId)
}

function handleValidationIssue(issue: ValidationIssue) {
  session.markFailed(`暂时无法自动定位字段“${issue.fieldName}”：${issue.message}`)
}

async function canReplaceCurrentDocumentAsync(isDirty: boolean) {
  if (!isDirty) {
    return true
  }

  return dialog.requestConfirm({
    title: '未保存修改',
    message: '当前文档有未保存修改，是否继续切换？',
    confirmText: '继续',
    tone: 'danger',
  })
}
</script>

<template>
  <div class="app-shell">
    <WorkbenchTopMenu
      :file-name="session.document.value?.fileName"
      :is-importing="importState.isImporting.value"
      :can-save="canSaveFromWriter"
      :can-print="Boolean(session.document.value)"
      :can-upload="canUseTemplateCommands"
      :can-use-writer-print="canUseWriter"
      :can-use-writer-commands="canUseWriter"
      :is-saving="session.isSaving.value"
      :is-print-previewing="isPrintPreviewing"
      @import-file="handleLocalImport"
      @command="handleWorkbenchCommand"
    />

    <main class="app-shell__body">
      <TemplateTreePanel
        :nodes="workbenchTree"
        :categories="workbenchCategories"
        :selected-node-id="selectedTreeNodeId"
        :is-loading="isLoadingWorkbench"
        :error="workbenchError || templatesError"
        @select-template="handleTemplateTreeSelect"
        @create-directory="createDirectory"
        @create-template="createTemplate"
        @rename-node="renameTreeNode"
        @delete-node="deleteTreeNode"
      />

      <section class="app-shell__middle">
        <WorkbenchAssistPanel
          :metadata-tree="metadataTree"
          :fragment-template-tree="fragmentTemplateTree"
          :selected-metadata-id="selectedMetadataId"
          :selected-fragment-id="selectedFragmentId"
          @refresh-metadata="refreshMetadataPanel"
          @refresh-fragments="refreshFragmentPanel"
          @select-metadata="selectMetadata"
          @bind-metadata="bindMetadata"
          @insert-metadata="insertMetadataAsInputField"
          @select-fragment="selectFragment"
          @insert-fragment="insertFragment"
        />
        <WorkbenchEditorArea
          :document="previewDocument"
          :file-name="session.document.value?.fileName"
          :status-message="statusMessage"
          :warning-text="warningText"
          :zoom="zoom"
          :validation-issues="session.validationIssues.value"
          :open-tabs="openTabs"
          :active-template-id="activeTemplateId"
          @mode-change="rendererMode = $event"
          @render-error="rendererError = $event"
          @writer-ready="updateWriterElement"
          @select-issue="handleValidationIssue"
          @select-tab="selectOpenTab"
          @close-tab="closeOpenTab"
        />
      </section>

      <PropertyInspectorPanel
        :template-properties="templateProperties"
        :element-properties="elementProperties"
        :element-status="elementInspector.updateStatus.value"
        :history-versions="historyVersions"
        :show-history="showHistoryVersions"
        @toggle-history="showHistoryVersions = !showHistoryVersions"
        @refresh-element="elementInspector.refreshFromWriter"
        @select-element-type="selectElementType"
        @update-element="updateElementProperties"
      />
    </main>

    <EditorStatusBar
      :file-name="session.document.value?.fileName"
      :save-state="session.saveState.value"
      :render-mode="statusRenderMode"
      :zoom="zoom"
      :validation-count="session.validationIssues.value.length"
      :is-print-previewing="isPrintPreviewing"
    />

    <WorkbenchDialog
      :state="dialog.state.value"
      @update-value="dialog.updateValue"
      @confirm="dialog.confirm"
      @cancel="dialog.cancel"
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
  grid-template-columns: 244px minmax(0, 1fr) 318px;
}

.app-shell__middle {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 182px minmax(0, 1fr);
}

@media (max-width: 860px) {
  .app-shell__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .app-shell__body :deep(.template-tree),
  .app-shell__body :deep(.assist-panel),
  .app-shell__body :deep(.property-panel) {
    display: none;
  }
}
</style>
