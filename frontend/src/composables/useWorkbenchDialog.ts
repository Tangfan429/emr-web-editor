import { readonly, shallowRef } from 'vue'

export type WorkbenchDialogTone = 'default' | 'danger'
export type WorkbenchDialogKind = 'text' | 'confirm'

interface BaseDialogRequest {
  title: string
  message: string
  confirmText: string
  cancelText?: string
  tone?: WorkbenchDialogTone
}

export interface WorkbenchTextDialogRequest extends BaseDialogRequest {
  defaultValue?: string
  placeholder?: string
  required?: boolean
}

export type WorkbenchConfirmDialogRequest = BaseDialogRequest

export interface WorkbenchDialogState {
  open: boolean
  kind: WorkbenchDialogKind
  title: string
  message: string
  confirmText: string
  cancelText: string
  value: string
  placeholder: string
  required: boolean
  tone: WorkbenchDialogTone
  error: string
}

const closedState: WorkbenchDialogState = {
  open: false,
  kind: 'confirm',
  title: '',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  value: '',
  placeholder: '',
  required: false,
  tone: 'default',
  error: '',
}

type PendingDialog =
  | { kind: 'text'; resolve: (value: string | null) => void }
  | { kind: 'confirm'; resolve: (value: boolean) => void }

export function useWorkbenchDialog() {
  const state = shallowRef<WorkbenchDialogState>({ ...closedState })
  let pending: PendingDialog | null = null

  function requestText(request: WorkbenchTextDialogRequest) {
    closePending()
    state.value = {
      ...closedState,
      open: true,
      kind: 'text',
      title: request.title,
      message: request.message,
      confirmText: request.confirmText,
      cancelText: request.cancelText || '取消',
      value: request.defaultValue || '',
      placeholder: request.placeholder || '',
      required: request.required !== false,
      tone: request.tone || 'default',
    }

    return new Promise<string | null>((resolve) => {
      pending = { kind: 'text', resolve }
    })
  }

  function requestConfirm(request: WorkbenchConfirmDialogRequest) {
    closePending()
    state.value = {
      ...closedState,
      open: true,
      kind: 'confirm',
      title: request.title,
      message: request.message,
      confirmText: request.confirmText,
      cancelText: request.cancelText || '取消',
      tone: request.tone || 'default',
    }

    return new Promise<boolean>((resolve) => {
      pending = { kind: 'confirm', resolve }
    })
  }

  function updateValue(value: string) {
    if (!state.value.open || state.value.kind !== 'text') {
      return
    }

    state.value = {
      ...state.value,
      value,
      error: '',
    }
  }

  function confirm() {
    if (!pending || !state.value.open) {
      return
    }

    if (pending.kind === 'text') {
      const value = state.value.value.trim()
      if (state.value.required && !value) {
        state.value = {
          ...state.value,
          error: '请输入内容。',
        }
        return
      }

      pending.resolve(value)
      pending = null
      close()
      return
    }

    pending.resolve(true)
    pending = null
    close()
  }

  function cancel() {
    if (pending?.kind === 'text') {
      pending.resolve(null)
    } else if (pending?.kind === 'confirm') {
      pending.resolve(false)
    }

    pending = null
    close()
  }

  function closePending() {
    if (pending?.kind === 'text') {
      pending.resolve(null)
    } else if (pending?.kind === 'confirm') {
      pending.resolve(false)
    }
    pending = null
  }

  function close() {
    state.value = { ...closedState }
  }

  return {
    state: readonly(state),
    requestText,
    requestConfirm,
    updateValue,
    confirm,
    cancel,
  }
}
