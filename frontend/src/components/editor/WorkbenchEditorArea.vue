<script setup lang="ts">
import CanvasPreview from './CanvasPreview.vue'
import ValidationPanel from './ValidationPanel.vue'
import type { ExternalWriterElement } from '../../composables/useCanvasRenderer'
import type { TemplateOpenTab } from '../../services/templateWorkbenchService'
import type { ImportedDocument, ValidationIssue } from '../../types/document'

interface Props {
  document: ImportedDocument | null
  fileName?: string
  statusMessage: string
  warningText: string
  zoom: number
  validationIssues: readonly ValidationIssue[]
  openTabs: readonly TemplateOpenTab[]
  activeTemplateId?: string
}

interface Emits {
  modeChange: [mode: string]
  renderError: [message: string | null]
  writerReady: [writerElement: ExternalWriterElement | null]
  selectIssue: [issue: ValidationIssue]
  selectTab: [templateId: string]
  closeTab: [templateId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <section class="editor-area" aria-label="DCWriter 编辑区">
    <div class="editor-area__tabs">
      <button
        v-for="tab in props.openTabs"
        :key="tab.id"
        class="editor-area__tab"
        :class="{ 'editor-area__tab--active': tab.id === props.activeTemplateId }"
        type="button"
        :title="tab.fileName"
        @click="emit('selectTab', tab.id)"
      >
        <span>{{ tab.isDirty ? '* ' : '' }}{{ tab.name }}</span>
        <small>{{ tab.status }}</small>
        <span class="editor-area__tab-close" title="关闭页签" @click.stop="emit('closeTab', tab.id)">×</span>
      </button>
      <div v-if="props.openTabs.length === 0" class="editor-area__tab editor-area__tab--active" :title="props.fileName || '未打开文档'">
        <span>{{ props.fileName || '未打开文档' }}</span>
      </div>
    </div>

    <div class="editor-area__message-row">
      <span class="editor-area__message">{{ props.statusMessage }}</span>
      <span v-if="props.warningText" class="editor-area__warning">{{ props.warningText }}</span>
    </div>

    <CanvasPreview
      :document="props.document"
      :zoom="props.zoom"
      @mode-change="emit('modeChange', $event)"
      @render-error="emit('renderError', $event)"
      @writer-ready="emit('writerReady', $event)"
    />

    <ValidationPanel
      :issues="props.validationIssues"
      @select-issue="emit('selectIssue', $event)"
    />
  </section>
</template>

<style scoped>
.editor-area {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 34px auto minmax(0, 1fr) auto;
  background: #dbe5ed;
}

.editor-area__tabs {
  display: flex;
  min-width: 0;
  align-items: end;
  overflow-x: auto;
  border-bottom: 1px solid #c8d3dd;
  background: #f7f9fb;
}

.editor-area__tab {
  display: inline-flex;
  max-width: 220px;
  height: 32px;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  padding: 0 14px;
  border: 0;
  border-right: 1px solid #c8d3dd;
  background: transparent;
  color: #2f4053;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-area__tab span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-area__tab small {
  color: #8a5a00;
  font-size: 11px;
}

.editor-area__tab--active {
  background: #ffffff;
  color: #1f4f73;
  font-weight: 700;
}

.editor-area__tab-close {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: #607084;
}

.editor-area__tab-close:hover {
  background: #e3edf5;
  color: #b42318;
}

.editor-area__message-row {
  display: flex;
  min-width: 0;
  min-height: 28px;
  align-items: center;
  gap: 12px;
  padding: 4px 10px;
  border-bottom: 1px solid #d4dee7;
  background: #fff;
  font-size: 12px;
}

.editor-area__message,
.editor-area__warning {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-area__message {
  color: #334155;
}

.editor-area__warning {
  margin-left: auto;
  color: #8a5a00;
}
</style>
