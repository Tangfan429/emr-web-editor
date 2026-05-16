import type { WriterCommandPayload } from '../types/document'
import type { WriterPrintTarget } from './writerPrint'
import {
  closeWriterPrintPreview,
  printWriterDocument,
  showWriterPrintPreview,
} from './writerPrint'

export interface WriterControlTarget extends WriterPrintTarget {
  LoadDocumentFromString?: (
    xml: string,
    format?: string,
    specifyLoadPart?: unknown,
    errorCallback?: ((result: unknown) => void) | null,
  ) => boolean | void
  SaveDocumentToString?: (options?: unknown, textOptions?: unknown) => string
  DCExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  ExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  GetCommandStatus?: (commandName: string) => unknown
  addEventListener?: HTMLElement['addEventListener']
  removeEventListener?: HTMLElement['removeEventListener']
}

export type WriterAdapterFailureReason =
  | 'writer-unavailable'
  | 'load-api-unavailable'
  | 'save-api-unavailable'
  | 'command-api-unavailable'
  | 'command-rejected'
  | 'save-empty'

export type WriterAdapterResult =
  | { ok: true }
  | { ok: false; reason: WriterAdapterFailureReason; message: string }

export type WriterSaveResult =
  | { ok: true; xml: string }
  | { ok: false; reason: WriterAdapterFailureReason; message: string }

const writerUnavailableMessage = '外部编辑器尚未加载，无法执行该操作。'

export function createWriterControlAdapter(target: WriterControlTarget | null) {
  return {
    isAvailable() {
      return target !== null
    },

    loadXml(xml: string): WriterAdapterResult {
      if (!target) {
        return writerUnavailable()
      }

      if (typeof target.LoadDocumentFromString !== 'function') {
        return {
          ok: false,
          reason: 'load-api-unavailable',
          message: '当前外部编辑器未暴露 XML 加载接口。',
        }
      }

      return normalizeWriterResult(
        target.LoadDocumentFromString(xml, 'xml', null, null),
        '编辑器未接受 XML 加载请求。',
      )
    },

    executeCommand(payload: WriterCommandPayload): WriterAdapterResult {
      if (!target) {
        return writerUnavailable()
      }

      const execute =
        payload.executor === 'legacy' ? target.ExecuteCommand : target.DCExecuteCommand

      if (typeof execute !== 'function') {
        return {
          ok: false,
          reason: 'command-api-unavailable',
          message: '当前外部编辑器未暴露命令执行接口。',
        }
      }

      return normalizeWriterResult(
        execute.call(target, payload.commandName, payload.showUI, payload.parameter ?? null),
        `编辑器未接受命令：${payload.commandName}。`,
      )
    },

    getCommandStatus(commandName: string): unknown {
      if (!target || typeof target.GetCommandStatus !== 'function') {
        return null
      }

      return target.GetCommandStatus(commandName)
    },

    saveXml(): WriterSaveResult {
      if (!target) {
        return writerUnavailable()
      }

      if (typeof target.SaveDocumentToString !== 'function') {
        return {
          ok: false,
          reason: 'save-api-unavailable',
          message: '当前外部编辑器未暴露 XML 保存接口。',
        }
      }

      const xml = target.SaveDocumentToString({ FileFormat: 'XML' })
      if (!xml) {
        return {
          ok: false,
          reason: 'save-empty',
          message: '编辑器未返回可保存的 XML 内容。',
        }
      }

      return { ok: true, xml }
    },

    print() {
      return printWriterDocument(target)
    },

    openPrintPreview() {
      return showWriterPrintPreview(target)
    },

    closePrintPreview() {
      return closeWriterPrintPreview(target)
    },
  }
}

function writerUnavailable(): WriterAdapterResult & WriterSaveResult {
  return {
    ok: false,
    reason: 'writer-unavailable',
    message: writerUnavailableMessage,
  }
}

function normalizeWriterResult(result: boolean | void, falseMessage: string): WriterAdapterResult {
  if (result === false) {
    return {
      ok: false,
      reason: 'command-rejected',
      message: falseMessage,
    }
  }

  return { ok: true }
}
