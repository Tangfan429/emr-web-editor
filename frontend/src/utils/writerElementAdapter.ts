import type {
  EditorElementProperties,
  EditorElementType,
  ElementPropertyUpdateResult,
} from '../types/editorElement'

export interface WriterElementTarget {
  addEventListener?: HTMLElement['addEventListener']
  GetCurrentElement?: () => unknown
  SetCurrentElementProperties?: (properties: EditorElementProperties) => boolean | void
  SetCurrentElementProperty?: (name: string, value: unknown) => boolean | void
  InsertFragmentFromString?: (xml: string, format?: string) => boolean | void
  LoadFragmentFromString?: (xml: string, format?: string) => boolean | void
  InsertXmlString?: (xml: string) => boolean | void
  InsertXmlBase64String?: (xml: string) => boolean | void
  CurrentInputField?: () => unknown
  CurrentCheckboxOrRadio?: () => unknown
  CurrentTable?: () => unknown
  CurrentTableRow?: () => unknown
  CurrentTableCell?: () => unknown
  CurrentElement?: unknown | ((typename?: string) => unknown)
  GetCurrentElementTypeName?: () => string | null | undefined
  GetElementProperties?: (element: unknown, smartmode?: boolean) => unknown
  SetElementProperties?: (element: unknown, options: Record<string, unknown>, isrefresh?: boolean) => boolean | void
  DCExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  ExecuteCommand?: (commandName: string, showUI: boolean, parameter?: unknown) => boolean | void
  Focus?: () => boolean | void
  Selection?: {
    CurrentElement?: unknown
  }
}

export type WriterElementAdapterFailureReason =
  | 'writer-unavailable'
  | 'no-selection'
  | 'unsupported'
  | 'failed'

export type WriterElementAdapterResult =
  | { ok: true; element: EditorElementProperties }
  | {
    ok: false
    reason: WriterElementAdapterFailureReason
    message: string
  }

export function readSelectedWriterElement(target: WriterElementTarget | null): WriterElementAdapterResult {
  if (!target) {
    return {
      ok: false,
      reason: 'writer-unavailable',
      message: '外部编辑器尚未加载，无法读取当前选中元素。',
    }
  }

  const rawElement = readCurrentWriterElementProperties(target)

  if (!rawElement || typeof rawElement !== 'object') {
    return {
      ok: false,
      reason: 'unsupported',
      message: '当前 WriterControl 未暴露当前元素读取接口，使用前端 mock 元素。',
    }
  }

  return {
    ok: true,
    element: normalizeWriterElement(rawElement as Record<string, unknown>),
  }
}

export function updateSelectedWriterElementProperties(
  target: WriterElementTarget | null,
  properties: EditorElementProperties,
): ElementPropertyUpdateResult {
  if (!target) {
    return {
      ok: false,
      status: 'no-selection',
      reason: 'no-selection',
      message: '当前未选中 WriterControl 元素，已保留前端 mock 状态。',
    }
  }

  if (typeof target.SetCurrentElementProperties === 'function') {
    const result = target.SetCurrentElementProperties(properties)
    if (result === false) {
      return {
        ok: false,
        status: 'failed',
        reason: 'failed',
        message: 'WriterControl 拒绝写入当前元素属性。',
      }
    }

    return {
      ok: true,
      status: 'success',
      message: '元素属性已同步到 WriterControl。',
    }
  }

  if (typeof target.SetCurrentElementProperty === 'function') {
    for (const [name, value] of Object.entries(properties)) {
      const result = target.SetCurrentElementProperty(name, value)
      if (result === false) {
        return {
          ok: false,
          status: 'failed',
          reason: 'failed',
          message: `WriterControl 拒绝写入属性：${name}。`,
        }
      }
    }

    return {
      ok: true,
      status: 'success',
      message: '元素属性已同步到 WriterControl。',
    }
  }

  if (typeof target.SetElementProperties === 'function') {
    const currentElementRef = resolveCurrentWriterElementRef(target, properties.type)
    if (!currentElementRef) {
      return {
        ok: false,
        status: 'no-selection',
        reason: 'no-selection',
        message: '当前 WriterControl 未返回可写入的选中元素。',
      }
    }

    const result = target.SetElementProperties(currentElementRef, toWriterElementOptions(properties), true)
    if (result === false) {
      return {
        ok: false,
        status: 'failed',
        reason: 'failed',
        message: 'WriterControl 拒绝写入当前元素属性。',
      }
    }

    return {
      ok: true,
      status: 'success',
      message: '元素属性已同步到 WriterControl。',
    }
  }

  return {
    ok: false,
    status: 'unsupported',
    reason: 'unsupported',
    message: '当前 WriterControl 未暴露元素属性写入接口，已保留前端 mock 状态。',
  }
}

export function insertFragmentTemplate(
  target: WriterElementTarget | null,
  xml: string,
): ElementPropertyUpdateResult {
  if (!target) {
    return {
      ok: false,
      status: 'no-selection',
      reason: 'no-selection',
      message: '外部编辑器尚未加载，无法插入片段模板。',
    }
  }

  const insert =
    target.InsertFragmentFromString ||
    target.LoadFragmentFromString ||
    target.InsertXmlString ||
    target.InsertXmlBase64String

  if (typeof insert !== 'function') {
    return {
      ok: false,
      status: 'unsupported',
      reason: 'unsupported',
      message: '当前 WriterControl 未暴露片段模板插入接口，未修改文档内容。',
    }
  }

  const result = insert === target.InsertXmlString || insert === target.InsertXmlBase64String
    ? insert.call(target, xml)
    : insert.call(target, xml, 'xml')
  if (result === false) {
    return {
      ok: false,
      status: 'failed',
      reason: 'failed',
      message: 'WriterControl 拒绝插入片段模板。',
    }
  }

  return {
    ok: true,
    status: 'success',
    message: '片段模板已插入到当前光标位置。',
  }
}

export function insertCodeElement(
  target: WriterElementTarget | null,
  type: 'barcode' | 'qrcode',
  properties: EditorElementProperties,
): ElementPropertyUpdateResult {
  if (!target) {
    return {
      ok: false,
      status: 'no-selection',
      reason: 'no-selection',
      message: '外部编辑器尚未加载，无法插入编码元素。',
    }
  }

  const commandName = type === 'barcode' ? 'insertbarcodeelement' : 'inserttdbarcodeelement'
  const execute = target.DCExecuteCommand || target.ExecuteCommand
  if (typeof execute !== 'function') {
    return {
      ok: false,
      status: 'unsupported',
      reason: 'unsupported',
      message: `当前 WriterControl 未暴露${type === 'barcode' ? '条形码' : '二维码'}插入命令，未修改文档内容。`,
    }
  }

  target.Focus?.()
  const result = execute.call(target, commandName, true, toCodeElementWriterOptions(properties))
  if (result === false) {
    return {
      ok: false,
      status: 'failed',
      reason: 'failed',
      message: `WriterControl 拒绝插入${type === 'barcode' ? '条形码' : '二维码'}。`,
    }
  }

  return {
    ok: true,
    status: 'success',
    message: `${type === 'barcode' ? '条形码' : '二维码'}已提交给 WriterControl 插入。`,
  }
}

function normalizeWriterElement(rawElement: Record<string, unknown>): EditorElementProperties {
  const type = inferElementType(rawElement)
  const id = readString(rawElement, ['ID', 'Id', 'id', 'Name', 'name']) || `${type}-writer`
  const name = readString(rawElement, ['Name', 'name', 'BackgroundText', 'Text']) || labelForType(type)

  return {
    id,
    type,
    name,
    code: readString(rawElement, ['Code', 'code']) || id,
    defaultValue: readString(rawElement, ['InnerValue', 'Value', 'Text']),
    readonly: readBoolean(rawElement, ['ContentReadonly', 'Readonly', 'readonly']),
    required: readBoolean(rawElement, ['Required', 'NotNull', 'required']),
    visible: readBoolean(rawElement, ['Visible', 'visible'], true),
    bindingPath: readString(rawElement, ['BindingPath', 'bindingPath', 'DataElementCode'])
      || readNestedString(rawElement, ['ValueBinding', 'BindingPath'])
      || readNestedString(rawElement, ['ValueBinding', 'BindingPathForText']),
    displayText: readString(rawElement, ['DisplayText', 'Text']),
    bindingValue: readString(rawElement, ['Value', 'BindingValue']),
    defaultChecked: readBoolean(rawElement, ['Checked', 'DefaultChecked']),
    tableId: readString(rawElement, ['TableID', 'TableId', 'OwnerTable']),
    rowIndex: readNumber(rawElement, ['RowIndex']),
    columnIndex: readNumber(rawElement, ['ColumnIndex']),
    width: readNumber(rawElement, ['Width', 'SpecifyWidth']),
    height: readNumber(rawElement, ['Height']),
    codeContent: readString(rawElement, ['CodeContent', 'Text', 'Value']),
    showText: readBoolean(rawElement, ['ShowText', 'showText'], true),
    supportLevel: 'writer',
  }
}

function readCurrentWriterElementProperties(target: WriterElementTarget) {
  const directElement = callGetter(target.GetCurrentElement, target)
  const directProperties = toProperties(target, directElement)
  if (directProperties) return directProperties

  const preferredRef = resolveCurrentWriterElementRef(target)
  const preferredProperties = toProperties(target, preferredRef)
  if (preferredProperties) return preferredProperties

  const selectionProperties = toProperties(target, target.Selection?.CurrentElement)
  if (selectionProperties) return selectionProperties

  if (target.CurrentElement && typeof target.CurrentElement !== 'function') {
    return target.CurrentElement
  }

  return null
}

function resolveCurrentWriterElementRef(target: WriterElementTarget, preferredType?: EditorElementType) {
  if (preferredType === 'input-field') {
    const input = callNoArgGetter(target.CurrentInputField, target)
    if (input) return input
  }

  if (preferredType === 'radio' || preferredType === 'checkbox') {
    const choice = callNoArgGetter(target.CurrentCheckboxOrRadio, target)
    if (choice) return choice
  }

  if (preferredType === 'table-cell') {
    const cell = callNoArgGetter(target.CurrentTableCell, target)
    if (cell) return cell
  }

  if (preferredType === 'table-row') {
    const row = callNoArgGetter(target.CurrentTableRow, target)
    if (row) return row
  }

  if (preferredType === 'table') {
    const table = callNoArgGetter(target.CurrentTable, target)
    if (table) return table
  }

  const typedElement = callCurrentElement(target)
  if (typedElement) return typedElement

  return (
    callNoArgGetter(target.CurrentInputField, target) ||
    callNoArgGetter(target.CurrentCheckboxOrRadio, target) ||
    callNoArgGetter(target.CurrentTableCell, target) ||
    callNoArgGetter(target.CurrentTableRow, target) ||
    callNoArgGetter(target.CurrentTable, target)
  )
}

function toProperties(target: WriterElementTarget, elementRef: unknown) {
  if (!elementRef || typeof elementRef !== 'object') {
    return null
  }

  if (typeof target.GetElementProperties === 'function') {
    const properties = target.GetElementProperties(elementRef, false)
    if (properties && typeof properties === 'object') {
      return properties
    }
  }

  return elementRef
}

function callCurrentElement(target: WriterElementTarget) {
  if (typeof target.CurrentElement !== 'function') {
    return null
  }

  const typename = callNoArgGetter(target.GetCurrentElementTypeName, target)
  if (typeof typename === 'string' && typename.trim()) {
    const typedElement = target.CurrentElement.call(target, typename)
    if (typedElement) return typedElement
  }

  return target.CurrentElement.call(target)
}

function toWriterElementOptions(properties: EditorElementProperties): Record<string, unknown> {
  if (properties.type === 'input-field') {
    return {
      ID: properties.code || properties.id,
      Name: properties.name,
      BackgroundText: properties.name,
      InnerValue: properties.defaultValue || '',
      Text: properties.defaultValue || '',
      ContentReadonly: Boolean(properties.readonly),
      UserEditable: !properties.readonly,
      Required: Boolean(properties.required),
      Visible: properties.visible !== false,
      EnableValueValidate: true,
      ValueBinding: {
        BindingPath: properties.bindingPath || properties.code || '',
      },
      BindingPath: properties.bindingPath || properties.code || '',
    }
  }

  if (properties.type === 'radio' || properties.type === 'checkbox') {
    return {
      Name: properties.name,
      Text: properties.displayText || properties.name,
      Value: properties.bindingValue || '',
      Checked: Boolean(properties.defaultChecked),
    }
  }

  return {
    ID: properties.id,
    Name: properties.name,
    Visible: properties.visible !== false,
    Width: properties.width,
    Height: properties.height,
  }
}

function toCodeElementWriterOptions(properties: EditorElementProperties) {
  return {
    Text: properties.codeContent || properties.defaultValue || properties.name,
    Value: properties.codeContent || properties.defaultValue || '',
    BindingPath: properties.bindingPath || '',
    Width: properties.width,
    Height: properties.height,
    ShowText: properties.showText !== false,
  }
}

function inferElementType(rawElement: Record<string, unknown>): EditorElementType {
  const typeName = [
    readString(rawElement, ['TypeName', 'typeName', 'ElementType', 'elementType']),
    String(rawElement['xsi:type'] || ''),
  ].join(' ').toLocaleLowerCase()

  if (typeName.includes('inputfield')) return 'input-field'
  if (typeName.includes('checkbox')) return 'checkbox'
  if (typeName.includes('radio')) return 'radio'
  if (typeName.includes('tablecell')) return 'table-cell'
  if (typeName.includes('tablerow')) return 'table-row'
  if (typeName.includes('table')) return 'table'
  if (typeName.includes('barcode')) return 'barcode'
  if (typeName.includes('qrcode')) return 'qrcode'
  if (typeName.includes('header') || typeName.includes('footer')) return 'header-footer'
  return 'input-field'
}

function readString(rawElement: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = rawElement[name]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
    if (typeof value === 'number') {
      return String(value)
    }
  }
  return ''
}

function readNestedString(rawElement: Record<string, unknown>, path: [string, string]) {
  const parent = rawElement[path[0]]
  if (!parent || typeof parent !== 'object') {
    return ''
  }

  return readString(parent as Record<string, unknown>, [path[1]])
}

function readBoolean(rawElement: Record<string, unknown>, names: string[], fallback = false) {
  for (const name of names) {
    const value = rawElement[name]
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value === 'true' || value === 'True' || value === '1'
  }
  return fallback
}

function readNumber(rawElement: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = rawElement[name]
    if (typeof value === 'number') return value
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value)
    }
  }
  return undefined
}

function callGetter(getter: WriterElementTarget['GetCurrentElement'], target: WriterElementTarget) {
  return typeof getter === 'function' ? getter.call(target) : null
}

function callNoArgGetter<T>(getter: (() => T) | undefined, target: WriterElementTarget) {
  return typeof getter === 'function' ? getter.call(target) : null
}

function labelForType(type: EditorElementType) {
  const labels: Record<EditorElementType, string> = {
    none: '未选择元素',
    'input-field': '输入域',
    radio: '单选框',
    checkbox: '复选框',
    table: '表格',
    'table-row': '表格行',
    'table-cell': '单元格',
    barcode: '条形码',
    qrcode: '二维码',
    'header-footer': '页眉页脚',
  }
  return labels[type]
}
