import { describe, expect, it, vi } from 'vitest'
import { createDefaultElementProperties } from '../services/elementPropertyService'
import {
  insertCodeElement,
  insertFragmentTemplate,
  readSelectedWriterElement,
  updateSelectedWriterElementProperties,
} from './writerElementAdapter'

describe('writerElementAdapter', () => {
  it('reports unavailable writer element inspection explicitly', () => {
    expect(readSelectedWriterElement(null)).toEqual({
      ok: false,
      reason: 'writer-unavailable',
      message: '外部编辑器尚未加载，无法读取当前选中元素。',
    })
  })

  it('normalizes a selected input field exposed by WriterControl-like APIs', () => {
    const target = {
      GetCurrentElement: vi.fn(() => ({
        TypeName: 'XInputField',
        ID: 'Patient.Name',
        Name: '患者姓名',
        InnerValue: '张三',
        ContentReadonly: false,
        Required: true,
        Visible: true,
      })),
    }

    expect(readSelectedWriterElement(target)).toMatchObject({
      ok: true,
      element: {
        type: 'input-field',
        id: 'Patient.Name',
        name: '患者姓名',
        defaultValue: '张三',
        required: true,
      },
    })
  })

  it('reads current input field through confirmed WriterControl APIs', () => {
    const inputRef = { serializeAsArg: vi.fn() }
    const currentInputField = vi.fn(() => inputRef)
    const getElementProperties = vi.fn(() => ({
      TypeName: 'XTextInputFieldElement',
      ID: 'Patient.Age',
      Name: '年龄',
      InnerValue: '42',
      ContentReadonly: 'False',
      Visible: 'True',
      ValueBinding: {
        BindingPath: 'Patient.Age',
      },
    }))

    expect(readSelectedWriterElement({
      CurrentInputField: currentInputField,
      GetElementProperties: getElementProperties,
    })).toMatchObject({
      ok: true,
      element: {
        type: 'input-field',
        id: 'Patient.Age',
        name: '年龄',
        defaultValue: '42',
        bindingPath: 'Patient.Age',
        supportLevel: 'writer',
      },
    })
    expect(getElementProperties).toHaveBeenCalledWith(inputRef, false)
  })

  it('updates selected writer element properties when a supported setter exists', () => {
    const setCurrentElementProperties = vi.fn(() => true)
    const element = createDefaultElementProperties('input-field')

    expect(updateSelectedWriterElementProperties({ SetCurrentElementProperties: setCurrentElementProperties }, element)).toEqual({
      ok: true,
      status: 'success',
      message: '元素属性已同步到 WriterControl。',
    })
    expect(setCurrentElementProperties).toHaveBeenCalledWith(element)
  })

  it('writes normalized properties through SetElementProperties for the current WriterControl element', () => {
    const inputRef = { serializeAsArg: vi.fn() }
    const currentInputField = vi.fn(() => inputRef)
    const setElementProperties = vi.fn(() => true)
    const element = {
      ...createDefaultElementProperties('input-field'),
      id: 'Patient.Name',
      code: 'Patient.Name',
      name: '患者姓名',
      defaultValue: '李四',
      readonly: true,
      required: true,
      visible: false,
      bindingPath: 'Patient.Name',
    }

    expect(updateSelectedWriterElementProperties({
      CurrentInputField: currentInputField,
      SetElementProperties: setElementProperties,
    }, element)).toEqual({
      ok: true,
      status: 'success',
      message: '元素属性已同步到 WriterControl。',
    })
    expect(setElementProperties).toHaveBeenCalledWith(inputRef, expect.objectContaining({
      ID: 'Patient.Name',
      Name: '患者姓名',
      BackgroundText: '患者姓名',
      InnerValue: '李四',
      ContentReadonly: true,
      Required: true,
      Visible: false,
      ValueBinding: {
        BindingPath: 'Patient.Name',
      },
    }), true)
  })

  it('inserts fragment XML through confirmed InsertXmlString API', () => {
    const insertXmlString = vi.fn(() => true)

    expect(insertFragmentTemplate({ InsertXmlString: insertXmlString }, '<XTextDocument />')).toEqual({
      ok: true,
      status: 'success',
      message: '片段模板已插入到当前光标位置。',
    })
    expect(insertXmlString).toHaveBeenCalledWith('<XTextDocument />')
  })

  it('inserts barcode and qrcode through confirmed WriterControl command names', () => {
    const dcExecuteCommand = vi.fn(() => true)

    expect(insertCodeElement({ DCExecuteCommand: dcExecuteCommand }, 'barcode', createDefaultElementProperties('barcode'))).toEqual({
      ok: true,
      status: 'success',
      message: '条形码已提交给 WriterControl 插入。',
    })
    expect(insertCodeElement({ DCExecuteCommand: dcExecuteCommand }, 'qrcode', createDefaultElementProperties('qrcode'))).toEqual({
      ok: true,
      status: 'success',
      message: '二维码已提交给 WriterControl 插入。',
    })
    expect(dcExecuteCommand).toHaveBeenNthCalledWith(1, 'insertbarcodeelement', true, expect.objectContaining({
      Text: 'DC-EMR-0001',
      Width: 180,
      Height: 56,
    }))
    expect(dcExecuteCommand).toHaveBeenNthCalledWith(2, 'inserttdbarcodeelement', true, expect.objectContaining({
      Text: 'DC-EMR-0001',
      Width: 120,
      Height: 120,
    }))
  })

  it('keeps unsupported writer operations explicit for mock fallback', () => {
    const element = createDefaultElementProperties('qrcode')

    expect(updateSelectedWriterElementProperties({}, element)).toEqual({
      ok: false,
      status: 'unsupported',
      reason: 'unsupported',
      message: '当前 WriterControl 未暴露元素属性写入接口，已保留前端 mock 状态。',
    })
    expect(insertFragmentTemplate({}, '<XTextDocument />')).toEqual({
      ok: false,
      status: 'unsupported',
      reason: 'unsupported',
      message: '当前 WriterControl 未暴露片段模板插入接口，未修改文档内容。',
    })
  })
})
