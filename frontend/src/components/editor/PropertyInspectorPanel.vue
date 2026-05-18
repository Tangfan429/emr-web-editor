<script setup lang="ts">
import { FileCog, MousePointerSquareDashed, RefreshCw } from 'lucide-vue-next'
import { shallowRef } from 'vue'
import type {
  ElementProperties,
  TemplateHistoryVersion,
  TemplateProperties,
} from '../../services/templateWorkbenchService'

interface Props {
  templateProperties: TemplateProperties | null
  elementProperties: ElementProperties | null
  historyVersions: readonly TemplateHistoryVersion[]
  showHistory: boolean
}

interface Emits {
  toggleHistory: []
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
      <button class="property-panel__refresh" type="button" title="更新">
        <RefreshCw :size="14" aria-hidden="true" />
      </button>
    </div>

    <dl v-if="activeTab === 'template' && props.templateProperties" class="property-panel__list">
      <div class="property-panel__row">
        <dt>名称</dt>
        <dd>{{ props.templateProperties.name }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>分类</dt>
        <dd>{{ props.templateProperties.category }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>文件</dt>
        <dd>{{ props.templateProperties.fileName }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>状态</dt>
        <dd>{{ props.templateProperties.status }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>未保存</dt>
        <dd>{{ props.templateProperties.isDirty ? '是' : '否' }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>版本</dt>
        <dd>{{ props.templateProperties.version }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>更新时间</dt>
        <dd>{{ props.templateProperties.updatedAt }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>来源</dt>
        <dd>{{ props.templateProperties.source }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>上传说明</dt>
        <dd>{{ props.templateProperties.uploadMessage }}</dd>
      </div>
      <button class="property-panel__history-button" type="button" @click="emit('toggleHistory')">
        {{ props.showHistory ? '收起历史版本' : '查看历史版本' }}
      </button>
      <div v-if="props.showHistory" class="property-panel__history">
        <div v-for="version in props.historyVersions" :key="version.id" class="property-panel__history-item">
          <strong>{{ version.version }}</strong>
          <span>{{ version.savedAt }}</span>
          <small>{{ version.note }}</small>
        </div>
      </div>
    </dl>

    <dl v-else-if="props.elementProperties" class="property-panel__list">
      <div class="property-panel__row">
        <dt>名称</dt>
        <dd>{{ props.elementProperties.name }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>类型</dt>
        <dd>{{ props.elementProperties.type }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>绑定路径</dt>
        <dd>{{ props.elementProperties.bindingPath }}</dd>
      </div>
      <div class="property-panel__row">
        <dt>只读</dt>
        <dd>{{ props.elementProperties.readonly ? '是' : '否' }}</dd>
      </div>
    </dl>
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

.property-panel__list {
  min-height: 0;
  margin: 0;
  overflow: auto;
  padding: 9px;
}

.property-panel__row {
  display: grid;
  min-height: 34px;
  grid-template-columns: 74px minmax(0, 1fr);
  align-items: center;
  border-bottom: 1px solid #e0e7ee;
  font-size: 12px;
}

.property-panel__row dt {
  color: #607084;
}

.property-panel__row dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.property-panel__history-button {
  width: 100%;
  height: 30px;
  margin-top: 10px;
  border: 1px solid #b9cad6;
  border-radius: 4px;
  background: #ffffff;
  color: #1f4f73;
  font-size: 12px;
}

.property-panel__history {
  display: grid;
  gap: 7px;
  margin-top: 8px;
}

.property-panel__history-item {
  display: grid;
  gap: 3px;
  padding: 8px;
  border: 1px solid #d9e2ea;
  border-radius: 4px;
  background: #fff;
  font-size: 12px;
}

.property-panel__history-item strong {
  color: #1f4f73;
}

.property-panel__history-item span,
.property-panel__history-item small {
  color: #607084;
}
</style>
