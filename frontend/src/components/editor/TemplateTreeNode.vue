<script setup lang="ts">
import { ChevronDown, ChevronRight, FilePlus, FileText, FolderPlus, Pencil, Trash2 } from 'lucide-vue-next'
import type { TemplateTreeNode } from '../../services/templateWorkbenchService'

interface Props {
  node: TemplateTreeNode
  level: number
  selectedNodeId?: string
  expandedNodeIds: Set<string>
}

interface Emits {
  toggle: [node: TemplateTreeNode]
  select: [node: TemplateTreeNode]
  createDirectory: [node: TemplateTreeNode]
  createTemplate: [node: TemplateTreeNode]
  renameNode: [node: TemplateTreeNode]
  deleteNode: [node: TemplateTreeNode]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div class="template-tree-node">
    <button
      class="template-tree-node__row"
      :class="{ 'template-tree-node__row--active': props.node.id === props.selectedNodeId }"
      :style="{ paddingLeft: `${8 + props.level * 14}px` }"
      type="button"
      :title="props.node.label"
      @click="emit('select', props.node)"
    >
      <ChevronDown
        v-if="props.node.children?.length && props.expandedNodeIds.has(props.node.id)"
        :size="14"
        aria-hidden="true"
      />
      <ChevronRight
        v-else-if="props.node.children?.length"
        :size="14"
        aria-hidden="true"
      />
      <FileText v-else :size="14" aria-hidden="true" />
      <span class="template-tree-node__label">{{ props.node.label }}</span>
      <span v-if="props.node.status" class="template-tree-node__status">{{ props.node.status }}</span>
    </button>
    <div class="template-tree-node__actions">
      <button
        v-if="props.node.kind !== 'template'"
        type="button"
        title="新建目录"
        @click.stop="emit('createDirectory', props.node)"
      >
        <FolderPlus :size="13" aria-hidden="true" />
      </button>
      <button
        v-if="props.node.kind !== 'template'"
        type="button"
        title="新建模板"
        @click.stop="emit('createTemplate', props.node)"
      >
        <FilePlus :size="13" aria-hidden="true" />
      </button>
      <button type="button" title="重命名" @click.stop="emit('renameNode', props.node)">
        <Pencil :size="13" aria-hidden="true" />
      </button>
      <button v-if="props.node.kind !== 'root'" type="button" title="删除" @click.stop="emit('deleteNode', props.node)">
        <Trash2 :size="13" aria-hidden="true" />
      </button>
    </div>

    <template v-if="props.node.children?.length && props.expandedNodeIds.has(props.node.id)">
      <TemplateTreeNode
        v-for="child in props.node.children"
        :key="child.id"
        :node="child"
        :level="props.level + 1"
        :selected-node-id="props.selectedNodeId"
        :expanded-node-ids="props.expandedNodeIds"
        @toggle="emit('toggle', $event)"
        @select="emit('select', $event)"
        @create-directory="emit('createDirectory', $event)"
        @create-template="emit('createTemplate', $event)"
        @rename-node="emit('renameNode', $event)"
        @delete-node="emit('deleteNode', $event)"
      />
    </template>
  </div>
</template>

<style scoped>
.template-tree-node__row {
  display: grid;
  width: 100%;
  min-height: 28px;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #27364a;
  text-align: left;
}

.template-tree-node__row:hover {
  border-color: #c5d6e1;
  background: #edf5f8;
}

.template-tree-node__row--active {
  border-color: #4f8b9a;
  background: #e0f2f1;
}

.template-tree-node__label {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-tree-node__status {
  color: #9a5b00;
  font-size: 11px;
  white-space: nowrap;
}

.template-tree-node__actions {
  display: flex;
  min-height: 22px;
  align-items: center;
  gap: 3px;
  margin: -2px 4px 3px 36px;
}

.template-tree-node__actions button {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #607084;
}

.template-tree-node__actions button:hover {
  border-color: #c5d6e1;
  background: #f8fafc;
  color: #1f4f73;
}
</style>
