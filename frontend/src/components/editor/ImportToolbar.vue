<script setup lang="ts">
import { computed } from 'vue'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckSquare,
  CircleDot,
  Columns3,
  Copy,
  Download,
  FileSearch,
  FileText,
  FileUp,
  Italic,
  Merge,
  Printer,
  Redo2,
  RotateCcw,
  Rows3,
  Save,
  Scissors,
  Settings,
  SplitSquareHorizontal,
  Table,
  Trash2,
  Underline,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import type { EditorCommandId } from '../../types/document'
import { ribbonTabs, type RibbonCommand } from './ribbonCommands'

interface Props {
  isImporting: boolean
  canPrint: boolean
  canUseWriterPrint: boolean
  canUseWriterCommands: boolean
  canSave: boolean
  isSaving: boolean
  isPrintPreviewing: boolean
  zoom: number
  fileName?: string
  activeTabId: string
}

interface Emits {
  closePrintPreview: []
  clear: []
  downloadXml: []
  importFile: [file: File]
  print: []
  printPreview: []
  resetZoom: []
  runCommand: [commandId: EditorCommandId]
  save: []
  selectTab: [tabId: string]
  tabChange: [tabId: string]
  zoomIn: []
  zoomOut: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const commandIcons: Partial<Record<EditorCommandId, Component>> = {
  undo: Undo2,
  redo: Redo2,
  copy: Copy,
  cut: Scissors,
  paste: FileText,
  selectAll: CheckSquare,
  bold: Bold,
  italic: Italic,
  underline: Underline,
  alignLeft: AlignLeft,
  alignCenter: AlignCenter,
  alignRight: AlignRight,
  insertInputField: FileText,
  insertDateTime: CalendarDays,
  insertCheckbox: CheckSquare,
  insertRadio: CircleDot,
  insertPageBreak: FileText,
  insertPageInfo: FileText,
  insertTable: Table,
  deleteTable: Trash2,
  insertRowUp: Rows3,
  insertRowDown: Rows3,
  insertColumnLeft: Columns3,
  insertColumnRight: Columns3,
  mergeCell: Merge,
  splitCell: SplitSquareHorizontal,
  tableProperties: Settings,
  rowProperties: Settings,
  cellProperties: Settings,
}

const visibleTabs = computed(() => ribbonTabs.filter((tab) => tab.groups.some((group) => group.commands.length > 0)))
const activeTab = computed(() => (
  visibleTabs.value.find((tab) => tab.id === props.activeTabId) || visibleTabs.value[0]
))
const zoomText = computed(() => `${Math.round(props.zoom * 100)}%`)

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('importFile', file)
  }

  input.value = ''
}

function selectTab(tabId: string) {
  emit('selectTab', tabId)
  emit('tabChange', tabId)
}

function runCommand(command: RibbonCommand) {
  if (!props.canUseWriterCommands || !command.requiresWriter) {
    return
  }

  emit('runCommand', command.id)
}

function commandIcon(commandId: EditorCommandId) {
  return commandIcons[commandId] || Settings
}
</script>

<template>
  <div class="ribbon-toolbar" role="toolbar" aria-label="文档工具栏">
    <div class="ribbon-toolbar__tabs" aria-label="功能页签">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        class="ribbon-toolbar__tab"
        :class="{ 'ribbon-toolbar__tab--active': tab.id === activeTab?.id }"
        type="button"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="ribbon-toolbar__content">
      <div class="ribbon-toolbar__quick">
        <label class="ribbon-tool ribbon-tool--primary" title="导入本地 XML">
          <FileUp :size="18" aria-hidden="true" />
          <span>导入</span>
          <input
            class="ribbon-tool__input"
            type="file"
            accept=".xml,text/xml,application/xml"
            :disabled="props.isImporting"
            @change="handleFileChange"
          />
        </label>
        <button
          class="ribbon-tool"
          type="button"
          title="保存到后端"
          :disabled="!props.canSave || props.isSaving"
          @click="emit('save')"
        >
          <Save :size="18" aria-hidden="true" />
          <span>保存</span>
        </button>
        <button
          class="ribbon-tool"
          type="button"
          title="下载 XML"
          :disabled="!props.canSave"
          @click="emit('downloadXml')"
        >
          <Download :size="18" aria-hidden="true" />
          <span>XML</span>
        </button>
      </div>

      <div class="ribbon-toolbar__groups">
        <div v-for="group in activeTab?.groups || []" :key="group.id" class="ribbon-group">
          <div class="ribbon-group__commands">
            <button
              v-for="command in group.commands"
              :key="command.id"
              class="ribbon-command"
              type="button"
              :title="command.label"
              :disabled="!props.canUseWriterCommands"
              @click="runCommand(command)"
            >
              <component :is="commandIcon(command.id)" :size="18" aria-hidden="true" />
              <span>{{ command.label }}</span>
            </button>
          </div>
          <div class="ribbon-group__title">{{ group.label }}</div>
        </div>
      </div>

      <div class="ribbon-toolbar__document" :title="props.fileName || '未导入文档'">
        {{ props.fileName || '未导入文档' }}
      </div>

      <div class="ribbon-toolbar__utility">
        <button class="icon-tool" type="button" title="缩小" @click="emit('zoomOut')">
          <ZoomOut :size="17" aria-hidden="true" />
        </button>
        <button class="zoom-value" type="button" title="重置缩放" @click="emit('resetZoom')">
          {{ zoomText }}
        </button>
        <button class="icon-tool" type="button" title="放大" @click="emit('zoomIn')">
          <ZoomIn :size="17" aria-hidden="true" />
        </button>
        <button class="icon-tool" type="button" title="清空文档" :disabled="!props.canSave" @click="emit('clear')">
          <RotateCcw :size="17" aria-hidden="true" />
        </button>
      </div>

      <div class="ribbon-toolbar__print" aria-label="打印操作">
        <button
          class="icon-tool"
          type="button"
          title="打印"
          :disabled="!props.canPrint || !props.canUseWriterPrint"
          @click="emit('print')"
        >
          <Printer :size="18" aria-hidden="true" />
        </button>
        <button
          v-if="!props.isPrintPreviewing"
          class="icon-tool"
          type="button"
          title="打印预览"
          :disabled="!props.canPrint || !props.canUseWriterPrint"
          @click="emit('printPreview')"
        >
          <FileSearch :size="18" aria-hidden="true" />
        </button>
        <button
          v-else
          class="icon-tool"
          type="button"
          title="关闭打印预览"
          :disabled="!props.canUseWriterPrint"
          @click="emit('closePrintPreview')"
        >
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ribbon-toolbar {
  display: grid;
  height: 116px;
  grid-template-rows: 34px 82px;
  border-bottom: 1px solid #cdd6df;
  background: #f2f5f7;
  color: #1f2937;
}

.ribbon-toolbar__tabs {
  display: flex;
  align-items: end;
  gap: 2px;
  padding: 0 12px;
  background: #446995;
}

.ribbon-toolbar__tab {
  min-width: 82px;
  height: 30px;
  padding: 0 18px;
  border: 0;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: #fff;
  font-size: 13px;
}

.ribbon-toolbar__tab:hover:not(.ribbon-toolbar__tab--active) {
  background: rgba(255, 255, 255, 0.16);
}

.ribbon-toolbar__tab--active {
  background: #f2f5f7;
  color: #244b73;
  font-weight: 700;
}

.ribbon-toolbar__content {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) minmax(120px, 220px) auto auto;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px 8px;
}

.ribbon-toolbar__quick,
.ribbon-toolbar__utility,
.ribbon-toolbar__print {
  display: inline-flex;
  align-items: flex-start;
  gap: 5px;
}

.ribbon-toolbar__groups {
  display: flex;
  min-width: 0;
  overflow-x: auto;
}

.ribbon-group {
  display: grid;
  min-width: max-content;
  grid-template-rows: minmax(0, 1fr) 16px;
  padding: 0 10px;
  border-right: 1px solid #d2dbe4;
}

.ribbon-group__commands {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.ribbon-group__title {
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ribbon-tool,
.ribbon-command,
.icon-tool,
.zoom-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #1f2937;
}

.ribbon-tool,
.ribbon-command {
  position: relative;
  min-width: 48px;
  height: 52px;
  flex-direction: column;
  gap: 4px;
  padding: 4px 6px;
  font-size: 12px;
}

.ribbon-tool:hover,
.ribbon-command:hover,
.icon-tool:hover,
.zoom-value:hover {
  border-color: #b7c9d6;
  background: #e6eff5;
}

.ribbon-tool:disabled,
.ribbon-command:disabled,
.icon-tool:disabled,
.zoom-value:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.ribbon-tool--primary {
  border-color: #a9c0d4;
  background: #fff;
}

.ribbon-tool__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.ribbon-command span,
.ribbon-tool span {
  max-width: 70px;
  overflow: hidden;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ribbon-toolbar__document {
  align-self: start;
  min-width: 0;
  overflow: hidden;
  padding-top: 7px;
  color: #475569;
  font-size: 12px;
  line-height: 20px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-tool {
  width: 30px;
  height: 30px;
  background: #fff;
  border-color: #c8d2dc;
}

.zoom-value {
  min-width: 46px;
  height: 30px;
  padding: 0 6px;
  background: #fff;
  border-color: #c8d2dc;
  font-size: 12px;
}

@media (max-width: 980px) {
  .ribbon-toolbar__content {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .ribbon-toolbar__document {
    display: none;
  }
}

@media (max-width: 720px) {
  .ribbon-toolbar {
    height: 132px;
    grid-template-rows: 34px 98px;
  }

  .ribbon-toolbar__content {
    grid-template-columns: minmax(0, 1fr);
    overflow-x: auto;
  }

  .ribbon-toolbar__quick,
  .ribbon-toolbar__utility,
  .ribbon-toolbar__print {
    display: none;
  }
}
</style>
