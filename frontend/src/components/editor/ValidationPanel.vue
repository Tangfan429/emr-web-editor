<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { ValidationIssue } from '../../types/document'

interface Props {
  issues: readonly ValidationIssue[]
}

interface Emits {
  selectIssue: [issue: ValidationIssue]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <section v-if="props.issues.length > 0" class="validation-panel" aria-label="校验问题">
    <div class="validation-panel__header">
      <AlertTriangle :size="16" aria-hidden="true" />
      <span>保存前校验</span>
    </div>
    <button
      v-for="issue in props.issues"
      :key="issue.id"
      class="validation-panel__issue"
      type="button"
      @click="emit('selectIssue', issue)"
    >
      <span class="validation-panel__severity">{{ issue.severity === 'error' ? '错误' : '提示' }}</span>
      <span class="validation-panel__message">{{ issue.message }}</span>
    </button>
  </section>
</template>

<style scoped>
.validation-panel {
  display: flex;
  max-height: 138px;
  flex-direction: column;
  border-top: 1px solid #f0c36d;
  background: #fff8e6;
  color: #4b3b12;
}

.validation-panel__header {
  display: inline-flex;
  height: 32px;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 700;
}

.validation-panel__issue {
  display: grid;
  width: 100%;
  min-height: 32px;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border: 0;
  border-top: 1px solid rgba(240, 195, 109, 0.45);
  background: transparent;
  color: inherit;
  text-align: left;
}

.validation-panel__issue:hover {
  background: #ffefbd;
}

.validation-panel__severity {
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.validation-panel__message {
  min-width: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
