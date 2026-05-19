<script setup lang="ts">
import { FileCog, MousePointerSquareDashed, RefreshCw } from 'lucide-vue-next'
import { shallowRef } from 'vue'
import type { TemplateHistoryVersion, TemplateProperties } from '../../services/templateWorkbenchService'
import type {
  EditorElementProperties,
  EditorElementType,
  ElementPropertyUpdateResult,
} from '../../types/editorElement'
import ElementPropertiesPanel from './ElementPropertiesPanel.vue'
import TemplatePropertiesPanel from './TemplatePropertiesPanel.vue'

interface Props {
  templateProperties: TemplateProperties | null
  elementProperties: EditorElementProperties
  elementStatus: ElementPropertyUpdateResult
  historyVersions: readonly TemplateHistoryVersion[]
  showHistory: boolean
}

interface Emits {
  toggleHistory: []
  refreshElement: []
  selectElementType: [type: EditorElementType]
  updateElement: [patch: Partial<EditorElementProperties>]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const activeTab = shallowRef<'template' | 'element'>('template')
</script>

<template>
  <aside class="property-panel" aria-label="属性面板">
    <div class="property-panel__tabs">
      <button
        class="property-panel__tab"
        :class="{ 'property-panel__tab--active': activeTab === 'template' }"
        type="button"
        @click="activeTab = 'template'"
      >
        <FileCog :size="14" aria-hidden="true" />
        <span>模板属性</span>
      </button>
      <button
        class="property-panel__tab"
        :class="{ 'property-panel__tab--active': activeTab === 'element' }"
        type="button"
        @click="activeTab = 'element'"
      >
        <MousePointerSquareDashed :size="14" aria-hidden="true" />
        <span>元素属性</span>
      </button>
    </div>

    <div class="property-panel__header">
      <span>{{ activeTab === 'template' ? '模板属性' : '元素属性' }}</span>
      <button class="property-panel__refresh" type="button" title="更新" @click="activeTab === 'element' ? emit('refreshElement') : undefined">
        <RefreshCw :size="14" aria-hidden="true" />
      </button>
    </div>

    <TemplatePropertiesPanel
      v-if="activeTab === 'template'"
      :properties="props.templateProperties"
      :history-versions="props.historyVersions"
      :show-history="props.showHistory"
      @toggle-history="emit('toggleHistory')"
    />

    <ElementPropertiesPanel
      v-else
      :element="props.elementProperties"
      :status="props.elementStatus"
      @refresh="emit('refreshElement')"
      @select-type="emit('selectElementType', $event)"
      @update="emit('updateElement', $event)"
    />
  </aside>
</template>

<style scoped>
.property-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-left: 1px solid #c9d5df;
  background: #f8fafc;
  color: #1f2937;
}

.property-panel__tabs {
  display: grid;
  height: 40px;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #cfd9e3;
  background: #eef3f7;
}

.property-panel__tab {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-right: 1px solid #cfd9e3;
  background: transparent;
  color: #40566d;
  font-size: 13px;
}

.property-panel__tab--active {
  background: #fff;
  color: #1f4f73;
  font-weight: 700;
}

.property-panel__header {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  border-bottom: 1px solid #d9e2ea;
  background: #fff;
  font-size: 13px;
  font-weight: 700;
}

.property-panel__refresh {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  border: 1px solid #c5d0db;
  border-radius: 4px;
  background: #fff;
  color: #40566d;
}

</style>
