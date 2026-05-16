<script setup lang="ts">
import type { SaveState } from '../../types/document'

interface Props {
  fileName?: string
  saveState: SaveState
  renderMode: string
  zoom: number
  validationCount: number
  isPrintPreviewing: boolean
}

const props = defineProps<Props>()

const saveStateText: Record<SaveState, string> = {
  idle: '未打开文档',
  dirty: '未保存',
  saving: '保存中',
  saved: '已保存',
  failed: '保存失败',
}
</script>

<template>
  <footer class="status-bar">
    <span class="status-bar__item">{{ props.fileName || '未打开文档' }}</span>
    <span class="status-bar__item">{{ saveStateText[props.saveState] }}</span>
    <span class="status-bar__item">渲染：{{ props.renderMode }}</span>
    <span class="status-bar__item">校验：{{ props.validationCount }} 项</span>
    <span class="status-bar__item">{{ props.isPrintPreviewing ? '打印预览中' : '编辑模式' }}</span>
    <span class="status-bar__item status-bar__item--right">缩放：{{ Math.round(props.zoom * 100) }}%</span>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  height: 26px;
  min-width: 0;
  align-items: center;
  gap: 16px;
  padding: 0 14px;
  border-top: 1px solid #cdd6df;
  background: #ffffff;
  color: #334155;
  font-size: 12px;
}

.status-bar__item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  overflow: hidden;
  line-height: 26px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-bar__item--right {
  margin-left: auto;
}

@media (max-width: 760px) {
  .status-bar {
    gap: 8px;
    overflow-x: auto;
  }
}
</style>
