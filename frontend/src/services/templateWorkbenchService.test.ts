import { beforeEach, describe, expect, it } from 'vitest'
import {
  batchUploadTemplates,
  beginTemplateUpload,
  cancelTemplateUpload,
  completeTemplateUpload,
  createTemplateDirectory,
  createTemplateFile,
  fetchTemplateWorkbenchData,
  filterTemplateTree,
  findTemplateTreeNode,
  getTemplateContent,
  getTemplateHistoryVersions,
  openTemplateContent,
  renameTemplateDirectory,
  renameTemplateFile,
  requestTemplateUpload,
  resetTemplateWorkbenchState,
  saveTemplateAsContent,
  saveTemplateContent,
  deleteTemplateDirectory,
  deleteTemplateFile,
} from './templateWorkbenchService'

describe('templateWorkbenchService', () => {
  beforeEach(() => {
    resetTemplateWorkbenchState()
  })

  it('returns mock workbench data behind one service boundary', async () => {
    const data = await fetchTemplateWorkbenchData()

    expect(data.templateTree[0]?.label).toBe('和硕县人民医院')
    expect(data.metadataItems.map(item => item.name)).toEqual(expect.arrayContaining(['患者姓名', '入院日期']))
    expect(data.fragmentTemplates.map(item => item.name)).toEqual(expect.arrayContaining(['通用入院主诉']))
    expect(data.templateProperties.status).toBe('未上传')
    expect(data.elementProperties.type).toBe('未选择元素')
  })

  it('filters template tree by category and keyword while preserving ancestors', async () => {
    const { templateTree } = await fetchTemplateWorkbenchData()
    const filtered = filterTemplateTree(templateTree, {
      category: '病案首页',
      keyword: '西医',
    })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.label).toBe('和硕县人民医院')
    expect(filtered[0]?.children?.[0]?.label).toBe('病案首页')
    expect(filtered[0]?.children?.[0]?.children?.map(node => node.label)).toEqual([
      '西医病案首页',
    ])
  })

  it('returns an empty tree when no keyword matches', async () => {
    const { templateTree } = await fetchTemplateWorkbenchData()

    expect(filterTemplateTree(templateTree, { category: '全部分类', keyword: '不存在模板' })).toEqual([])
  })

  it('finds template file nodes by id', async () => {
    const { templateTree } = await fetchTemplateWorkbenchData()

    expect(findTemplateTreeNode(templateTree, 'western-home')?.label).toBe('西医病案首页')
    expect(findTemplateTreeNode(templateTree, 'missing')).toBeNull()
  })

  it('returns active template linked properties and history versions', async () => {
    const data = await fetchTemplateWorkbenchData('western-home')

    expect(data.activeTemplateId).toBe('western-home')
    expect(data.templateProperties.id).toBe('western-home')
    expect(data.templateProperties.name).toBe('西医病案首页')
    expect(data.historyVersions.length).toBeGreaterThan(0)
  })

  it('supports template directory and file CRUD through the service boundary', async () => {
    const directory = createTemplateDirectory('hospital-root', '测试目录')
    const template = createTemplateFile(directory.id, '新增模板', '<XTextDocument />')

    let data = await fetchTemplateWorkbenchData(template.id)
    expect(findTemplateTreeNode(data.templateTree, directory.id)?.label).toBe('测试目录')
    expect(findTemplateTreeNode(data.templateTree, template.id)?.label).toBe('新增模板')

    renameTemplateDirectory(directory.id, '重命名目录')
    data = await fetchTemplateWorkbenchData(template.id)
    expect(findTemplateTreeNode(data.templateTree, directory.id)?.label).toBe('重命名目录')

    renameTemplateFile(template.id, '重命名模板')
    data = await fetchTemplateWorkbenchData(template.id)
    expect(findTemplateTreeNode(data.templateTree, template.id)?.label).toBe('重命名模板')

    deleteTemplateFile(template.id)
    data = await fetchTemplateWorkbenchData()
    expect(findTemplateTreeNode(data.templateTree, template.id)).toBeNull()

    deleteTemplateDirectory(directory.id)
    data = await fetchTemplateWorkbenchData()
    expect(findTemplateTreeNode(data.templateTree, directory.id)).toBeNull()
  })

  it('opens template content and exposes open tabs through service state', async () => {
    const opened = await openTemplateContent('western-home')
    const data = await fetchTemplateWorkbenchData('western-home')

    expect(opened.id).toBe('western-home')
    expect(opened.fileName).toBe('西医病案首页.xml')
    expect(data.openTabs.map(tab => tab.id)).toContain('western-home')
    expect(data.openTabs[0]?.isDirty).toBe(false)
  })

  it('tracks save, save as, and history versions', async () => {
    const updated = saveTemplateContent(
      'western-home',
      '<XTextDocument><A /></XTextDocument>',
      '西医病案首页.xml',
    )

    expect(updated.version).toBe('v1.1')

    const copied = saveTemplateAsContent(
      'western-home',
      '西医病案首页-另存',
      '<XTextDocument><B /></XTextDocument>',
    )
    expect(copied.name).toBe('西医病案首页-另存')
    expect(getTemplateContent(copied.id)?.xml).toContain('<B />')

    const history = getTemplateHistoryVersions('western-home')
    expect(history[0]?.note).toContain('保存')
    expect(history[0]?.version).toBe('v1.1')
  })

  it('walks upload states and supports cancellation and batch upload', async () => {
    requestTemplateUpload('surgery-record')
    expect((await fetchTemplateWorkbenchData('surgery-record')).templateProperties.status).toBe('待上传')

    beginTemplateUpload('surgery-record')
    expect((await fetchTemplateWorkbenchData('surgery-record')).templateProperties.status).toBe('上传中')

    cancelTemplateUpload('surgery-record')
    expect((await fetchTemplateWorkbenchData('surgery-record')).templateProperties.status).toBe('已取消')

    const uploadedIds = batchUploadTemplates(['surgery-record'])
    expect(uploadedIds).toEqual(['surgery-record'])

    completeTemplateUpload('surgery-record')
    expect((await fetchTemplateWorkbenchData('surgery-record')).templateProperties.status).toBe('已上传')
  })
})
