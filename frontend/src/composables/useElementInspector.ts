import { computed, readonly, shallowRef } from 'vue'
import type { ShallowRef } from 'vue'
import {
  bindMetadataToInputField,
  getCurrentMockElementProperties,
  selectMockElement,
  setCurrentElementProperties,
  updateElementProperties,
} from '../services/elementPropertyService'
import type {
  EditorElementProperties,
  EditorElementType,
  ElementPropertyUpdateResult,
  MetadataTreeNode,
} from '../types/editorElement'
import {
  readSelectedWriterElement,
  updateSelectedWriterElementProperties,
  type WriterElementTarget,
} from '../utils/writerElementAdapter'

interface UseElementInspectorOptions {
  writerTarget: Readonly<ShallowRef<WriterElementTarget | null>>
}

const initialStatus: ElementPropertyUpdateResult = {
  ok: false,
  status: 'unsupported',
  reason: 'unsupported',
  message: '当前使用前端 mock 元素属性，等待 WriterControl 暴露选择事件。',
}

export function useElementInspector(options: UseElementInspectorOptions) {
  const selectedElement = shallowRef<EditorElementProperties>(getCurrentMockElementProperties())
  const updateStatus = shallowRef<ElementPropertyUpdateResult>(initialStatus)

  const canBindMetadata = computed(() => selectedElement.value.type === 'input-field')

  function refreshFromWriter() {
    const result = readSelectedWriterElement(options.writerTarget.value)
    if (result.ok) {
      selectedElement.value = setCurrentElementProperties(result.element)
      updateStatus.value = {
        ok: true,
        status: 'success',
        message: '已读取 WriterControl 当前选中元素。',
      }
      return
    }

    updateStatus.value = toPropertyStatus(result.reason, result.message)
  }

  function selectElementType(type: EditorElementType) {
    selectedElement.value = selectMockElement(type)
    updateStatus.value = {
      ok: true,
      status: 'success',
      message: `已切换到${selectedElement.value.name}属性配置。`,
    }
  }

  function updateProperties(patch: Partial<EditorElementProperties>) {
    selectedElement.value = updateElementProperties(patch)
    updateStatus.value = updateSelectedWriterElementProperties(
      options.writerTarget.value,
      selectedElement.value,
    )
  }

  function replaceElement(element: EditorElementProperties, status?: ElementPropertyUpdateResult) {
    selectedElement.value = setCurrentElementProperties(element)
    updateStatus.value = status || updateStatus.value
  }

  function bindMetadata(metadata: MetadataTreeNode) {
    selectedElement.value = setCurrentElementProperties(
      bindMetadataToInputField(selectedElement.value, metadata),
    )
    updateStatus.value = updateSelectedWriterElementProperties(
      options.writerTarget.value,
      selectedElement.value,
    )
  }

  function setStatus(status: ElementPropertyUpdateResult) {
    updateStatus.value = status
  }

  return {
    selectedElement: readonly(selectedElement),
    updateStatus: readonly(updateStatus),
    canBindMetadata,
    refreshFromWriter,
    selectElementType,
    updateProperties,
    replaceElement,
    bindMetadata,
    setStatus,
  }
}

function toPropertyStatus(
  reason: 'writer-unavailable' | 'no-selection' | 'unsupported' | 'failed',
  message: string,
): ElementPropertyUpdateResult {
  if (reason === 'writer-unavailable') {
    return {
      ok: false,
      status: 'no-selection',
      reason: 'no-selection',
      message,
    }
  }

  return {
    ok: false,
    status: reason,
    reason,
    message,
  }
}
