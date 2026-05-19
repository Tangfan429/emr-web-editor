<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
import type { WorkbenchDialogState } from '../../composables/useWorkbenchDialog'

interface Props {
  state: WorkbenchDialogState
}

interface Emits {
  updateValue: [value: string]
  confirm: []
  cancel: []
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <Teleport to="body">
    <div v-if="props.state.open" class="workbench-dialog" role="dialog" aria-modal="true">
      <div class="workbench-dialog__panel">
        <header class="workbench-dialog__header">
          <AlertTriangle
            v-if="props.state.tone === 'danger'"
            :size="17"
            aria-hidden="true"
          />
          <h2>{{ props.state.title }}</h2>
        </header>

        <p class="workbench-dialog__message">{{ props.state.message }}</p>

        <label v-if="props.state.kind === 'text'" class="workbench-dialog__field">
          <input
            :value="props.state.value"
            :placeholder="props.state.placeholder"
            autofocus
            @input="emit('updateValue', ($event.target as HTMLInputElement).value)"
            @keyup.enter="emit('confirm')"
            @keyup.esc="emit('cancel')"
          />
        </label>

        <p v-if="props.state.error" class="workbench-dialog__error">{{ props.state.error }}</p>

        <footer class="workbench-dialog__actions">
          <button class="workbench-dialog__button" type="button" @click="emit('cancel')">
            {{ props.state.cancelText }}
          </button>
          <button
            class="workbench-dialog__button workbench-dialog__button--primary"
            :class="{ 'workbench-dialog__button--danger': props.state.tone === 'danger' }"
            type="button"
            @click="emit('confirm')"
          >
            {{ props.state.confirmText }}
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.workbench-dialog {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.36);
}

.workbench-dialog__panel {
  display: grid;
  width: min(420px, calc(100vw - 32px));
  gap: 12px;
  padding: 16px;
  border: 1px solid #bcc9d6;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.2);
}

.workbench-dialog__header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
}

.workbench-dialog__header h2 {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0;
}

.workbench-dialog__message,
.workbench-dialog__error {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
}

.workbench-dialog__message {
  color: #4b5f73;
}

.workbench-dialog__error {
  color: #a61b1b;
}

.workbench-dialog__field input {
  width: 100%;
  height: 32px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid #c6d1dc;
  border-radius: 4px;
  color: #1f2937;
}

.workbench-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.workbench-dialog__button {
  min-width: 72px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #c3ced9;
  border-radius: 4px;
  background: #fff;
  color: #334155;
}

.workbench-dialog__button--primary {
  border-color: #37759b;
  background: #37759b;
  color: #fff;
}

.workbench-dialog__button--danger {
  border-color: #b42318;
  background: #b42318;
}
</style>
