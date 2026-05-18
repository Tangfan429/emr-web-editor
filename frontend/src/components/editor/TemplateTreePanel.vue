<script setup lang="ts">
import { FilePlus, FolderOpen, FolderPlus, Search } from 'lucide-vue-next'
import { computed, shallowRef } from 'vue'
import type { TemplateTreeNode } from '../../services/templateWorkbenchService'
import { filterTemplateTree } from '../../services/templateWorkbenchService'
import TemplateTreeNodeItem from './TemplateTreeNode.vue'

interface Props {
  nodes: readonly TemplateTreeNode[]
  categories: readonly string[]
  selectedNodeId?: string
  isLoading?: boolean
  error?: string | null
}

interface Emits {
  selectTemplate: [node: TemplateTreeNode]
  createDirectory: [parentId: string]
  createTemplate: [parentId: string]
  renameNode: [node: TemplateTreeNode]
  deleteNode: [node: TemplateTreeNode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const keyword = shallowRef('')
const selectedCategory = shallowRef('全部分类')
const expandedNodeIds = shallowRef<Set<string>>(new Set(['hospital-root', 'category-home']))

const visibleNodes = computed(() => filterTemplateTree(props.nodes, {
  category: selectedCategory.value,
  keyword: keyword.value,
}))

function toggleNode(node: TemplateTreeNode) {
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

function selectNode(node: TemplateTreeNode) {
  if (node.kind === 'template') {
    emit('selectTemplate', node)
  } else {
    toggleNode(node)
  }
}
</script>

<template>
  <aside class="template-tree" aria-label="模板列表">
    <div class="template-tree__header">
      <div class="template-tree__title">
        <FolderOpen :size="16" aria-hidden="true" />
        <span>模板列表</span>
      </div>
      <button
        class="template-tree__more"
        type="button"
        title="新建目录"
        @click="emit('createDirectory', 'hospital-root')"
      >
        <FolderPlus :size="16" aria-hidden="true" />
      </button>
      <button
        class="template-tree__more"
        type="button"
        title="新建模板"
        @click="emit('createTemplate', 'hospital-root')"
      >
        <FilePlus :size="16" aria-hidden="true" />
      </button>
    </div>

    <div class="template-tree__filters">
      <select v-model="selectedCategory" class="template-tree__select" aria-label="分类筛选">
        <option v-for="category in props.categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      <label class="template-tree__search">
        <Search :size="14" aria-hidden="true" />
        <input v-model="keyword" type="search" placeholder="搜索模板" />
      </label>
    </div>

    <p v-if="props.error" class="template-tree__message template-tree__message--error">{{ props.error }}</p>
    <p v-else-if="props.isLoading" class="template-tree__message">模板加载中...</p>

    <div class="template-tree__body">
      <template v-for="node in visibleNodes" :key="node.id">
        <TemplateTreeNodeItem
          :node="node"
          :level="0"
          :selected-node-id="props.selectedNodeId"
          :expanded-node-ids="expandedNodeIds"
          @toggle="toggleNode"
          @select="selectNode"
          @create-directory="emit('createDirectory', $event.id)"
          @create-template="emit('createTemplate', $event.id)"
          @rename-node="emit('renameNode', $event)"
          @delete-node="emit('deleteNode', $event)"
        />
      </template>
    </div>
  </aside>
</template>

<style scoped>
.template-tree {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #c9d5df;
  background: #f8fafc;
  color: #1f2937;
}

.template-tree__header {
  display: flex;
  height: 42px;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  border-bottom: 1px solid #d7e0e8;
  background: #ffffff;
}

.template-tree__title {
  display: inline-flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
}

.template-tree__more {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 1px solid #c2cfda;
  border-radius: 4px;
  background: #fff;
  color: #3f5368;
}

.template-tree__filters {
  display: grid;
  gap: 7px;
  padding: 8px;
  border-bottom: 1px solid #dbe4ec;
  background: #f2f6f9;
}

.template-tree__select,
.template-tree__search {
  width: 100%;
  height: 30px;
  border: 1px solid #c8d3de;
  border-radius: 4px;
  background: #fff;
}

.template-tree__select {
  padding: 0 8px;
  color: #26364a;
}

.template-tree__search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  color: #64748b;
}

.template-tree__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  color: #1f2937;
}

.template-tree__message {
  margin: 10px 12px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.template-tree__message--error {
  color: #b42318;
}

.template-tree__body {
  min-height: 0;
  overflow: auto;
  padding: 5px 4px 12px;
}

</style>
