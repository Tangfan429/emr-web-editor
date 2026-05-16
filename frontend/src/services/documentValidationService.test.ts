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

  it('validates required EMRWriterLite Element input fields with child metadata', () => {
    const xml = `
<XTextDocument xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <XElements>
    <Element xsi:type="XInputField">
      <ID>field-real</ID>
      <BackgroundText>现病史</BackgroundText>
      <ValidateStyle><Required>true</Required></ValidateStyle>
      <InnerValue />
    </Element>
  </XElements>
</XTextDocument>
`
    stubDomParser(createParsedDocumentFromXml(xml))

    expect(validateDocumentXml(xml)).toEqual([
      {
        id: 'required-field-real',
        fieldId: 'field-real',
        fieldName: '现病史',
        message: '必填项“现病史”不能为空。',
        severity: 'error',
      },
    ])
  })
})

interface FieldStub {
  tagName: string
  getAttribute: (name: string) => string | null
  querySelector: (selector: string) => { textContent: string } | null
}

function createField(options: {
  tagName?: string
  attributes: Record<string, string>
  children?: Record<string, string>
  innerValue?: string
}): FieldStub {
  return {
    tagName: options.tagName ?? 'XInputField',
    getAttribute(name: string) {
      return options.attributes[name] ?? null
    },
    querySelector(selector: string) {
      const childName = Object.keys(options.children ?? {}).find((name) =>
        selector.includes(name),
      )
      if (childName) {
        return { textContent: options.children?.[childName] ?? '' }
      }

      if (selector.includes('InnerValue') || selector.includes('innerValue')) {
        return options.innerValue === undefined ? null : { textContent: options.innerValue }
      }

      return null
    },
  }
}

function createParsedDocument(fields: FieldStub[], hasParserError = false) {
  return {
    querySelector(selector: string) {
      return selector === 'parsererror' && hasParserError ? {} : null
    },
    querySelectorAll(selector: string) {
      return fields.filter((field) => selectorMatchesField(selector, field))
    },
  }
}

function createParsedDocumentFromXml(xml: string) {
  const fields = Array.from(xml.matchAll(/<Element\b([^>]*)>([\s\S]*?)<\/Element>/g))
    .map((match) => createField({
      tagName: 'Element',
      attributes: parseAttributes(match[1]),
      children: parseRelevantChildren(match[2]),
    }))

  return createParsedDocument(fields)
}

function selectorMatchesField(selector: string, field: FieldStub) {
  return selector
    .split(',')
    .map((part) => part.trim().split(/[ [:.#]/)[0])
    .some((tagName) => tagName === field.tagName)
}

function parseAttributes(source: string) {
  return Object.fromEntries(
    Array.from(source.matchAll(/([\w:-]+)="([^"]*)"/g)).map((match) => [match[1], match[2]]),
  )
}

function parseRelevantChildren(source: string) {
  return Object.fromEntries(
    [
      'ID',
      'Id',
      'id',
      'Name',
      'Title',
      'BackgroundText',
      'Required',
      'required',
      'NotNull',
      'InnerValue',
      'innerValue',
      'Value',
      'value',
    ].map((name) => [name, readTagText(source, name)]).filter(([, value]) => value !== null),
  ) as Record<string, string>
}

function readTagText(source: string, name: string) {
  const selfClosingMatch = source.match(new RegExp(`<${name}\\b[^>]*/>`))
  if (selfClosingMatch) {
    return ''
  }

  const match = source.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))
  return match?.[1]?.trim() ?? null
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
