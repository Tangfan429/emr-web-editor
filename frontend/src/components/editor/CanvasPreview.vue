<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useCanvasRenderer } from '../../composables/useCanvasRenderer'
import type { ExternalWriterElement } from '../../composables/useCanvasRenderer'
import type { ImportedDocument } from '../../types/document'
import { getCanvasLayerStyle, getSurfaceStyle } from './canvasPreviewLayout'

interface Props {
  document: ImportedDocument | null
  zoom: number
}

interface Emits {
  modeChange: [mode: string]
  renderError: [message: string | null]
  writerReady: [writerElement: ExternalWriterElement | null]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const hostRef = useTemplateRef<HTMLDivElement>('host')
const { isRendering, renderError, mode, writerElement, renderDocument, clear } = useCanvasRenderer()

const isExternalMode = computed(() => mode.value === 'external')
const surfaceStyle = computed(() => getSurfaceStyle(mode.value, props.zoom))
const canvasLayerStyle = computed(() => getCanvasLayerStyle(mode.value, props.zoom))

watch(
  () => props.document,
  async (document) => {
    await nextTick()
    const host = hostRef.value
    if (!host) {
      return
    }

    if (!document) {
      clear(host)
      return
    }

    await renderDocument(host, document)
  },
  { immediate: true },
)

watch(mode, (value) => emit('modeChange', value), { immediate: true })
watch(renderError, (value) => emit('renderError', value), { immediate: true })
watch(writerElement, (value) => emit('writerReady', value), { immediate: true })
</script>

<template>
  <section class="preview-panel">
    <div class="preview-panel__scroll">
      <div v-if="!props.document" class="preview-panel__empty">
        <div class="preview-panel__empty-title">等待导入 XML</div>
        <div class="preview-panel__empty-text">导入后将在此区域展示 Canvas 预览。</div>
      </div>
      <div
        v-else
        class="preview-panel__surface"
        :class="{ 'preview-panel__surface--external': isExternalMode }"
        :style="surfaceStyle"
      >
        <div
          class="preview-panel__canvas-layer"
          :class="{ 'preview-panel__canvas-layer--external': isExternalMode }"
          :style="canvasLayerStyle"
        >
          <div ref="host" class="preview-panel__host" :class="{ 'preview-panel__host--external': isExternalMode }"></div>
        </div>
        <div v-if="isRendering" class="preview-panel__loading">渲染中...</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-panel {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background:
    linear-gradient(90deg, #c5dced 0 28px, transparent 28px),
    linear-gradient(180deg, #c5dced 0 24px, transparent 24px),
    #dbe5ed;
}

.preview-panel__scroll {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 34px 34px 38px 40px;
  scrollbar-gutter: stable;
}

.preview-panel__surface {
  position: relative;
  margin: 0 auto;
}

.preview-panel__surface::before {
  position: absolute;
  inset: -8px -8px auto -8px;
  height: 8px;
  border: 1px solid #a9c4d8;
  border-bottom: 0;
  background: repeating-linear-gradient(90deg, #99b9cf 0 1px, transparent 1px 24px);
  content: "";
}

.preview-panel__surface::after {
  position: absolute;
  inset: -8px auto -8px -8px;
  width: 8px;
  border: 1px solid #a9c4d8;
  border-right: 0;
  background: repeating-linear-gradient(180deg, #99b9cf 0 1px, transparent 1px 24px);
  content: "";
}

.preview-panel__canvas-layer {
  width: 795.333px;
  min-height: 1123.333px;
  transform-origin: top center;
}

.preview-panel__canvas-layer--external {
  width: max-content;
  min-width: max-content;
  transform-origin: top center;
}

.preview-panel__host {
  width: 795.333px;
  min-height: 1123.333px;
}

.preview-panel__host--external {
  width: max-content;
  min-width: max-content;
}

.preview-panel__host :deep(.preview-canvas) {
  display: block;
  background: #fff;
  outline: 1px solid #aeb8c2;
  box-shadow: 0 8px 20px rgba(31, 42, 58, 0.18);
}

.preview-panel__host :deep(.external-renderer-host) {
  width: max-content !important;
  min-width: max-content !important;
  min-height: 1123.333px;
  background: #fff;
  outline: 1px solid #aeb8c2;
  box-shadow: 0 8px 20px rgba(31, 42, 58, 0.18);
}

.preview-panel__host :deep(.external-renderer-host [dctype="page-container"]) {
  width: max-content !important;
  min-width: max-content !important;
  overflow: visible !important;
}

.preview-panel__empty {
  display: grid;
  width: min(560px, 100%);
  min-height: 320px;
  margin: 80px auto 0;
  place-items: center;
  align-content: center;
  gap: 10px;
  border: 1px dashed #8ea8bc;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #51677d;
}

.preview-panel__empty-title {
  font-size: 18px;
  font-weight: 700;
  color: #24374c;
}

.preview-panel__empty-text {
  font-size: 14px;
}

.preview-panel__loading {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 6px 10px;
  border-radius: 6px;
  background: rgba(36, 55, 76, 0.92);
  color: #fff;
  font-size: 13px;
}
</style>
