<script setup lang="ts">
import { FileInput, RefreshCw, Search } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import type { FragmentTemplateTreeNode } from '../../types/editorElement'
import { filterFragmentTemplateTree } from '../../services/fragmentTemplateService'

interface Props {
  nodes: readonly FragmentTemplateTreeNode[]
  selectedId?: string
}

interface Emits {
  refresh: []
  select: [node: FragmentTemplateTreeNode]
  insert: [node: FragmentTemplateTreeNode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const keyword = shallowRef('')
const expandedNodeIds = shallowRef<Set<string>>(new Set(['fragment-inpatient', 'fragment-operation']))

const visibleNodes = computed(() => filterFragmentTemplateTree(props.nodes, keyword.value))

function toggleNode(node: FragmentTemplateTreeNode) {
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

function selectNode(node: FragmentTemplateTreeNode) {
  if (node.kind === 'group') {
    toggleNode(node)
    return
  }

  emit('select', node)
}
</script>

<template>
  <section class="fragment-panel" aria-label="片段模板">
    <div class="fragment-panel__toolbar">
      <label class="fragment-panel__search">
        <Search :size="13" aria-hidden="true" />
        <input v-model="keyword" type="search" placeholder="搜索片段" />
      </label>
      <button class="fragment-panel__icon-button" type="button" title="刷新片段模板" @click="emit('refresh')">
        <RefreshCw :size="14" aria-hidden="true" />
      </button>
    </div>

    <div class="fragment-panel__tree">
      <div v-for="node in visibleNodes" :key="node.id">
        <button class="fragment-panel__group" type="button" @click="selectNode(node)">
          <span>{{ expandedNodeIds.has(node.id) ? '▾' : '▸' }}</span>
          <strong>{{ node.label }}</strong>
        </button>
        <div v-if="expandedNodeIds.has(node.id)" class="fragment-panel__children">
          <div
            v-for="child in node.children || []"
            :key="child.id"
            class="fragment-panel__item"
            :class="{ 'fragment-panel__item--active': child.id === props.selectedId }"
            :title="child.description || child.label"
          >
            <button class="fragment-panel__item-main" type="button" @click="selectNode(child)">
              <span class="fragment-panel__name">{{ child.label }}</span>
              <span class="fragment-panel__meta">{{ child.category }}</span>
            </button>
            <button
              class="fragment-panel__insert-button"
              type="button"
              title="插入片段模板"
              @click.stop="emit('insert', child)"
            >
              <FileInput :size="13" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.fragment-panel {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
}

.fragment-panel__toolbar {
  display: flex;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  gap: 5px;
  padding: 7px;
  border-bottom: 1px solid #dbe4ec;
}

.fragment-panel__search {
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

.fragment-panel__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  font-size: 12px;
}

.fragment-panel__icon-button {
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

.fragment-panel__tree {
  width: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px;
  box-sizing: border-box;
}

.fragment-panel__group,
.fragment-panel__item-main {
  width: 100%;
  border: 0;
  background: transparent;
  color: #26364a;
  text-align: left;
}

.fragment-panel__group {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  font-size: 12px;
}

.fragment-panel__children {
  display: grid;
  min-width: 0;
  gap: 5px;
  margin-left: 4px;
}

.fragment-panel__item {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 52px;
  box-sizing: border-box;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 6px;
  padding: 6px;
  border: 1px solid #d4dee7;
  border-radius: 4px;
  background: #fff;
}

.fragment-panel__item-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.fragment-panel__item--active,
.fragment-panel__item:hover {
  border-color: #86acc6;
  background: #eef6fa;
}

.fragment-panel__name,
.fragment-panel__meta {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fragment-panel__name {
  font-size: 12px;
  font-weight: 700;
}

.fragment-panel__meta {
  color: #66788b;
  font-size: 11px;
}

.fragment-panel__insert-button {
  display: inline-flex;
  grid-row: 1 / span 2;
  grid-column: 2;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  align-self: center;
  border: 1px solid #bfd0dc;
  border-radius: 4px;
  background: #f8fbfd;
  color: #1f4f73;
}
</style>
