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
})
