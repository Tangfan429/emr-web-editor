import { beforeEach, describe, expect, it } from 'vitest'
import type { MetadataTreeNode } from '../types/editorElement'
import {
  bindMetadataToInputField,
  createDefaultElementProperties,
  getCandidateOptions,
  resetElementPropertyState,
  selectMockElement,
  toInputFieldWriterOptions,
  updateElementProperties,
} from './elementPropertyService'

describe('elementPropertyService', () => {
  beforeEach(() => {
    resetElementPropertyState()
  })

  it('creates editable defaults for phase-three element types', () => {
    expect(createDefaultElementProperties('input-field')).toMatchObject({
      type: 'input-field',
      name: '输入域',
      readonly: false,
      required: false,
      visible: true,
    })
    expect(createDefaultElementProperties('barcode')).toMatchObject({
      type: 'barcode',
      codeContent: 'DC-EMR-0001',
      width: 180,
      height: 56,
      showText: true,
    })
    expect(createDefaultElementProperties('table-cell')).toMatchObject({
      type: 'table-cell',
      cellPosition: '第 1 行，第 1 列',
    })
  })

  it('keeps selected mock element state in the service boundary', () => {
    const selected = selectMockElement('radio')
    const updated = updateElementProperties({ displayText: '性别', bindingValue: 'M' })

    expect(selected.type).toBe('radio')
    expect(updated).toMatchObject({
      type: 'radio',
      displayText: '性别',
      bindingValue: 'M',
    })
  })

  it('binds metadata to current input field properties and writer command options', () => {
    const metadata: MetadataTreeNode = {
      id: 'patient-name',
      kind: 'item',
      label: '患者姓名',
      code: 'Patient.Name',
      valueType: '文本',
      description: '患者基本信息',
    }

    const inputField = bindMetadataToInputField(createDefaultElementProperties('input-field'), metadata)
    expect(inputField).toMatchObject({
      name: '患者姓名',
      code: 'Patient.Name',
      bindingPath: 'Patient.Name',
      dataElementId: 'patient-name',
    })

    expect(toInputFieldWriterOptions(inputField)).toMatchObject({
      ID: 'Patient.Name',
      Name: '患者姓名',
      BackgroundText: '患者姓名',
      BindingPath: 'Patient.Name',
      ValueBinding: {
        BindingPath: 'Patient.Name',
      },
      EnableValueValidate: true,
    })
  })

  it('provides mock candidate options for radio and checkbox controls', () => {
    expect(getCandidateOptions('radio').map(option => option.text)).toEqual(['男', '女'])
    expect(getCandidateOptions('checkbox').map(option => option.text)).toEqual(['已告知', '已签字', '需复核'])
  })
})
