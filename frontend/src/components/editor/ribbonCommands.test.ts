import { describe, expect, it } from 'vitest'
import { createWriterCommandPayload, findRibbonCommand, ribbonTabs } from './ribbonCommands'

describe('ribbonCommands', () => {
  it('contains required tabs', () => {
    expect(ribbonTabs.map(tab => tab.id)).toEqual(['file', 'start', 'insert', 'table', 'print'])
  })

  it('maps bold to a DC command', () => {
    expect(createWriterCommandPayload('bold')).toEqual({
      commandName: 'bold',
      showUI: false,
      parameter: true,
      executor: 'dc',
    })
  })

  it('maps split cell to the legacy command executor', () => {
    expect(createWriterCommandPayload('splitCell')).toEqual({
      commandName: 'Table_SplitCellExt',
      showUI: true,
      parameter: null,
      executor: 'legacy',
    })
  })

  it('finds table commands', () => {
    expect(findRibbonCommand('mergeCell')?.label).toBe('合并单元格')
  })

  it('does not duplicate command ids', () => {
    const commandIds = ribbonTabs.flatMap(tab =>
      tab.groups.flatMap(group => group.commands.map(command => command.id)),
    )

    expect(new Set(commandIds).size).toBe(commandIds.length)
  })

  it('creates payloads for every registered command', () => {
    const commandIds = ribbonTabs.flatMap(tab =>
      tab.groups.flatMap(group => group.commands.map(command => command.id)),
    )

    expect(commandIds.length).toBeGreaterThan(0)
    expect(commandIds.every(id => createWriterCommandPayload(id) !== null)).toBe(true)
  })
})
