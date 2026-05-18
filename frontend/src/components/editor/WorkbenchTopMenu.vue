<script setup lang="ts">
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckSquare,
  CircleDot,
  ClipboardPaste,
  CloudUpload,
  Columns3,
  Copy,
  CopyPlus,
  Download,
  FileSearch,
  FileText,
  FileUp,
  Hash,
  History,
  Italic,
  Merge,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings,
  SplitSquareHorizontal,
  Table,
  Trash2,
  Underline,
  Undo2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-vue-next'
import { computed, shallowRef, useTemplateRef } from 'vue'
import type { Component } from 'vue'
import type { AppCommandId, EditorCommandId } from '../../types/document'
import { topMenuTabs, type CommandDefinition } from './commandRegistry'

interface Props {
  canUseWriterCommands: boolean
  canUseWriterPrint: boolean
  canSave: boolean
  canPrint: boolean
  canUpload: boolean
  isSaving: boolean
  isImporting: boolean
  isPrintPreviewing: boolean
  fileName?: string
}

interface Emits {
  command: [commandId: EditorCommandId]
  importFile: [file: File]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeMenuId = shallowRef(topMenuTabs[0]?.id || 'file')
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')
const activeMenu = computed(() => (
  topMenuTabs.find(tab => tab.id === activeMenuId.value) || topMenuTabs[0]
))

const iconMap: Record<string, Component> = {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarDays,
  CheckSquare,
  CircleDot,
  ClipboardPaste,
  CloudUpload,
  Columns3,
  Copy,
  CopyPlus,
  Download,
  FileSearch,
  FileText,
  FileUp,
  Hash,
  History,
  Italic,
  Merge,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Scissors,
  Settings,
  SplitSquareHorizontal,
  Table,
  Trash2,
  Underline,
  Undo2,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
}

function selectMenu(menuId: string) {
  activeMenuId.value = menuId
}

function commandIcon(command: CommandDefinition) {
  return iconMap[command.icon || 'Settings'] || Settings
}

function fileImportCommands(commands: readonly CommandDefinition[]) {
  return commands.filter(command => command.id === 'importXml')
}

function buttonCommands(commands: readonly CommandDefinition[]) {
  return commands.filter(command => command.id !== 'importXml')
}

function isCommandDisabled(command: CommandDefinition) {
  if (command.kind === 'placeholder') {
    return true
  }

  if (command.kind === 'writer') {
    return !props.canUseWriterCommands
  }

  return isAppCommandDisabled(command.id as AppCommandId)
}

function isAppCommandDisabled(commandId: AppCommandId) {
  if (commandId === 'save') return !props.canSave || props.isSaving
  if (commandId === 'saveAsTemplate') return !props.canSave || props.isSaving
  if (commandId === 'downloadXml') return !props.canSave
  if (commandId === 'uploadTemplate') return !props.canUpload
  if (commandId === 'batchUploadTemplates') return !props.canUpload
  if (commandId === 'cancelUpload') return !props.canUpload
  if (commandId === 'historyVersions') return !props.canPrint
  if (commandId === 'print' || commandId === 'printPreview') {
    return !props.canPrint || !props.canUseWriterPrint
  }
  if (commandId === 'closePrintPreview') {
    return !props.isPrintPreviewing || !props.canUseWriterPrint
  }
  if (commandId === 'clearDocument') return !props.canSave
  if (commandId === 'importXml') return props.isImporting
  return false
}

function runCommand(command: CommandDefinition) {
  if (isCommandDisabled(command)) {
    return
  }
  emit('command', command.id)
}

function openFilePicker(command: CommandDefinition) {
  if (isCommandDisabled(command)) {
    return
  }
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('importFile', file)
  }
  input.value = ''
}
</script>

<template>
  <header class="workbench-menu">
    <div class="workbench-menu__tabs" aria-label="模板制作菜单">
      <button
        v-for="menu in topMenuTabs"
        :key="menu.id"
        class="workbench-menu__tab"
        :class="{ 'workbench-menu__tab--active': menu.id === activeMenu?.id }"
        type="button"
        @click="selectMenu(menu.id)"
      >
        {{ menu.label }}
      </button>
      <div class="workbench-menu__state" :title="props.fileName || '未打开文档'">
        {{ props.fileName || '未打开文档' }}
      </div>
    </div>

    <div class="workbench-menu__toolbar">
      <div
        v-for="group in activeMenu?.groups || []"
        :key="group.id"
        class="workbench-menu__group"
      >
        <div class="workbench-menu__commands">
          <button
            v-for="command in fileImportCommands(group.commands)"
            :key="command.id"
            class="workbench-command workbench-command--primary"
            type="button"
            title="导入本地 XML"
            :disabled="isCommandDisabled(command)"
            @mousedown.prevent
            @click="openFilePicker(command)"
          >
            <component :is="commandIcon(command)" :size="17" aria-hidden="true" />
            <span>{{ command.label }}</span>
          </button>
          <button
            v-for="command in buttonCommands(group.commands)"
            :key="command.id"
            class="workbench-command"
            type="button"
            :title="command.disabledReason || command.label"
            :disabled="isCommandDisabled(command)"
            @mousedown.prevent
            @click="runCommand(command)"
          >
            <component :is="commandIcon(command)" :size="17" aria-hidden="true" />
            <span>{{ command.label }}</span>
          </button>
        </div>
        <div class="workbench-menu__group-title">{{ group.label }}</div>
      </div>
      <input
        ref="fileInput"
        class="workbench-command__file"
        type="file"
        accept=".xml,text/xml,application/xml"
        :disabled="props.isImporting"
        @change="handleFileChange"
      />
    </div>
  </header>
</template>

<style scoped>
.workbench-menu {
  display: grid;
  min-width: 0;
  border-bottom: 1px solid #bac7d4;
  background: #eef3f7;
  color: #1f2937;
}

.workbench-menu__tabs {
  display: flex;
  min-width: 0;
  height: 36px;
  align-items: end;
  gap: 3px;
  padding: 0 10px;
  border-bottom: 1px solid #c9d3dc;
  background: #f7f9fb;
}

.workbench-menu__tab {
  min-width: 58px;
  height: 28px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-bottom: 0;
  border-radius: 4px 4px 0 0;
  background: transparent;
  color: #2e4054;
  font-size: 13px;
}

.workbench-menu__tab:hover {
  border-color: #c4d0dc;
  background: #edf4f8;
}

.workbench-menu__tab--active {
  border-color: #b9c8d4;
  background: #ffffff;
  color: #1f4f73;
  font-weight: 700;
}

.workbench-menu__state {
  min-width: 140px;
  max-width: 360px;
  margin-left: auto;
  overflow: hidden;
  align-self: center;
  color: #607084;
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-menu__toolbar {
  display: flex;
  min-width: 0;
  height: 56px;
  overflow-x: auto;
  padding: 8px 10px 6px;
  background: #ffffff;
}

.workbench-menu__group {
  display: grid;
  min-width: max-content;
  grid-template-rows: minmax(0, 1fr) 14px;
  padding: 0 9px;
  border-right: 1px solid #d8e0e8;
}

.workbench-menu__commands {
  display: flex;
  align-items: start;
  gap: 4px;
}

.workbench-menu__group-title {
  overflow: hidden;
  color: #6b7d90;
  font-size: 11px;
  line-height: 14px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workbench-command {
  position: relative;
  display: inline-flex;
  min-width: 44px;
  height: 32px;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #26364a;
  font-size: 12px;
}

.workbench-command:hover:not(:disabled) {
  border-color: #b7c9d6;
  background: #e7f0f5;
}

.workbench-command:disabled,
.workbench-command--disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.workbench-command--primary {
  border-color: #b9cad6;
  background: #f8fbfd;
  cursor: pointer;
}

.workbench-command__file {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

@media (max-width: 900px) {
  .workbench-menu__state {
    display: none;
  }
}
</style>
