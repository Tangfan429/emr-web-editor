import { readonly, shallowRef } from 'vue'
import type { ImportedDocument, RendererStatus } from '../types/document'

interface ExternalWriterElement extends HTMLElement {
  DocumentOptions?: {
    ViewOptions?: {
      ShowHeaderBottomLine?: boolean
    }
  }
  LoadDocumentFromString?: (
    content: string,
    format: string,
    options: unknown,
    callback?: (result: unknown) => void,
  ) => boolean
  RefreshDocument?: () => void
  EditorRefreshView?: () => void
  UpdateDocumentView?: () => void
}

declare global {
  interface Window {
    CreateWriterControlForWASM?: (element: HTMLElement) => void
    [key: string]: unknown
    __medicalRecordRendererLoading?: Promise<void>
  }
}

export type RendererMode = 'external' | 'preview'

export function useCanvasRenderer() {
  const isRendering = shallowRef(false)
  const renderError = shallowRef<string | null>(null)
  const mode = shallowRef<RendererMode>('preview')

  async function renderDocument(container: HTMLElement, document: ImportedDocument) {
    isRendering.value = true
    renderError.value = null
    container.replaceChildren()

    try {
      const status = await getRendererStatus()
      if (status.ready) {
        const rendered = await tryExternalRenderer(container, document)
        if (rendered) {
          mode.value = 'external'
          return
        }
      } else if (status.missingAssets.length > 0) {
        renderError.value = `渲染资源不完整：${status.missingAssets.join(', ')}。`
      }

      mode.value = 'preview'
      container.replaceChildren()
      renderPreviewCanvas(container, document)
    } catch (error) {
      mode.value = 'preview'
      container.replaceChildren()
      renderPreviewCanvas(container, document)
      renderError.value = error instanceof Error ? error.message : '渲染资源加载失败，已切换到预览模式。'
    } finally {
      isRendering.value = false
    }
  }

  function clear(container: HTMLElement | null) {
    container?.replaceChildren()
    renderError.value = null
  }

  return {
    isRendering: readonly(isRendering),
    renderError: readonly(renderError),
    mode: readonly(mode),
    renderDocument,
    clear,
  }
}

async function getRendererStatus(): Promise<RendererStatus> {
  const response = await fetch('/api/renderer/status')
  if (!response.ok) {
    throw new Error('无法读取渲染资源状态。')
  }

  return (await response.json()) as RendererStatus
}

async function tryExternalRenderer(container: HTMLElement, importedDocument: ImportedDocument): Promise<boolean> {
  await loadExternalBootstrap()
  await waitForExternalStart()

  const editorElement = document.createElement('div') as ExternalWriterElement
  editorElement.id = `writer-host-${crypto.randomUUID()}`
  editorElement.setAttribute('dctype', 'WriterControlForWASM')
  editorElement.setAttribute('RuleVisible', 'false')
  editorElement.setAttribute('AllowDrop', 'false')
  editorElement.setAttribute('autoCreateControl', 'false')
  editorElement.setAttribute('DocumentOptions.ViewOptions.ShowPageBreak', 'true')
  editorElement.setAttribute('DocumentOptions.BehaviorOptions.OutputFormatedXMLSource', 'false')
  editorElement.setAttribute('DocumentOptions.BehaviorOptions.ParagraphFlagFollowTableOrSection', 'true')
  editorElement.setAttribute('DocumentOptions.ViewOptions.ShowLineNumber', 'false')
  editorElement.setAttribute('DocumentOptions.ViewOptions.ShowHeaderBottomLine', 'false')
  editorElement.setAttribute('DocumentOptions.ViewOptions.ShowInputFieldStateTag', 'true')
  editorElement.setAttribute('DocumentOptions.ViewOptions.IgnoreFieldBorderWhenPrint', 'false')
  editorElement.setAttribute('DocumentOptions.ViewOptions.PrintBackgroundText', 'false')
  editorElement.setAttribute('DocumentOptions.ViewOptions.PreserveBackgroundTextWhenPrint', 'true')
  editorElement.setAttribute('DocumentOptions.ViewOptions.FieldBorderPrintVisibility', 'hidden')
  editorElement.setAttribute('DocumentOptions.BehaviorOptions.Readonly', 'true')
  editorElement.className = 'external-renderer-host'
  container.appendChild(editorElement)

  if (!window.CreateWriterControlForWASM) {
    container.replaceChildren()
    return false
  }

  window.CreateWriterControlForWASM(editorElement)
  await waitForWriterApi(editorElement)
  hideHeaderBottomLine(editorElement)

  if (!editorElement.LoadDocumentFromString) {
    container.replaceChildren()
    return false
  }

  let hasLoadError = false
  const loadResult = editorElement.LoadDocumentFromString(importedDocument.xml, 'xml', null, () => {
    hasLoadError = true
  })

  if (loadResult === false || hasLoadError) {
    container.replaceChildren()
    return false
  }

  hideHeaderBottomLine(editorElement)
  editorElement.RefreshDocument?.()
  editorElement.EditorRefreshView?.()
  editorElement.UpdateDocumentView?.()

  const canvasReady = await waitForExternalCanvas(editorElement)
  if (!canvasReady) {
    container.replaceChildren()
    return false
  }

  return true
}

function hideHeaderBottomLine(editorElement: ExternalWriterElement) {
  if (editorElement.DocumentOptions?.ViewOptions) {
    editorElement.DocumentOptions.ViewOptions.ShowHeaderBottomLine = false
  }
}

async function loadExternalBootstrap() {
  if (window.__medicalRecordRendererLoading) {
    return window.__medicalRecordRendererLoading
  }

  window.__medicalRecordRendererLoading = new Promise<void>((resolve, reject) => {
    if (window.CreateWriterControlForWASM) {
      resolve()
      return
    }

    const script = document.createElement('script')
    const bootstrapFileName = ['d', 'c', 'writer5.js'].join('')
    script.src = `/renderer/_framework/${bootstrapFileName}`
    script.async = true
    script.onload = () => {
      waitForExternalStart().then(resolve)
    }
    script.onerror = () => reject(new Error('无法加载现有渲染入口，已切换到预览模式。'))
    document.head.appendChild(script)
  })

  return window.__medicalRecordRendererLoading
}

function waitForExternalStart(): Promise<void> {
  return new Promise((resolve) => {
    if (isExternalRendererReady()) {
      resolve()
      return
    }

    const callbackName = ['D', 'C', 'Writer5Started'].join('')
    const previous = window[callbackName]
    window[callbackName] = () => {
      if (typeof previous === 'function') {
        previous()
      }
      waitUntil(isExternalRendererReady, 12000).then(resolve)
    }

    waitUntil(isExternalRendererReady, 12000).then(resolve)
  })
}

function isExternalRendererReady() {
  const fullLoadedFlagName = ['__', 'D', 'C', 'Writer5FullLoaded'].join('')
  return typeof window.CreateWriterControlForWASM === 'function' && window[fullLoadedFlagName] === true
}

function waitForWriterApi(editorElement: ExternalWriterElement): Promise<void> {
  return waitUntil(
    () => typeof editorElement.LoadDocumentFromString === 'function',
    8000,
  )
}

async function waitForExternalCanvas(editorElement: ExternalWriterElement): Promise<boolean> {
  await waitUntil(
    () => editorElement.querySelector('canvas[dctype="page"], canvas') !== null,
    8000,
  )
  return editorElement.querySelector('canvas[dctype="page"], canvas') !== null
}

function waitUntil(predicate: () => boolean, timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    const startedAt = performance.now()

    function tick() {
      if (predicate() || performance.now() - startedAt >= timeoutMs) {
        resolve()
        return
      }

      window.setTimeout(tick, 80)
    }

    tick()
  })
}

function renderPreviewCanvas(container: HTMLElement, importedDocument: ImportedDocument) {
  const canvas = document.createElement('canvas')
  const pageWidth = 794
  const pageHeight = 1123
  const ratio = window.devicePixelRatio || 1
  canvas.width = pageWidth * ratio
  canvas.height = pageHeight * ratio
  canvas.style.width = `${pageWidth}px`
  canvas.style.height = `${pageHeight}px`
  canvas.className = 'preview-canvas'

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器不支持 Canvas。')
  }

  context.scale(ratio, ratio)
  drawPage(context, pageWidth, pageHeight, importedDocument)
  container.appendChild(canvas)
}

function drawPage(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  importedDocument: ImportedDocument,
) {
  const text = extractReadableText(importedDocument.xml)
  const lines = wrapText(context, text, 640)

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.strokeStyle = '#d9dee7'
  context.lineWidth = 1
  context.strokeRect(0.5, 0.5, width - 1, height - 1)

  context.fillStyle = '#1d2838'
  context.font = '700 28px "Microsoft YaHei UI", sans-serif'
  context.textAlign = 'center'
  context.fillText('入院记录', width / 2, 86)

  context.fillStyle = '#58667a'
  context.font = '14px "Microsoft YaHei UI", sans-serif'
  context.fillText(importedDocument.fileName, width / 2, 116)

  context.strokeStyle = '#2f6c8f'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(86, 144)
  context.lineTo(width - 86, 144)
  context.stroke()

  context.textAlign = 'left'
  context.fillStyle = '#1e2937'
  context.font = '16px "Microsoft YaHei UI", sans-serif'

  let y = 184
  const lineHeight = 30
  for (const line of lines.slice(0, 27)) {
    context.fillText(line, 92, y)
    y += lineHeight
  }

  context.fillStyle = '#6f7d90'
  context.font = '13px "Microsoft YaHei UI", sans-serif'
  context.fillText('Canvas 预览模式', 92, height - 60)
  context.textAlign = 'right'
  context.fillText(`文档会话 ${importedDocument.id.slice(0, 8)}`, width - 92, height - 60)
}

function extractReadableText(xml: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'application/xml')
  const values: string[] = []
  const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_TEXT)

  while (values.join('').length < 1400) {
    const node = walker.nextNode()
    if (!node) {
      break
    }

    const value = node.textContent?.replace(/\s+/g, ' ').trim()
    if (value && isReadablePreviewText(value)) {
      values.push(value)
    }
  }

  const text = values.join(' ').trim()
  return text || '文档内容已导入，等待完整渲染资源完成版式还原。'
}

function isReadablePreviewText(value: string) {
  if (value.length > 160 && /^[A-Za-z0-9+/=]+$/.test(value)) {
    return false
  }

  if (/base64|data:image|^[A-Za-z0-9+/=]{80,}$/i.test(value)) {
    return false
  }

  return true
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  context.font = '16px "Microsoft YaHei UI", sans-serif'
  const result: string[] = []
  let current = ''

  for (const char of text) {
    const next = current + char
    if (context.measureText(next).width > maxWidth && current.length > 0) {
      result.push(current)
      current = char
    } else {
      current = next
    }
  }

  if (current) {
    result.push(current)
  }

  return result
}
