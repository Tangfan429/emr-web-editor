import { describe, expect, it } from 'vitest'
import {
  appCommandIds,
  createWriterCommandPayload,
  findCommandDefinition,
  topMenuTabs,
  writerCommandIds,
} from './commandRegistry'

describe('commandRegistry', () => {
  it('exposes the full template workbench menu order', () => {
    expect(topMenuTabs.map(tab => tab.label)).toEqual([
      '文件',
      '格式',
      '段落',
      '常规',
      '设计',
      '表格',
      '插入',
      '高级',
    ])
  })

  it('keeps save, print, and preview as application commands', () => {
    expect(appCommandIds).toEqual(expect.arrayContaining([
      'save',
      'saveAsTemplate',
      'downloadXml',
      'uploadTemplate',
      'batchUploadTemplates',
      'cancelUpload',
      'historyVersions',
      'print',
      'printPreview',
      'closePrintPreview',
      'importXml',
    ]))
    expect(findCommandDefinition('save')?.kind).toBe('app')
    expect(findCommandDefinition('print')?.kind).toBe('app')
    expect(findCommandDefinition('printPreview')?.kind).toBe('app')
  })

  it('maps existing WriterControl editing commands without changing payloads', () => {
    expect(writerCommandIds).toEqual(expect.arrayContaining([
      'undo',
      'redo',
      'bold',
      'alignCenter',
      'insertInputField',
      'insertTable',
      'mergeCell',
    ]))
    expect(createWriterCommandPayload('bold')).toEqual({
      commandName: 'Bold',
      showUI: false,
      parameter: null,
      executor: 'dc',
    })
    expect(createWriterCommandPayload('insertInputField')).toMatchObject({
      commandName: 'InsertInputField',
      showUI: true,
      executor: 'dc',
    })
  })

  it('promotes phase-two template commands to application commands', () => {
    expect(findCommandDefinition('uploadTemplate')?.kind).toBe('app')
    expect(findCommandDefinition('cancelUpload')?.kind).toBe('app')
    expect(findCommandDefinition('historyVersions')?.kind).toBe('app')
    expect(createWriterCommandPayload('uploadTemplate')).toBeNull()
  })

  it('does not duplicate command ids across menu tabs', () => {
    const commandIds = topMenuTabs.flatMap(tab =>
      tab.groups.flatMap(group => group.commands.map(command => command.id)),
    )

    expect(new Set(commandIds).size).toBe(commandIds.length)
  })
})
