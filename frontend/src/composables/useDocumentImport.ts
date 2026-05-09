import { readonly, shallowRef } from 'vue'
import type { ImportedDocument } from '../types/document'

const maxFileSize = 10 * 1024 * 1024
const sensitiveTerms = ['DC', '\u90fd\u660c']

export function useDocumentImport() {
  const document = shallowRef<ImportedDocument | null>(null)
  const error = shallowRef<string | null>(null)
  const isImporting = shallowRef(false)

  async function importFile(file: File) {
    isImporting.value = true
    error.value = null

    try {
      document.value = await readLocalXmlDocument(file)
    } catch (requestError) {
      document.value = null
      error.value = requestError instanceof Error ? requestError.message : '导入失败。'
    } finally {
      isImporting.value = false
    }
  }

  function clearDocument() {
    document.value = null
    error.value = null
  }

  return {
    document: readonly(document),
    error: readonly(error),
    isImporting: readonly(isImporting),
    importFile,
    clearDocument,
  }
}

async function readLocalXmlDocument(file: File): Promise<ImportedDocument> {
  if (file.size === 0) {
    throw new Error('上传文件为空。')
  }

  if (file.size > maxFileSize) {
    throw new Error('文件大小不能超过 10MB。')
  }

  const fileName = file.name || 'imported-record.xml'
  const xml = await file.text()
  if (!looksLikeXml(fileName, xml)) {
    throw new Error('仅支持 XML 文件或 XML 文本内容。')
  }

  ensureValidXml(xml)

  const sanitizedFileName = sanitizeText(fileName)
  const warnings = hasSensitiveText(fileName) || hasSensitiveText(xml)
    ? ['本地导入未上传服务器；显示信息已按演示规则隐藏敏感标识。']
    : []

  return {
    id: crypto.randomUUID(),
    fileName: sanitizedFileName,
    xml: sanitizeXmlText(xml),
    warnings,
    renderMode: 'canvas',
  }
}

function looksLikeXml(fileName: string, content: string) {
  return fileName.toLowerCase().endsWith('.xml') || content.trimStart().startsWith('<')
}

function ensureValidXml(xml: string) {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(xml, 'application/xml')
  const parserError = parsed.querySelector('parsererror')
  if (parserError) {
    throw new Error('XML 格式不正确，无法导入。')
  }
}

function sanitizeXmlText(xml: string) {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(xml, 'application/xml')
  sanitizeNode(parsed.documentElement)
  return new XMLSerializer().serializeToString(parsed)
}

function sanitizeNode(node: Element) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.textContent && !isEmbeddedResourceText(child)) {
      child.textContent = sanitizeText(child.textContent)
    }

    if (child.nodeType === Node.ELEMENT_NODE) {
      sanitizeNode(child as Element)
    }
  }

  for (const attribute of Array.from(node.attributes)) {
    if (attribute.name.startsWith('xmlns') || attribute.name.toLowerCase() === 'type') {
      continue
    }

    if (!isEmbeddedResourceValue(attribute.value)) {
      attribute.value = sanitizeText(attribute.value)
    }
  }
}

function isEmbeddedResourceText(node: ChildNode) {
  const value = node.textContent || ''
  const parentName = node.parentElement?.localName || ''
  return isEmbeddedResourceValue(value) || (isResourceName(parentName) && isLikelyResourcePayload(value))
}

function isEmbeddedResourceValue(value: string) {
  const compact = value.replace(/\s+/g, '')
  return value.trim().startsWith('data:')
    || compact.startsWith('iVBOR')
    || compact.startsWith('/9j/')
    || compact.startsWith('R0lGOD')
    || compact.startsWith('UklGR')
    || compact.startsWith('Qk')
    || compact.startsWith('PHN2Zy')
}

function isResourceName(name: string) {
  return /base64|binary|blob|image|img|picture|src|source|url/i.test(name)
}

function isLikelyResourcePayload(value: string) {
  const trimmed = value.trim()
  return trimmed.length >= 32 && /^[A-Za-z0-9+/=\s]+$/.test(trimmed)
}

function sanitizeText(value: string) {
  return sensitiveTerms.reduce(
    (result, term) => result.replaceAll(term, ''),
    value,
  )
}

function hasSensitiveText(value: string) {
  return sensitiveTerms.some((term) => value.toLowerCase().includes(term.toLowerCase()))
}
