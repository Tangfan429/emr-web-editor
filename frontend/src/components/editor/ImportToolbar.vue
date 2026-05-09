<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'

interface Props {
  isImporting: boolean
  canPrint: boolean
  zoom: number
  fileName?: string
  activeTabId: string
}

interface Emits {
  importFile: [file: File]
  zoomIn: []
  zoomOut: []
  resetZoom: []
  print: []
  clear: []
  tabChange: [tabId: string]
}

interface ToolbarResponse {
  toolBars: ToolbarTab[]
}

interface ToolbarTab {
  id: string
  title: string
  groups: ToolbarGroup[]
}

interface ToolbarGroup {
  text: string
  childItems: ToolbarItem[]
}

interface ToolbarItem {
  type: string
  id: string
  text: string
  icon: string
  commandName: string
  childItems: ToolbarOption[]
}

interface ToolbarOption {
  label: string
  value: string
  fontWeight: string
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const toolbarTabs = shallowRef<ToolbarTab[]>([])
const activeTabId = shallowRef('ToolbarStart')
const svgDictionary = shallowRef<Record<string, string>>({})
const allowedToolbarTabIds = new Set(['ToolbarStart'])
const hiddenToolbarGroupNames = new Set(['Clipboard', 'Convention', 'Font', 'Paragraph', 'Style'])
const hiddenToolbarCommandNames = new Set([
  'SavePdf',
  'SaveXml',
  'Print',
  'PrintPreview',
])
const hiddenToolbarItemIds = new Set([
  'btnSavePdf',
  'btnSaveXml',
  'btnPrint',
  'btnPrintPreview',
])

const fallbackTabs = computed<ToolbarTab[]>(() => [
  {
    id: 'ToolbarStart',
    title: 'Start',
    groups: [
      {
        text: 'File',
        childItems: [
          { type: 'button', id: 'btnOpen', text: 'Open', icon: 'Open', commandName: 'fileopen', childItems: [] },
          { type: 'button', id: 'btnSaveXml', text: 'SaveXml', icon: 'SaveXml', commandName: '', childItems: [] },
          { type: 'button', id: 'btnSavePdf', text: 'Save Pdf', icon: 'SavePdf', commandName: '', childItems: [] },
        ],
      },
      {
        text: 'Clipboard',
        childItems: [
          { type: 'button', id: 'btnPaste', text: 'Paste', icon: 'paste', commandName: '', childItems: [] },
          { type: 'button', id: 'btnCut', text: 'Cut', icon: 'cut', commandName: '', childItems: [] },
          { type: 'button', id: 'btnCopy', text: 'Copy', icon: 'copy', commandName: '', childItems: [] },
          { type: 'button', id: 'btnFormatBrush', text: 'Format Brush', icon: 'FormatBrush', commandName: '', childItems: [] },
        ],
      },
      {
        text: 'Convention',
        childItems: [
          { type: 'button', id: 'btnUndo', text: 'Undo', icon: 'Undo', commandName: '', childItems: [] },
          { type: 'button', id: 'btnRedo', text: 'Redo', icon: 'Redo', commandName: '', childItems: [] },
        ],
      },
    ],
  },
])

const visibleTabs = computed(() => {
  const sourceTabs = toolbarTabs.value.length > 0 ? toolbarTabs.value : fallbackTabs.value
  const tabs = sourceTabs
    .filter((tab) => allowedToolbarTabIds.has(tab.id))
    .map(filterToolbarTab)
    .filter((tab) => tab.groups.length > 0)

  return tabs.length > 0 ? tabs : fallbackTabs.value.map(filterToolbarTab)
})
const currentTabId = computed(() => props.activeTabId || activeTabId.value)
const activeTab = computed(() => visibleTabs.value.find((tab) => tab.id === currentTabId.value) || visibleTabs.value[0])

onMounted(async () => {
  const [description, icons] = await Promise.all([loadToolbarDescription(), loadSvgDictionary()])
  if (description?.toolBars?.length) {
    toolbarTabs.value = description.toolBars
    activeTabId.value = description.toolBars[0].id
  }

  if (icons) {
    svgDictionary.value = icons
  }
})

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('importFile', file)
  }

  input.value = ''
}

async function loadToolbarDescription() {
  try {
    const response = await fetch('/renderer/toolboxdescription.json')
    if (!response.ok) {
      return null
    }

    return await response.json() as ToolbarResponse
  } catch {
    return null
  }
}

async function loadSvgDictionary() {
  try {
    const response = await fetch('/renderer/js/DCWriterLife.js')
    if (!response.ok) {
      return null
    }

    return parseSvgDictionaryScript(await response.text())
  } catch {
    return null
  }
}

function parseSvgDictionaryScript(source: string) {
  const literal = extractAssignedObjectLiteral(source, 'SVG_Dictionary')
  return literal ? parseSvgDictionaryLiteral(literal) : null
}

function parseSvgDictionaryLiteral(source: string) {
  if (!source.trim().startsWith('{')) {
    return null
  }

  try {
    return Function(`"use strict"; return (${source});`)() as Record<string, string>
  } catch {
    return null
  }
}

function extractAssignedObjectLiteral(source: string, variableName: string) {
  const markerIndex = source.indexOf(variableName)
  if (markerIndex < 0) {
    return null
  }

  const start = source.indexOf('{', markerIndex)
  if (start < 0) {
    return null
  }

  let depth = 0
  let inString: string | null = null
  let escaping = false
  for (let index = start; index < source.length; index += 1) {
    const current = source[index]
    if (inString) {
      if (escaping) {
        escaping = false
      } else if (current === '\\') {
        escaping = true
      } else if (current === inString) {
        inString = null
      }
      continue
    }

    if (current === '"' || current === '\'' || current === '`') {
      inString = current
      continue
    }

    if (current === '{') {
      depth += 1
    } else if (current === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  return null
}

function selectTab(tabId: string) {
  activeTabId.value = tabId
  emit('tabChange', tabId)
}

function tabLabel(title: string) {
  const labels: Record<string, string> = {
    Start: '开始',
    Insert: '插入',
    Table: '表格',
    Print: '打印',
  }

  return labels[title] || title
}

function commandForItem(item: ToolbarItem) {
  if (item.commandName === 'fileopen' || item.id === 'btnOpen') {
    return 'import'
  }

  if (item.commandName === 'Print' || item.commandName === 'PrintPreview' || item.id === 'btnPrintPreview') {
    return 'print'
  }

  return ''
}

function filterToolbarTab(tab: ToolbarTab): ToolbarTab {
  return {
    ...tab,
    groups: tab.groups
      .filter((group) => !hiddenToolbarGroupNames.has(group.text))
      .map((group) => ({
        ...group,
        childItems: group.childItems.filter(shouldShowToolbarItem),
      }))
      .filter((group) => group.childItems.length > 0),
  }
}

function shouldShowToolbarItem(item: ToolbarItem) {
  if (item.id && hiddenToolbarItemIds.has(item.id)) {
    return false
  }

  if (item.commandName && hiddenToolbarCommandNames.has(item.commandName)) {
    return false
  }

  return commandForItem(item) === 'import'
}

function runToolbarItem(item: ToolbarItem) {
  const command = commandForItem(item)
  if (command === 'print' && props.canPrint) {
    emit('print')
  }
}

function itemHtml(item: ToolbarItem) {
  const icon = svgDictionary.value[item.icon] || item.icon || ''
  const shouldShowLabel = activeTab.value?.title === 'Insert' || activeTab.value?.title === 'Table' || activeTab.value?.title === 'Print'
  const label = shouldShowLabel && item.text ? `<span class="${escapeAttribute(item.id)}">${escapeHtml(item.text)}</span>` : ''
  const dropdown = item.type === 'dropdownList' ? svgDictionary.value.dropDownIcon || '' : ''
  return `${icon}${dropdown}${label}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeAttribute(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '')
}
</script>

<template>
  <div class="ribbon-toolbar" role="toolbar" aria-label="文档工具栏">
    <div class="ribbon-toolbar__tabs">
      <button
        v-for="tab in visibleTabs"
        :key="tab.id"
        class="ribbon-toolbar__tab-proxy"
        :class="{ active: tab.id === activeTab?.id }"
        type="button"
        @click="selectTab(tab.id)"
      >
        {{ tabLabel(tab.title) }}
      </button>
    </div>

    <div :id="`${activeTab?.id || 'ToolbarStart'}-content`" class="ribbon-content active">
      <div class="ribbon-groups">
        <template v-for="(group, groupIndex) in activeTab?.groups || []" :key="`${activeTab?.id}-${groupIndex}`">
          <div class="ribbon-group" :class="`ribbon-group${group.text}`">
            <div class="group-controls" :class="[`group-controls${group.text}`, activeTab?.title]">
              <template v-for="item in group.childItems" :key="item.id || `${groupIndex}-${item.text}-${item.type}`">
                <template v-if="item.type === 'button'">
                  <label
                    v-if="commandForItem(item) === 'import'"
                    class="control-btn"
                    :id="item.id"
                    :title="item.text"
                    :class="{ disabled: props.isImporting }"
                  >
                    <span class="control-btn__html" v-html="itemHtml(item)"></span>
                    <input
                      class="control-btn__input"
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      :disabled="props.isImporting"
                      @change="handleFileChange"
                    />
                  </label>
                  <button
                    v-else
                    class="control-btn"
                    :id="item.id"
                    :title="item.text"
                    type="button"
                    :disabled="commandForItem(item) === 'print' && !props.canPrint"
                    @click="runToolbarItem(item)"
                    v-html="itemHtml(item)"
                  ></button>
                </template>

                <div v-else-if="item.type === 'select'" class="dropdown-container">
                  <select class="ribbon-dropdown" :id="item.id" :title="item.text" disabled>
                    <option v-for="option in item.childItems" :key="`${item.id}-${option.value}`" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </div>

                <div v-else-if="item.type === 'dropdownList'" class="control-btn control-btn-dropdown" :title="item.text" v-html="itemHtml(item)"></div>

                <div v-else-if="item.type === 'fontStyle'" class="font-style-box">
                  <div class="font-style-list">
                    <div
                      v-for="option in item.childItems"
                      :key="option.value"
                      class="font-style-item"
                      :style="{ fontSize: `${option.value}px`, fontWeight: option.fontWeight || undefined }"
                    >
                      {{ option.label }}
                    </div>
                  </div>
                </div>

                <div v-else-if="item.type === 'colorPicker'" class="control-btn color-picker-box" :title="item.text" v-html="itemHtml(item)"></div>
              </template>
            </div>
            <div v-if="group.text" class="group-title" :class="group.text">{{ group.text }}</div>
          </div>
          <div v-if="groupIndex < (activeTab?.groups.length || 0) - 1" class="divider"></div>
        </template>

        <div class="ribbon-toolbar__document" :title="props.fileName || '未导入文档'">
          <span>{{ props.fileName || '未导入文档' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ribbon-toolbar {
  height: 100px;
  overflow: hidden;
  border-bottom: 1px solid #d0d0d0;
  background: #f2f2f2;
  color: #000;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, "Microsoft YaHei UI", sans-serif;
}

.ribbon-toolbar__tabs {
  display: none;
}

.ribbon-content {
  width: 100%;
  height: 100px;
  padding: 12px 16px;
  overflow: hidden;
  box-sizing: border-box;
  background: #f2f2f2;
}

.ribbon-groups {
  display: flex;
  width: 100%;
  height: 100%;
  user-select: none;
}

.ribbon-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.group-controls {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
}

.control-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: 4px;
  background: none;
  color: #000;
  cursor: pointer;
}

.control-btn:hover,
.control-btn.active {
  background-color: #e2e2e2;
}

.control-btn:disabled,
.control-btn.disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.control-btn__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.control-btn :deep(svg),
.control-btn svg {
  vertical-align: middle;
}

.control-btn__html {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.divider {
  width: 1px;
  margin: 0 16px;
  border-right: 1px dashed #ccc;
  background-color: transparent;
}

.group-title {
  color: #666;
  font-size: 11px;
  line-height: 14px;
}

.dropdown-container {
  position: relative;
  display: flex;
  margin: 0 4px;
  flex-direction: column;
  align-items: center;
}

.ribbon-dropdown {
  min-width: 120px;
  height: 28px;
  padding: 6px 24px 6px 8px;
  border: 1px solid #a6a6a6;
  border-radius: 3px;
  background-color: #fff;
  color: #333;
  font-size: 12px;
  outline: none;
}

.ribbon-dropdown:hover {
  border-color: #666;
}

.ribbon-dropdown:disabled {
  background-color: #f5f5f5;
  color: #333;
  opacity: 1;
}

.font-style-box {
  display: flex;
  height: 76px;
}

.font-style-list {
  width: 154px;
  overflow: hidden;
  border: 1px solid #d0d0d0;
  background: #fff;
}

.font-style-item {
  height: 22px;
  overflow: hidden;
  padding: 0 6px;
  color: #333;
  line-height: 22px;
  white-space: nowrap;
}

.font-style-item:hover {
  background-color: #e2e2e2;
}

.ribbon-toolbar__document {
  display: inline-flex;
  min-width: 0;
  max-width: 220px;
  height: 28px;
  margin-left: auto;
  align-items: center;
  align-self: flex-start;
  overflow: hidden;
  color: #444;
  font-size: 12px;
  white-space: nowrap;
}

.ribbon-toolbar__document span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.ribbon-groupFile .group-controls,
.ribbon-groupClipboard .group-controls,
.ribbon-groupConvention .group-controls {
  flex-wrap: nowrap;
}

.ribbon-groupFont {
  width: 260px;
}

.ribbon-groupParagraph {
  width: 190px;
}

.ribbon-groupStyle {
  width: 154px;
  overflow: hidden;
}

.ribbon-groupMode,
.ribbon-groupLayout {
  flex-wrap: nowrap;
}

#ToolBarInsert-content .divider,
#ToolBarTable-content .divider {
  width: 1px;
  margin: 0 16px;
  border-right: 1px dashed #ccc;
  background-color: transparent;
}

#ToolBarTable-content .control-btn {
  flex-direction: column;
  margin: 0 3px;
  font-size: 12px;
  text-align: center;
}

#ToolBarPrintView-content .control-btn span,
#ToolBarInsert-content .control-btn span {
  margin-left: 4px;
  color: #444;
  font-size: 12px;
}

#ToolBarInsert-content .group-controlsCheck {
  width: 88px;
  justify-content: space-between;
}

#ToolBarInsert-content .group-controlsFile {
  width: 150px;
  justify-content: space-between;
}

#ToolBarInsert-content .group-controlsCheck .control-btn {
  width: 100%;
  justify-content: flex-start;
}

#ToolBarInsert-content .group-controlsFile .control-btn {
  width: 75px;
  justify-content: flex-start;
}

.group-controlsPrint.Page .control-btn {
  width: 160px;
  justify-content: flex-start;
}

.btnInsertRowAbove,
.btnInsertRowBelow,
.btnInsertColumnLeft,
.btnInsertColumnRight,
.btnDeleteColumn,
.btnDeleteRow,
.btnClosePrintPreview,
.btnPrintPreview,
.group-controlsAlign .control-btn span {
  display: none;
}

@media screen and (max-width: 1240px) {
  .ribbon-groupStyle,
  .ribbon-groupStyle + .divider {
    display: none;
  }

  .group-title {
    display: none;
  }

  .divider {
    margin: 0 6px;
  }
}
</style>
