import { describe, expect, it } from 'vitest'
import { useDocumentSession } from './useDocumentSession'

describe('useDocumentSession', () => {
  it('loads a template document into a clean session', () => {
    const session = useDocumentSession()

    session.loadTemplate({
      id: 'admission',
      name: 'Admission Record',
      fileName: 'Admission Record.xml',
      category: 'EMRWriterLite',
      xml: '<XTextDocument />',
    })

    expect(session.document.value?.source).toBe('template')
    expect(session.saveState.value).toBe('saved')
    expect(session.isDirty.value).toBe(false)
  })

  it('marks the session dirty after content changes', () => {
    const session = useDocumentSession()

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: [],
      renderMode: 'canvas',
    })
    session.markDirty()

    expect(session.saveState.value).toBe('dirty')
    expect(session.isDirty.value).toBe(true)
  })

  it('marks the session saved with the latest XML', () => {
    const session = useDocumentSession()

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: [],
      renderMode: 'canvas',
    })
    session.markSaved('<XTextDocument><A /></XTextDocument>')

    expect(session.saveState.value).toBe('saved')
    expect(session.lastSavedXml.value).toBe('<XTextDocument><A /></XTextDocument>')
  })

  it('tracks saving and failed states', () => {
    const session = useDocumentSession()

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings: [],
      renderMode: 'canvas',
    })
    session.markSaving()

    expect(session.isSaving.value).toBe(true)
    expect(session.saveState.value).toBe('saving')

    session.markFailed('保存失败')

    expect(session.isSaving.value).toBe(false)
    expect(session.error.value).toBe('保存失败')
    expect(session.saveState.value).toBe('failed')
  })

  it('sets validation issues and clears the document session', () => {
    const session = useDocumentSession()

    session.loadTemplate({
      id: 'admission',
      name: 'Admission Record',
      fileName: 'Admission Record.xml',
      category: 'EMRWriterLite',
      xml: '<XTextDocument />',
    })
    session.setValidationIssues([
      {
        id: 'issue-1',
        fieldId: 'patient-name',
        fieldName: '患者姓名',
        message: '必填',
        severity: 'error',
      },
    ])

    expect(session.validationIssues.value).toHaveLength(1)

    session.clearDocument()

    expect(session.document.value).toBeNull()
    expect(session.lastSavedXml.value).toBe('')
    expect(session.validationIssues.value).toEqual([])
    expect(session.error.value).toBeNull()
    expect(session.isLoading.value).toBe(false)
    expect(session.isSaving.value).toBe(false)
    expect(session.saveState.value).toBe('idle')
  })

  it('copies readonly imported warnings into a mutable document warning list', () => {
    const session = useDocumentSession()
    const warnings = ['本地导入提示'] as const

    session.loadLocalDocument({
      id: '1',
      fileName: 'record.xml',
      xml: '<XTextDocument />',
      warnings,
      renderMode: 'canvas',
    })

    expect(session.document.value?.warnings).toEqual(['本地导入提示'])
    expect(session.document.value?.warnings).not.toBe(warnings)
  })
})
