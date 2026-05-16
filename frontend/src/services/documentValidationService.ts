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

  const fields = Array.from(document.querySelectorAll('XInputField, InputField, inputfield'))
  return fields
    .filter(isRequiredField)
    .filter((field) => !readFieldValue(field))
    .map((field, index) => {
      const fieldId = readAttribute(field, ['ID', 'Id', 'id']) || `field-${index + 1}`
      const fieldName = readAttribute(field, ['Name', 'Title', 'name']) || fieldId
      return {
        id: `required-${fieldId}`,
        fieldId,
        fieldName,
        message: `必填项“${fieldName}”不能为空。`,
        severity: 'error' as const,
      }
    })
}

function isRequiredField(field: Element) {
  const value = readAttribute(field, ['Required', 'required', 'NotNull', 'notNull', 'RequiredValue'])
  return value === 'true' || value === 'True' || value === '1'
}

function readFieldValue(field: Element) {
  const innerValue = field.querySelector('InnerValue, innerValue')
  const directValue = readAttribute(field, ['Value', 'value'])
  return (innerValue?.textContent || directValue || '').trim()
}

function readAttribute(element: Element, names: string[]) {
  for (const name of names) {
    const value = element.getAttribute(name)
    if (value) return value
  }

  return ''
}
