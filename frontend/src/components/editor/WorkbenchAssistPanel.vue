<script setup lang="ts">
import { Database, FileStack } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import type { FragmentTemplateTreeNode, MetadataTreeNode } from '../../types/editorElement'
import FragmentTemplatePanel from './FragmentTemplatePanel.vue'
import MetadataPanel from './MetadataPanel.vue'

interface Props {
  metadataTree: readonly MetadataTreeNode[]
  fragmentTemplateTree: readonly FragmentTemplateTreeNode[]
  selectedMetadataId?: string
  selectedFragmentId?: string
}

interface Emits {
  refreshMetadata: []
  refreshFragments: []
  selectMetadata: [node: MetadataTreeNode]
  bindMetadata: [node: MetadataTreeNode]
  insertMetadata: [node: MetadataTreeNode]
  selectFragment: [node: FragmentTemplateTreeNode]
  insertFragment: [node: FragmentTemplateTreeNode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const activeTab = shallowRef<'metadata' | 'fragment'>('metadata')

const activeTitle = computed(() => (activeTab.value === 'metadata' ? '元数据' : '片段模板'))
</script>

<template>
  <aside class="assist-panel" aria-label="编辑辅助面板">
    <div class="assist-panel__tabs">
      <button
        class="assist-panel__tab"
        :class="{ 'assist-panel__tab--active': activeTab === 'metadata' }"
        type="button"
        @click="activeTab = 'metadata'"
      >
        <Database :size="14" aria-hidden="true" />
        <span>元数据</span>
      </button>
      <button
        class="assist-panel__tab"
        :class="{ 'assist-panel__tab--active': activeTab === 'fragment' }"
        type="button"
        @click="activeTab = 'fragment'"
      >
        <FileStack :size="14" aria-hidden="true" />
        <span>片段模板</span>
      </button>
    </div>

    <div class="assist-panel__header">
      <span>{{ activeTitle }}</span>
    </div>

    <MetadataPanel
      v-if="activeTab === 'metadata'"
      :nodes="props.metadataTree"
      :selected-id="props.selectedMetadataId"
      @refresh="emit('refreshMetadata')"
      @select="emit('selectMetadata', $event)"
      @bind="emit('bindMetadata', $event)"
      @insert="emit('insertMetadata', $event)"
    />

    <FragmentTemplatePanel
      v-else
      :nodes="props.fragmentTemplateTree"
      :selected-id="props.selectedFragmentId"
      @refresh="emit('refreshFragments')"
      @select="emit('selectFragment', $event)"
      @insert="emit('insertFragment', $event)"
    />
  </aside>
</template>

<style scoped>
.assist-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  flex-direction: column;
  border-right: 1px solid #c9d5df;
  background: #f8fafc;
  color: #1f2937;
}

.assist-panel__tabs {
  display: grid;
  height: 34px;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #cfd9e3;
  background: #eef3f7;
}

.assist-panel__tab {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 0;
  border-right: 1px solid #cfd9e3;
  background: transparent;
  color: #40566d;
  font-size: 12px;
}

.assist-panel__tab--active {
  background: #fff;
  color: #1f4f73;
  font-weight: 700;
}

.assist-panel__header {
  display: flex;
  height: 36px;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px;
  border-bottom: 1px solid #d9e2ea;
  background: #ffffff;
  font-size: 13px;
  font-weight: 700;
}

</style>
