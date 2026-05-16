import type { ValidationIssue } from '../types/document'

export function validateDocumentXml(xml: string): ValidationIssue[] {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  if (document.querySelector('parsererror')) {
    return [{
      id: 'invalid-xml',
      fieldId: 'document',
      fieldName: 'XML',
      message: '文档 XML 无法解析。',
      severity: 'error',
    }]
  }

  const fields = Array.from(
    document.querySelectorAll('XInputField, InputField, inputfield, Element'),
  ).filter(isInputField)
  return fields
    .filter(isRequiredField)
    .filter((field) => !readFieldValue(field))
    .map((field, index) => {
      const fieldId =
        readAttribute(field, ['ID', 'Id', 'id']) ||
        readChildText(field, ['ID', 'Id', 'id']) ||
        `field-${index + 1}`
      const fieldName =
        readAttribute(field, ['Name', 'Title', 'name']) ||
        readChildText(field, ['Name', 'Title', 'BackgroundText']) ||
        fieldId
      return {
        id: `required-${fieldId}`,
        fieldId,
        fieldName,
        message: `必填项“${fieldName}”不能为空。`,
        severity: 'error' as const,
      }
    })
}

function isInputField(field: Element) {
  const tagName = field.tagName.toLowerCase()
  if (tagName === 'xinputfield' || tagName === 'inputfield') {
    return true
  }

  if (tagName !== 'element') {
    return false
  }

  return readAttribute(field, ['xsi:type', 'type']) === 'XInputField'
}

function isRequiredField(field: Element) {
  const value =
    readAttribute(field, ['Required', 'required', 'NotNull', 'notNull', 'RequiredValue']) ||
    readChildText(field, ['Required', 'required', 'NotNull', 'notNull', 'RequiredValue'])
  return value === 'true' || value === 'True' || value === '1'
}

function readFieldValue(field: Element) {
  const childValue = readChildText(field, ['InnerValue', 'innerValue', 'Value', 'value'])
  const directValue = readAttribute(field, ['Value', 'value'])
  return (childValue || directValue || '').trim()
}

function readAttribute(element: Element, names: string[]) {
  for (const name of names) {
    const value = element.getAttribute(name)
    if (value) return value
  }

  return ''
}

function readChildText(element: Element, names: string[]) {
  for (const name of names) {
    const child = element.querySelector(name)
    if (child) return child.textContent?.trim() ?? ''
  }

  return ''
}
