export type WriterPrintRange = 'AllPages' | 'CurrentPage'

export interface WriterPrintOptions {
  PrintRange: WriterPrintRange
}

export interface WriterPrintTarget {
  PrintDocument?: (options: WriterPrintOptions) => boolean | void
  Print?: (options: WriterPrintOptions) => boolean | void
  LoadPrintPreview?: (options: WriterPrintOptions) => boolean | void
  ClosePrintPreview?: () => boolean | void
  IsPrintPreview?: () => boolean
}

export type WriterPrintFailureReason =
  | 'external-renderer-unavailable'
  | 'print-api-unavailable'
  | 'print-preview-api-unavailable'
  | 'close-preview-api-unavailable'
  | 'api-returned-false'

export type WriterPrintResult =
  | { ok: true }
  | {
      ok: false
      reason: WriterPrintFailureReason
      message: string
    }

const defaultPrintOptions: WriterPrintOptions = {
  PrintRange: 'AllPages',
}

export function printWriterDocument(
  target: WriterPrintTarget | null,
  options: WriterPrintOptions = defaultPrintOptions,
): WriterPrintResult {
  if (!target) {
    return unavailableExternalRenderer()
  }

  const print = target.PrintDocument || target.Print
  if (typeof print !== 'function') {
    return {
      ok: false,
      reason: 'print-api-unavailable',
      message: '当前外部渲染控件未暴露打印接口。',
    }
  }

  return normalizeWriterApiResult(print.call(target, options), '打印操作未被外部渲染控件接受。')
}

export function showWriterPrintPreview(
  target: WriterPrintTarget | null,
  options: WriterPrintOptions = defaultPrintOptions,
): WriterPrintResult {
  if (!target) {
    return unavailableExternalRenderer()
  }

  if (typeof target.LoadPrintPreview !== 'function') {
    return {
      ok: false,
      reason: 'print-preview-api-unavailable',
      message: '当前外部渲染控件未暴露打印预览接口。',
    }
  }

  return normalizeWriterApiResult(target.LoadPrintPreview(options), '打印预览未被外部渲染控件接受。')
}

export function closeWriterPrintPreview(target: WriterPrintTarget | null): WriterPrintResult {
  if (!target) {
    return unavailableExternalRenderer()
  }

  if (typeof target.ClosePrintPreview !== 'function') {
    return {
      ok: false,
      reason: 'close-preview-api-unavailable',
      message: '当前外部渲染控件未暴露关闭打印预览接口。',
    }
  }

  return normalizeWriterApiResult(target.ClosePrintPreview(), '关闭打印预览未被外部渲染控件接受。')
}

function unavailableExternalRenderer(): WriterPrintResult {
  return {
    ok: false,
    reason: 'external-renderer-unavailable',
    message: '当前为简易预览，需外部渲染加载成功后才能高保真打印。',
  }
}

function normalizeWriterApiResult(result: boolean | void, falseMessage: string): WriterPrintResult {
  if (result === false) {
    return {
      ok: false,
      reason: 'api-returned-false',
      message: falseMessage,
    }
  }

  return { ok: true }
}
