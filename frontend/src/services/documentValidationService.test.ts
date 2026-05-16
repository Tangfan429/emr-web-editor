import { afterEach, describe, expect, it, vi } from 'vitest'
import { validateDocumentXml } from './documentValidationService'

describe('documentValidationService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns issues for empty required input fields', () => {
    stubDomParser(createParsedDocument([
      createField({
        attributes: {
          ID: 'field-1',
          Name: '主诉',
          Required: 'true',
        },
        innerValue: '',
      }),
    ]))

    expect(validateDocumentXml('<XInputField />')).toEqual([
      {
        id: 'required-field-1',
        fieldId: 'field-1',
        fieldName: '主诉',
        message: '必填项“主诉”不能为空。',
        severity: 'error',
      },
    ])
  })

  it('does not return issues for required input fields with InnerValue', () => {
    stubDomParser(createParsedDocument([
      createField({
        attributes: {
          ID: 'field-1',
          Name: '主诉',
          Required: 'true',
        },
        innerValue: '头痛',
      }),
    ]))

    expect(validateDocumentXml('<XInputField />')).toEqual([])
  })

  it('returns invalid XML issue when XML cannot be parsed', () => {
    stubDomParser(createParsedDocument([], true))

    expect(validateDocumentXml('<XInputField>')).toEqual([
      {
        id: 'invalid-xml',
        fieldId: 'document',
        fieldName: 'XML',
        message: '文档 XML 无法解析。',
        severity: 'error',
      },
    ])
  })

  it('supports numeric Required and Value attribute values', () => {
    stubDomParser(createParsedDocument([
      createField({
        attributes: {
          ID: 'field-1',
          Name: '主诉',
          Required: '1',
          Value: '头痛',
        },
      }),
    ]))

    expect(validateDocumentXml('<XInputField />')).toEqual([])
  })
})

interface FieldStub {
  getAttribute: (name: string) => string | null
  querySelector: (selector: string) => { textContent: string } | null
}

function createField(options: {
  attributes: Record<string, string>
  innerValue?: string
}): FieldStub {
  return {
    getAttribute(name: string) {
      return options.attributes[name] ?? null
    },
    querySelector(selector: string) {
      if (!selector.includes('InnerValue') && !selector.includes('innerValue')) {
        return null
      }

      return options.innerValue === undefined ? null : { textContent: options.innerValue }
    },
  }
}

function createParsedDocument(fields: FieldStub[], hasParserError = false) {
  return {
    querySelector(selector: string) {
      return selector === 'parsererror' && hasParserError ? {} : null
    },
    querySelectorAll(selector: string) {
      return selector === 'XInputField, InputField, inputfield' ? fields : []
    },
  }
}

function stubDomParser(parsedDocument: ReturnType<typeof createParsedDocument>) {
  vi.stubGlobal(
    'DOMParser',
    class {
      parseFromString() {
        return parsedDocument
      }
    },
  )
}
