import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchFragmentTemplateTree,
  filterFragmentTemplateTree,
  findFragmentTemplate,
  resetFragmentTemplateServiceState,
} from './fragmentTemplateService'

describe('fragmentTemplateService', () => {
  beforeEach(() => {
    resetFragmentTemplateServiceState()
  })

  it('provides grouped fragment templates outside Vue components', async () => {
    const result = await fetchFragmentTemplateTree()
    const chiefComplaint = findFragmentTemplate(result.tree, 'chief-complaint')

    expect(result.tree.map(node => node.label)).toEqual([
      '住院病历',
      '护理病历',
      '手术信息',
    ])
    expect(chiefComplaint).toMatchObject({
      kind: 'item',
      label: '通用入院主诉',
      category: '住院病历',
      insertMode: 'writer-command',
    })
    expect(chiefComplaint?.xml).toContain('<XTextDocument')
    expect(chiefComplaint?.xml).toContain('xsi:type="XTextBody"')
    expect(chiefComplaint?.xml).toContain('<ContentStyles>')
    expect(chiefComplaint?.xml).toContain('<BodyText>患者因“反复不适 3 天”入院。</BodyText>')
  })

  it('filters fragments by name, category, and description', async () => {
    const { tree } = await fetchFragmentTemplateTree()
    const filtered = filterFragmentTemplateTree(tree, '术后')

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.label).toBe('手术信息')
    expect(filtered[0]?.children?.map(node => node.label)).toContain('术后首次病程')
  })
})
