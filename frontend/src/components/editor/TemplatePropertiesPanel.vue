<script setup lang="ts">
import type { TemplateHistoryVersion, TemplateProperties } from '../../services/templateWorkbenchService'

interface Props {
  properties: TemplateProperties | null
  historyVersions: readonly TemplateHistoryVersion[]
  showHistory: boolean
}

interface Emits {
  toggleHistory: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <dl v-if="props.properties" class="template-properties">
    <div class="template-properties__row">
      <dt>名称</dt>
      <dd>{{ props.properties.name }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>分类</dt>
      <dd>{{ props.properties.category }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>文件</dt>
      <dd>{{ props.properties.fileName }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>状态</dt>
      <dd>{{ props.properties.status }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>未保存</dt>
      <dd>{{ props.properties.isDirty ? '是' : '否' }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>版本</dt>
      <dd>{{ props.properties.version }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>更新时间</dt>
      <dd>{{ props.properties.updatedAt }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>来源</dt>
      <dd>{{ props.properties.source }}</dd>
    </div>
    <div class="template-properties__row">
      <dt>上传说明</dt>
      <dd>{{ props.properties.uploadMessage }}</dd>
    </div>
    <button class="template-properties__history-button" type="button" @click="emit('toggleHistory')">
      {{ props.showHistory ? '收起历史版本' : '查看历史版本' }}
    </button>
    <div v-if="props.showHistory" class="template-properties__history">
      <div v-for="version in props.historyVersions" :key="version.id" class="template-properties__history-item">
        <strong>{{ version.version }}</strong>
        <span>{{ version.savedAt }}</span>
        <small>{{ version.note }}</small>
      </div>
    </div>
  </dl>

  <p v-else class="template-properties__empty">请选择模板查看属性。</p>
</template>

<style scoped>
.template-properties {
  min-height: 0;
  margin: 0;
  overflow: auto;
  padding: 9px;
}

.template-properties__row {
  display: grid;
  min-height: 34px;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  border-bottom: 1px solid #e0e7ee;
  font-size: 12px;
}

.template-properties__row dt {
  color: #607084;
}

.template-properties__row dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-properties__history-button {
  width: 100%;
  height: 30px;
  margin-top: 10px;
  border: 1px solid #b9cad6;
  border-radius: 4px;
  background: #ffffff;
  color: #1f4f73;
  font-size: 12px;
}

.template-properties__history {
  display: grid;
  gap: 7px;
  margin-top: 8px;
}

.template-properties__history-item {
  display: grid;
  gap: 3px;
  padding: 8px;
  border: 1px solid #d9e2ea;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
}

.template-properties__history-item strong {
  color: #1f4f73;
}

.template-properties__history-item span,
.template-properties__history-item small,
.template-properties__empty {
  color: #607084;
}

.template-properties__empty {
  margin: 12px;
  font-size: 12px;
}
</style>
