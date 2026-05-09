<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import CanvasPreview from './CanvasPreview.vue'
import ImportToolbar from './ImportToolbar.vue'
import type { ExternalWriterElement } from '../../composables/useCanvasRenderer'
import { useDocumentImport } from '../../composables/useDocumentImport'
import {
  closeWriterPrintPreview,
  printWriterDocument,
  showWriterPrintPreview,
  type WriterPrintResult,
} from '../../utils/writerPrint'

const { document, error, isImporting, importFile, clearDocument } = useDocumentImport()

const zoom = shallowRef(1)
const rendererMode = shallowRef('preview')
const rendererError = shallowRef<string | null>(null)
const printMessage = shallowRef<string | null>(null)
const writerElement = shallowRef<ExternalWriterElement | null>(null)
const isPrintPreviewing = shallowRef(false)
const activeToolbarTab = shallowRef('ToolbarStart')

const statusText = computed(() => {
  if (isImporting.value) {
    return '正在导入 XML'
  }

  if (error.value) {
    return error.value
  }

  if (!document.value) {
    return '请选择 XML 文件开始预览'
  }

  if (rendererError.value) {
    return rendererError.value
  }

  if (printMessage.value) {
    return printMessage.value
  }

  if (isPrintPreviewing.value) {
    return '已进入打印预览'
  }

  return rendererMode.value === 'external' ? '已启用外部 Canvas 渲染' : '已生成结构化 Canvas 预览'
})

const warningText = computed(() => document.value?.warnings.join('；') || '')

function zoomIn() {
  zoom.value = Math.min(2, Math.round((zoom.value + 0.1) * 10) / 10)
}

function zoomOut() {
  zoom.value = Math.max(0.5, Math.round((zoom.value - 0.1) * 10) / 10)
}

function resetZoom() {
  zoom.value = 1
}

function printDocument() {
  applyPrintResult(printWriterDocument(writerElement.value))
}

function openPrintPreview() {
  const result = showWriterPrintPreview(writerElement.value)
  applyPrintResult(result)
  if (result.ok) {
    isPrintPreviewing.value = true
  }
}

function closePrintPreview() {
  const result = closeWriterPrintPreview(writerElement.value)
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
  clearDocument()
  writerElement.value = null
  isPrintPreviewing.value = false
  printMessage.value = null
  rendererError.value = null
}

function selectToolbarTab(tabId: string) {
  activeToolbarTab.value = tabId
}
</script>

<template>
  <div class="app-shell">
    <header class="ribbon-header">
      <div class="ribbon-header__top">
        <div class="ribbon-header__brand">
          <svg class="ribbon-header__brand-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2C17.52 2 22 6.48 22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2ZM11 7V11H7V13H11V17H13V13H17V11H13V7H11Z"
            />
          </svg>
          <span>病历 Web 编辑器演示版</span>
        </div>
        <div class="ribbon-header__actions" aria-hidden="true">
          <button class="title-bar-btn" type="button" tabindex="-1">
            <svg viewBox="0 0 24 24">
              <path d="M5 5H10V7H7V10H5V5ZM14 5H19V10H17V7H14V5ZM5 14H7V17H10V19H5V14ZM17 17V14H19V19H14V17H17Z" />
            </svg>
          </button>
        </div>
      </div>
      <nav class="ribbon-tabs" aria-label="功能页签">
        <button class="ribbon-tab" :class="{ 'is-active': activeToolbarTab === 'ToolbarStart' }" type="button" @click="selectToolbarTab('ToolbarStart')">开始</button>
      </nav>
    </header>

    <ImportToolbar
      :is-importing="isImporting"
      :can-print="Boolean(document)"
      :can-use-writer-print="Boolean(writerElement)"
      :is-print-previewing="isPrintPreviewing"
      :zoom="zoom"
      :file-name="document?.fileName"
      :active-tab-id="activeToolbarTab"
      @import-file="importFile"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @reset-zoom="resetZoom"
      @print="printDocument"
      @print-preview="openPrintPreview"
      @close-print-preview="closePrintPreview"
      @clear="clear"
      @tab-change="selectToolbarTab"
    />

    <main class="app-shell__main">
      <CanvasPreview
        :document="document"
        :zoom="zoom"
        @mode-change="rendererMode = $event"
        @render-error="rendererError = $event"
        @writer-ready="updateWriterElement"
      />
    </main>

    <footer class="status-bar">
      <span class="status-bar__item">Status：{{ statusText }}</span>
      <span v-if="warningText" class="status-bar__item status-bar__item--warning">{{ warningText }}</span>
      <span class="status-bar__item status-bar__item--right">渲染模式：{{ rendererMode === 'external' ? '外部渲染' : '结构化预览' }}</span>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  background: #f5f5f5;
  color: #000;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, "Microsoft YaHei UI", sans-serif;
}

.ribbon-header {
  overflow: hidden;
  background: #446995;
  color: #fff;
}

.ribbon-header__top {
  display: flex;
  height: 22px;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.ribbon-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 22px;
  opacity: 0.95;
}

.ribbon-header__brand-icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.ribbon-header__actions {
  display: flex;
  align-items: center;
}

.title-bar-btn {
  display: flex;
  width: 32px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: #fff;
}

.title-bar-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.ribbon-tabs {
  display: flex;
  height: 44px;
  align-items: stretch;
  padding: 0 16px;
}

.ribbon-tab {
  display: inline-flex;
  min-width: 104px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 38px;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 14px;
}

.ribbon-tab:hover:not(.is-active) {
  background-color: rgba(237, 235, 233, 0.4);
}

.ribbon-tab.is-active {
  background-color: #f2f2f2;
  color: #446995;
}

.app-shell__main {
  min-height: 0;
  overflow: hidden;
}

.status-bar {
  display: flex;
  height: 24px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 16px;
  border-top: 1px solid #d0d0d0;
  background: #ffffff;
  color: #000;
  font-size: 12px;
}

.status-bar__item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bar__item--warning {
  color: #8a5a00;
}

.status-bar__item--right {
  margin-left: auto;
  color: #000;
}

@media (max-width: 720px) {
  .ribbon-tabs {
    overflow-x: auto;
  }

  .status-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }

  .status-bar__item--right {
    margin-left: 0;
  }
}
</style>
