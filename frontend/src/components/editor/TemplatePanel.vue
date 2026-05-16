<script setup lang="ts">
import { FileUp, FolderOpen } from 'lucide-vue-next'
import type { TemplateSummary } from '../../types/document'

interface Props {
  templates: TemplateSummary[]
  selectedTemplateId?: string
  isLoading?: boolean
  error?: string | null
}

interface Emits {
  importFile: [file: File]
  selectTemplate: [id: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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
  <aside class="template-panel" aria-label="模板列表">
    <div class="template-panel__header">
      <div class="template-panel__title">
        <FolderOpen :size="17" aria-hidden="true" />
        <span>模板</span>
      </div>
      <label class="template-panel__import" title="导入本地 XML">
        <FileUp :size="16" aria-hidden="true" />
        <input
          class="template-panel__input"
          type="file"
          accept=".xml,text/xml,application/xml"
          @change="handleFileChange"
        />
      </label>
    </div>

    <p v-if="props.error" class="template-panel__message template-panel__message--error">
      {{ props.error }}
    </p>
    <p v-else-if="props.isLoading" class="template-panel__message">模板加载中...</p>

    <div class="template-panel__list">
      <button
        v-for="template in props.templates"
        :key="template.id"
        class="template-panel__item"
        :class="{ 'template-panel__item--active': template.id === props.selectedTemplateId }"
        type="button"
        :title="template.fileName"
        @click="emit('selectTemplate', template.id)"
      >
        <span class="template-panel__item-name">{{ template.name }}</span>
        <span class="template-panel__item-meta">{{ template.category }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.template-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #cdd6df;
  background: #f8fafc;
  color: #1f2937;
}

.template-panel__header {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #d7e0e8;
  background: #ffffff;
}

.template-panel__title {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
}

.template-panel__import {
  position: relative;
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 1px solid #bcc8d4;
  border-radius: 4px;
  background: #fff;
  color: #285e61;
  cursor: pointer;
}

.template-panel__import:hover {
  border-color: #568c8f;
  background: #e9f5f2;
}

.template-panel__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.template-panel__message {
  margin: 10px 12px 0;
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.template-panel__message--error {
  color: #b42318;
}

.template-panel__list {
  min-height: 0;
  overflow: auto;
  padding: 8px;
}

.template-panel__item {
  display: flex;
  width: 100%;
  min-height: 52px;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  margin: 0 0 6px;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #263241;
  text-align: left;
}

.template-panel__item:hover {
  border-color: #b7c9d6;
  background: #eef5f8;
}

.template-panel__item--active {
  border-color: #2f7d80;
  background: #e0f2ee;
}

.template-panel__item-name {
  max-width: 100%;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-panel__item-meta {
  max-width: 100%;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
