<script setup lang="ts">
import { FilePlus2, RefreshCw, Search } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import type { MetadataTreeNode } from '../../types/editorElement'
import { filterMetadataTree } from '../../services/metadataService'

interface Props {
  nodes: readonly MetadataTreeNode[]
  selectedId?: string
}

interface Emits {
  refresh: []
  select: [node: MetadataTreeNode]
  bind: [node: MetadataTreeNode]
  insert: [node: MetadataTreeNode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const keyword = shallowRef('')
const expandedNodeIds = shallowRef<Set<string>>(new Set(['common-elements', 'home-page-elements']))

const visibleNodes = computed(() => filterMetadataTree(props.nodes, keyword.value))

function toggleNode(node: MetadataTreeNode) {
  if (!node.children?.length) {
    return
  }

  const next = new Set(expandedNodeIds.value)
  if (next.has(node.id)) {
    next.delete(node.id)
  } else {
    next.add(node.id)
  }
  expandedNodeIds.value = next
}

function selectNode(node: MetadataTreeNode) {
  if (node.kind === 'group') {
    toggleNode(node)
    return
  }

  emit('select', node)
}
</script>

<template>
  <section class="metadata-panel" aria-label="元数据">
    <div class="metadata-panel__toolbar">
      <label class="metadata-panel__search">
        <Search :size="13" aria-hidden="true" />
        <input v-model="keyword" type="search" placeholder="搜索数据元" />
      </label>
      <button class="metadata-panel__icon-button" type="button" title="刷新元数据" @click="emit('refresh')">
        <RefreshCw :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="metadata-panel__tree">
      <div v-for="node in visibleNodes" :key="node.id" class="metadata-panel__node">
        <button
          class="metadata-panel__group"
          type="button"
          @click="selectNode(node)"
        >
          <span>{{ expandedNodeIds.has(node.id) ? '▾' : '▸' }}</span>
          <strong>{{ node.label }}</strong>
        </button>
        <div v-if="expandedNodeIds.has(node.id)" class="metadata-panel__children">
          <div
            v-for="child in node.children || []"
            :key="child.id"
            class="metadata-panel__item"
            :class="{ 'metadata-panel__item--active': child.id === props.selectedId }"
            :title="`${child.label} ${child.code}`"
          >
            <button class="metadata-panel__item-main" type="button" @click="selectNode(child)">
              <span class="metadata-panel__name">{{ child.label }}</span>
              <span class="metadata-panel__code">{{ child.code }} · {{ child.valueType }}</span>
            </button>
            <span class="metadata-panel__actions">
              <button type="button" title="绑定到当前输入域" @click.stop="emit('bind', child)">
                绑
              </button>
              <button type="button" title="插入为输入域" @click.stop="emit('insert', child)">
                <FilePlus2 :size="12" aria-hidden="true" />
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metadata-panel {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
}

.metadata-panel__toolbar {
  display: flex;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: 5px;
  padding: 7px;
  border-bottom: 1px solid #dbe4ec;
}

.metadata-panel__search {
  display: flex;
  min-width: 0;
  height: 28px;
  flex: 1;
  align-items: center;
  gap: 5px;
  padding: 0 7px;
  border: 1px solid #c8d3de;
  border-radius: 4px;
  background: #fff;
  color: #64748b;
}

.metadata-panel__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  font-size: 12px;
}

.metadata-panel__icon-button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid #c5d0db;
  border-radius: 4px;
  background: #fff;
  color: #40566d;
}

.metadata-panel__tree {
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px;
  box-sizing: border-box;
}

.metadata-panel__node {
  min-width: 0;
}

.metadata-panel__group,
.metadata-panel__item-main {
  width: 100%;
  border: 0;
  background: transparent;
  color: #26364a;
  text-align: left;
}

.metadata-panel__group {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  font-size: 12px;
}

.metadata-panel__children {
  display: grid;
  min-width: 0;
  gap: 5px;
  margin-left: 4px;
}

.metadata-panel__item {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 58px;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 5px;
  padding: 6px;
  border: 1px solid #d4dee7;
  border-radius: 4px;
  background: #fff;
}

.metadata-panel__item-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.metadata-panel__item--active,
.metadata-panel__item:hover {
  border-color: #86acc6;
  background: #eef6fa;
}

.metadata-panel__name,
.metadata-panel__code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metadata-panel__name {
  font-size: 12px;
  font-weight: 700;
}

.metadata-panel__code {
  color: #66788b;
  font-size: 11px;
}

.metadata-panel__actions {
  display: flex;
  grid-row: 1 / span 2;
  grid-column: 2;
  gap: 4px;
  align-items: center;
}

.metadata-panel__actions button {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border: 1px solid #bfd0dc;
  border-radius: 4px;
  background: #f8fbfd;
  color: #1f4f73;
  font-size: 11px;
}
</style>
