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
      'insertInputFieldFromInsert',
      'insertRadioFromInsert',
      'insertCheckboxFromInsert',
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

  it('adds phase-three advanced editing entries to the insert menu', () => {
    const insertTab = topMenuTabs.find(tab => tab.id === 'insert')
    const insertCommands = insertTab?.groups.flatMap(group => group.commands) || []

    expect(insertCommands.map(command => command.label)).toEqual(expect.arrayContaining([
      '插入输入域',
      '插入单选框',
      '插入复选框',
      '插入页眉页脚',
      '另存为页眉页脚',
      '插入条形码',
      '插入二维码',
    ]))
    expect(findCommandDefinition('insertBarcode')?.kind).toBe('app')
    expect(findCommandDefinition('insertQrcode')?.kind).toBe('app')
    expect(findCommandDefinition('insertHeaderFooter')?.kind).toBe('app')
    expect(findCommandDefinition('saveAsHeaderFooter')?.kind).toBe('app')
  })

  it('keeps barcode and qrcode as app commands backed by writerElementAdapter', () => {
    expect(findCommandDefinition('insertBarcode')).toMatchObject({
      kind: 'app',
      id: 'insertBarcode',
      label: '插入条形码',
    })
    expect(findCommandDefinition('insertQrcode')).toMatchObject({
      kind: 'app',
      id: 'insertQrcode',
      label: '插入二维码',
    })
    expect(createWriterCommandPayload('insertBarcode')).toBeNull()
    expect(createWriterCommandPayload('insertQrcode')).toBeNull()
  })

  it('does not duplicate command ids across menu tabs', () => {
    const commandIds = topMenuTabs.flatMap(tab =>
      tab.groups.flatMap(group => group.commands.map(command => command.id)),
    )

    expect(new Set(commandIds).size).toBe(commandIds.length)
  })
})
