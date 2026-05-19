import { beforeEach, describe, expect, it } from 'vitest'
import {
  fetchMetadataTree,
  filterMetadataTree,
  findMetadataItem,
  resetMetadataServiceState,
} from './metadataService'

describe('metadataService', () => {
  beforeEach(() => {
    resetMetadataServiceState()
  })

  it('provides phase-three metadata groups behind the service boundary', async () => {
    const result = await fetchMetadataTree()

    expect(result.tree.map(node => node.label)).toEqual([
      '医疗数据元',
      '通用数据元',
      '病案首页',
      '手术信息',
    ])
    expect(findMetadataItem(result.tree, 'patient-name')).toMatchObject({
      kind: 'item',
      label: '患者姓名',
      code: 'Patient.Name',
      valueType: '文本',
    })
  })

  it('filters metadata tree by label, code, and description while preserving ancestors', async () => {
    const { tree } = await fetchMetadataTree()
    const byCode = filterMetadataTree(tree, 'Operation')
    const byText = filterMetadataTree(tree, '主要诊断')

    expect(byCode[0]?.label).toBe('手术信息')
    expect(byCode[0]?.children?.map(node => node.code)).toEqual(expect.arrayContaining([
      'Operation.Name',
    ]))
    expect(byText[0]?.label).toBe('病案首页')
  })
})
