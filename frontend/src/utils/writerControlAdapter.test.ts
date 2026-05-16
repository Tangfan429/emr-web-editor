import { describe, expect, it, vi } from 'vitest'
import { createWriterControlAdapter, type WriterControlTarget } from './writerControlAdapter'

describe('writerControlAdapter', () => {
  it('reports unavailable writer when saving before the external editor is loaded', () => {
    const adapter = createWriterControlAdapter(null)

    expect(adapter.isAvailable()).toBe(false)
    expect(adapter.saveXml()).toEqual({
      ok: false,
      reason: 'writer-unavailable',
      message: '外部编辑器尚未加载，无法执行该操作。',
    })
  })

  it('loads XML through LoadDocumentFromString', () => {
    const target: WriterControlTarget = {
      LoadDocumentFromString: vi.fn(() => true),
    }

    expect(createWriterControlAdapter(target).loadXml('<document />')).toEqual({ ok: true })
    expect(target.LoadDocumentFromString).toHaveBeenCalledWith('<document />', 'xml', null, undefined)
  })

  it('reports unavailable load API when LoadDocumentFromString is missing', () => {
    expect(createWriterControlAdapter({}).loadXml('<document />')).toEqual({
      ok: false,
      reason: 'load-api-unavailable',
      message: '当前外部编辑器未暴露 XML 加载接口。',
    })
  })

  it('normalizes rejected XML load requests', () => {
    const target: WriterControlTarget = {
      LoadDocumentFromString: vi.fn(() => false),
    }

    expect(createWriterControlAdapter(target).loadXml('<document />')).toEqual({
      ok: false,
      reason: 'command-rejected',
      message: '编辑器未接受 XML 加载请求。',
    })
  })

  it('executes commands through DCExecuteCommand by default', () => {
    const target: WriterControlTarget = {
      DCExecuteCommand: vi.fn(() => true),
      ExecuteCommand: vi.fn(() => true),
    }

    const result = createWriterControlAdapter(target).executeCommand({
      commandName: 'bold',
      showUI: false,
      parameter: { value: true },
    })

    expect(result).toEqual({ ok: true })
    expect(target.DCExecuteCommand).toHaveBeenCalledWith('bold', false, { value: true })
    expect(target.ExecuteCommand).not.toHaveBeenCalled()
  })

  it('executes commands through legacy ExecuteCommand when requested', () => {
    const target: WriterControlTarget = {
      DCExecuteCommand: vi.fn(() => true),
      ExecuteCommand: vi.fn(() => true),
    }

    const result = createWriterControlAdapter(target).executeCommand({
      commandName: 'fontSize',
      showUI: true,
      parameter: 16,
      executor: 'legacy',
    })

    expect(result).toEqual({ ok: true })
    expect(target.ExecuteCommand).toHaveBeenCalledWith('fontSize', true, 16)
    expect(target.DCExecuteCommand).not.toHaveBeenCalled()
  })

  it('returns XML saved through SaveDocumentToString', () => {
    const target: WriterControlTarget = {
      SaveDocumentToString: vi.fn(() => '<document />'),
    }

    expect(createWriterControlAdapter(target).saveXml()).toEqual({
      ok: true,
      xml: '<document />',
    })
    expect(target.SaveDocumentToString).toHaveBeenCalledWith({ FileFormat: 'XML' })
  })

  it('reports unavailable save API when SaveDocumentToString is missing', () => {
    expect(createWriterControlAdapter({}).saveXml()).toEqual({
      ok: false,
      reason: 'save-api-unavailable',
      message: '当前外部编辑器未暴露 XML 保存接口。',
    })
  })

  it('reports empty save result when SaveDocumentToString returns an empty string', () => {
    const target: WriterControlTarget = {
      SaveDocumentToString: vi.fn(() => ''),
    }

    expect(createWriterControlAdapter(target).saveXml()).toEqual({
      ok: false,
      reason: 'save-empty',
      message: '编辑器未返回可保存的 XML 内容。',
    })
  })

  it('normalizes rejected writer commands', () => {
    const target: WriterControlTarget = {
      DCExecuteCommand: vi.fn(() => false),
    }

    expect(
      createWriterControlAdapter(target).executeCommand({
        commandName: 'bold',
        showUI: false,
      }),
    ).toEqual({
      ok: false,
      reason: 'command-rejected',
      message: '编辑器未接受命令：bold。',
    })
  })

  it('forwards command status when available and returns null otherwise', () => {
    const target: WriterControlTarget = {
      GetCommandStatus: vi.fn(() => ({ enabled: true })),
    }

    expect(createWriterControlAdapter(target).getCommandStatus('bold')).toEqual({ enabled: true })
    expect(target.GetCommandStatus).toHaveBeenCalledWith('bold')
    expect(createWriterControlAdapter({}).getCommandStatus('bold')).toBeNull()
    expect(createWriterControlAdapter(null).getCommandStatus('bold')).toBeNull()
  })

  it('delegates print operations to existing writer print helpers', () => {
    const target: WriterControlTarget = {
      PrintDocument: vi.fn(() => true),
      LoadPrintPreview: vi.fn(() => true),
      ClosePrintPreview: vi.fn(() => true),
    }
    const adapter = createWriterControlAdapter(target)

    expect(adapter.print()).toEqual({ ok: true })
    expect(target.PrintDocument).toHaveBeenCalledWith({ PrintRange: 'AllPages' })

    expect(adapter.openPrintPreview()).toEqual({ ok: true })
    expect(target.LoadPrintPreview).toHaveBeenCalledWith({ PrintRange: 'AllPages' })

    expect(adapter.closePrintPreview()).toEqual({ ok: true })
    expect(target.ClosePrintPreview).toHaveBeenCalled()
  })
})
