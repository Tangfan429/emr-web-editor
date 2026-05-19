import type { TemplateContent } from '../types/document'
import type { EditorElementProperties, FragmentTemplateTreeNode, MetadataTreeNode } from '../types/editorElement'
import { createDefaultElementProperties } from './elementPropertyService'
import { fetchFragmentTemplateTree, flattenFragmentTemplates } from './fragmentTemplateService'
import { fetchMetadataTree, flattenMetadataItems } from './metadataService'
import { fetchTemplateContent } from './templateService'

export type TemplateTreeNodeKind = 'root' | 'category' | 'template'
export type TemplateUploadStatus = '已上传' | '未上传' | '待上传' | '上传中' | '已取消' | '上传失败'

export interface TemplateTreeNode {
  id: string
  label: string
  kind: TemplateTreeNodeKind
  category?: string
  templateId?: string
  status?: TemplateUploadStatus
  children?: TemplateTreeNode[]
}

export interface MetadataItem {
  id: string
  name: string
  code: string
  valueType: string
}

export interface FragmentTemplate {
  id: string
  name: string
  category: string
}

export interface TemplateProperties {
  id: string
  name: string
  category: string
  status: TemplateUploadStatus
  version: string
  updatedAt: string
  fileName: string
  source: string
  isDirty: boolean
  uploadMessage: string
}

export type ElementProperties = EditorElementProperties

export interface TemplateHistoryVersion {
  id: string
  templateId: string
  version: string
  savedAt: string
  operator: string
  note: string
}

export interface TemplateOpenTab {
  id: string
  name: string
  fileName: string
  isDirty: boolean
  status: TemplateUploadStatus
}

export interface TemplateWorkbenchData {
  templateTree: TemplateTreeNode[]
  categories: string[]
  metadataItems: MetadataItem[]
  metadataTree: MetadataTreeNode[]
  fragmentTemplates: FragmentTemplate[]
  fragmentTemplateTree: FragmentTemplateTreeNode[]
  templateProperties: TemplateProperties
  elementProperties: ElementProperties
  historyVersions: TemplateHistoryVersion[]
  openTabs: TemplateOpenTab[]
  activeTemplateId: string
}

export interface TemplateTreeFilter {
  category: string
  keyword: string
}

interface TemplateRecord {
  id: string
  name: string
  fileName: string
  category: string
  status: TemplateUploadStatus
  version: string
  updatedAt: string
  source: string
  xml: string
  isDirty: boolean
  uploadMessage: string
  contentTemplateId?: string
}

interface TemplateWorkbenchState {
  templateTree: TemplateTreeNode[]
  templates: Record<string, TemplateRecord>
  history: Record<string, TemplateHistoryVersion[]>
  openTabs: string[]
  activeTemplateId: string
  nextId: number
}

const today = '2026-05-18'
const defaultXml = '<XTextDocument><Body>新建模板</Body></XTextDocument>'

const initialTemplateTree: TemplateTreeNode[] = [
  {
    id: 'hospital-root',
    label: '和硕县人民医院',
    kind: 'root',
    children: [
      {
        id: 'category-home',
        label: '病案首页',
        kind: 'category',
        category: '病案首页',
        children: [
          {
            id: 'western-home',
            label: '西医病案首页',
            kind: 'template',
            category: '病案首页',
            templateId: 'western-home',
            status: '未上传',
          },
          {
            id: 'chinese-home',
            label: '中医病案首页',
            kind: 'template',
            category: '病案首页',
            templateId: 'chinese-home',
            status: '待上传',
          },
        ],
      },
      {
        id: 'category-inpatient',
        label: '住院病历',
        kind: 'category',
        category: '住院病历',
        children: [
          {
            id: 'admission-record',
            label: '入院记录',
            kind: 'template',
            category: '住院病历',
            templateId: 'admission-record',
            status: '已上传',
          },
          {
            id: 'surgery-record',
            label: '手术记录',
            kind: 'template',
            category: '住院病历',
            templateId: 'surgery-record',
            status: '未上传',
          },
        ],
      },
      {
        id: 'category-nursing',
        label: '护理病历',
        kind: 'category',
        category: '护理病历',
        children: [
          {
            id: 'nursing-notice',
            label: '护理告知书',
            kind: 'template',
            category: '护理病历',
            templateId: 'nursing-notice',
            status: '已上传',
          },
          {
            id: 'risk-assessment',
            label: '风险评估表',
            kind: 'template',
            category: '护理病历',
            templateId: 'risk-assessment',
            status: '待上传',
          },
        ],
      },
      {
        id: 'category-other',
        label: '暂未分类',
        kind: 'category',
        category: '暂未分类',
        children: [
          {
            id: 'consultation-apply',
            label: '会诊申请',
            kind: 'template',
            category: '暂未分类',
            templateId: 'consultation-apply',
            status: '未上传',
          },
        ],
      },
    ],
  },
]

const initialTemplates: Record<string, TemplateRecord> = {
  'western-home': templateRecord('western-home', '西医病案首页', '病案首页', '未上传', 'v1.0', 'source', 'The-front-page-of-medical-records'),
  'chinese-home': templateRecord('chinese-home', '中医病案首页', '病案首页', '待上传', 'v1.0', 'source', 'Medical-Record'),
  'admission-record': templateRecord('admission-record', '入院记录', '住院病历', '已上传', 'v1.0', 'runtime', 'Admission-Record'),
  'surgery-record': templateRecord('surgery-record', '手术记录', '住院病历', '未上传', 'v1.0', 'source', 'Operation-Schedule'),
  'nursing-notice': templateRecord('nursing-notice', '护理告知书', '护理病历', '已上传', 'v1.0', 'runtime', 'List-of-Nursing-Evaluation-at-Admission-for-Patient'),
  'risk-assessment': templateRecord('risk-assessment', '风险评估表', '护理病历', '待上传', 'v1.0', 'source', 'Pain-Scale'),
  'consultation-apply': templateRecord('consultation-apply', '会诊申请', '暂未分类', '未上传', 'v1.0', 'source', 'Imaging-Examination-Application-Sheet'),
}

const mockElementProperties = createDefaultElementProperties('none')

let state = createInitialState()

export function resetTemplateWorkbenchState() {
  state = createInitialState()
}

export async function fetchTemplateWorkbenchData(activeTemplateId?: string): Promise<TemplateWorkbenchData> {
  const activeId = pickActiveTemplateId(activeTemplateId)
  const activeTemplate = state.templates[activeId]
  const metadata = await fetchMetadataTree()
  const fragments = await fetchFragmentTemplateTree()
  return {
    templateTree: cloneTree(state.templateTree),
    categories: ['全部分类', ...collectCategories(state.templateTree)],
    metadataItems: flattenMetadataItems(metadata.tree),
    metadataTree: metadata.tree,
    fragmentTemplates: flattenFragmentTemplates(fragments.tree),
    fragmentTemplateTree: fragments.tree,
    templateProperties: toTemplateProperties(activeTemplate),
    elementProperties: { ...mockElementProperties },
    historyVersions: getTemplateHistoryVersions(activeId),
    openTabs: state.openTabs.map(toOpenTab).filter((tab): tab is TemplateOpenTab => tab !== null),
    activeTemplateId: activeId,
  }
}

export async function openTemplateContent(id: string): Promise<TemplateContent> {
  const template = readTemplateRecord(id)
  const content = await readTemplateContent(template)
  ensureOpenTab(template.id)
  state.activeTemplateId = template.id
  return content
}

export function closeTemplateTab(id: string) {
  state.openTabs = state.openTabs.filter(tabId => tabId !== id)
  if (state.activeTemplateId === id) {
    state.activeTemplateId = state.openTabs[0] || firstTemplateId() || ''
  }
  return state.activeTemplateId
}

export function getTemplateContent(id: string): TemplateContent | null {
  const template = state.templates[id]
  return template ? toTemplateContent(template) : null
}

export function createTemplateDirectory(parentId: string, name: string): TemplateTreeNode {
  const parent = readTreeNode(parentId)
  const node: TemplateTreeNode = {
    id: createId('directory'),
    label: normalizeName(name, '新建目录'),
    kind: 'category',
    category: normalizeName(name, '新建目录'),
    children: [],
  }
  parent.children = [...(parent.children || []), node]
  return cloneNode(node)
}

export function renameTemplateDirectory(id: string, name: string) {
  const node = readTreeNode(id)
  if (node.kind === 'template') {
    throw new Error('模板文件不能按目录重命名。')
  }

  node.label = normalizeName(name, node.label)
  node.category = node.label
  updateChildCategory(node, node.label)
  return cloneNode(node)
}

export function deleteTemplateDirectory(id: string) {
  const node = readTreeNode(id)
  if (node.kind === 'template') {
    throw new Error('模板文件不能按目录删除。')
  }
  if (node.kind === 'root') {
    throw new Error('根目录不能删除。')
  }

  for (const child of node.children || []) {
    removeTemplateRecords(child)
  }
  return removeTreeNode(id)
}

export function createTemplateFile(parentId: string, name: string, xml = defaultXml): TemplateRecord {
  const parent = readTreeNode(parentId)
  if (parent.kind === 'template') {
    throw new Error('不能在模板文件下新建模板。')
  }

  const templateName = normalizeName(name, '新建模板')
  const id = createId('template')
  const category = parent.category || templateName
  const record: TemplateRecord = {
    id,
    name: templateName,
    fileName: ensureXmlFileName(templateName),
    category,
    status: '未上传',
    version: 'v1.0',
    updatedAt: today,
    source: 'local',
    xml,
    isDirty: true,
    uploadMessage: '尚未上传',
  }
  state.templates[id] = record
  state.history[id] = [historyVersion(record, '创建模板')]
  parent.children = [
    ...(parent.children || []),
    {
      id,
      label: templateName,
      kind: 'template',
      category,
      templateId: id,
      status: record.status,
    },
  ]
  ensureOpenTab(id)
  state.activeTemplateId = id
  return { ...record }
}

export function renameTemplateFile(id: string, name: string): TemplateRecord {
  const template = readTemplateRecord(id)
  template.name = normalizeName(name, template.name)
  template.fileName = ensureXmlFileName(template.name)
  template.isDirty = true
  template.updatedAt = today
  syncTemplateNode(template)
  return { ...template }
}

export function markTemplateDirty(id: string) {
  const template = state.templates[id]
  if (!template) {
    return null
  }
  template.isDirty = true
  template.uploadMessage = '存在未保存修改'
  ensureOpenTab(id)
  syncTemplateNode(template)
  return { ...template }
}

export function deleteTemplateFile(id: string) {
  readTemplateRecord(id)
  removeTreeNode(id)
  delete state.templates[id]
  delete state.history[id]
  state.openTabs = state.openTabs.filter(tabId => tabId !== id)
  if (state.activeTemplateId === id) {
    state.activeTemplateId = state.openTabs[0] || firstTemplateId() || ''
  }
  return true
}

export function saveTemplateContent(id: string, xml: string, fileName?: string): TemplateRecord {
  const template = readTemplateRecord(id)
  template.xml = xml
  template.fileName = fileName || template.fileName
  template.version = nextVersion(template.version)
  template.updatedAt = today
  template.isDirty = false
  template.status = template.status === '已上传' ? '待上传' : template.status
  template.uploadMessage = '已保存，等待上传'
  state.history[id] = [historyVersion(template, '保存模板内容'), ...(state.history[id] || [])]
  syncTemplateNode(template)
  ensureOpenTab(id)
  return { ...template }
}

export function saveTemplateAsContent(sourceId: string, name: string, xml: string): TemplateRecord {
  const source = readTemplateRecord(sourceId)
  const targetName = normalizeName(name, `${source.name}-另存`)
  const parent = findParentNode(sourceId) || readTreeNode('hospital-root')
  const copied = createTemplateFile(parent.id, targetName, xml)
  copied.isDirty = false
  copied.uploadMessage = '另存为模板，等待上传'
  state.templates[copied.id] = copied
  state.history[copied.id] = [historyVersion(copied, `从 ${source.name} 另存为`)]
  syncTemplateNode(copied)
  return { ...copied }
}

export function requestTemplateUpload(id: string) {
  return updateUploadStatus(id, '待上传', '已加入上传队列')
}

export function beginTemplateUpload(id: string) {
  return updateUploadStatus(id, '上传中', '正在上传')
}

export function cancelTemplateUpload(id: string) {
  return updateUploadStatus(id, '已取消', '已取消上传')
}

export function completeTemplateUpload(id: string) {
  const template = updateUploadStatus(id, '已上传', '上传完成')
  template.isDirty = false
  state.history[id] = [historyVersion(template, '上传模板'), ...(state.history[id] || [])]
  syncTemplateNode(template)
  return { ...template }
}

export function batchUploadTemplates(ids: readonly string[]) {
  return ids
    .filter(id => Boolean(state.templates[id]))
    .map((id) => {
      requestTemplateUpload(id)
      beginTemplateUpload(id)
      return id
    })
}

export function getTemplateHistoryVersions(id: string) {
  return [...(state.history[id] || [])]
}

export function filterTemplateTree(
  nodes: readonly TemplateTreeNode[],
  filter: TemplateTreeFilter,
): TemplateTreeNode[] {
  const keyword = filter.keyword.trim().toLocaleLowerCase()
  const category = filter.category === '全部分类' ? '' : filter.category

  return nodes
    .map(node => filterNode(node, category, keyword))
    .filter((node): node is TemplateTreeNode => node !== null)
}

export function findTemplateTreeNode(
  nodes: readonly TemplateTreeNode[],
  id: string,
): TemplateTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }

    const found = findTemplateTreeNode(node.children || [], id)
    if (found) {
      return found
    }
  }

  return null
}

function createInitialState(): TemplateWorkbenchState {
  const templates = Object.fromEntries(
    Object.entries(initialTemplates).map(([id, template]) => [id, { ...template }]),
  )
  const history = Object.fromEntries(
    Object.values(templates).map(template => [
      template.id,
      [
        historyVersion(template, '初始化版本'),
        {
          ...historyVersion(template, '一期模板导入'),
          id: `${template.id}-history-0`,
          version: 'v0.9',
          savedAt: '2026-05-16 18:00',
        },
      ],
    ]),
  )

  return {
    templateTree: cloneTree(initialTemplateTree),
    templates,
    history,
    openTabs: ['western-home'],
    activeTemplateId: 'western-home',
    nextId: 1,
  }
}

function templateRecord(
  id: string,
  name: string,
  category: string,
  status: TemplateUploadStatus,
  version: string,
  source: string,
  contentTemplateId?: string,
): TemplateRecord {
  return {
    id,
    name,
    fileName: ensureXmlFileName(name),
    category,
    status,
    version,
    updatedAt: today,
    source,
    xml: `<XTextDocument><Body>${name}</Body></XTextDocument>`,
    isDirty: false,
    uploadMessage: status === '已上传' ? '上传完成' : '尚未上传',
    contentTemplateId,
  }
}

async function readTemplateContent(template: TemplateRecord): Promise<TemplateContent> {
  if (!template.contentTemplateId) {
    return toTemplateContent(template)
  }

  try {
    const content = await fetchTemplateContent(template.contentTemplateId)
    template.xml = content.xml
    return {
      id: template.id,
      name: template.name,
      fileName: template.fileName,
      category: template.category,
      xml: content.xml,
    }
  } catch {
    return toTemplateContent(template)
  }
}

function pickActiveTemplateId(activeTemplateId?: string) {
  if (activeTemplateId && state.templates[activeTemplateId]) {
    state.activeTemplateId = activeTemplateId
    return activeTemplateId
  }

  if (state.templates[state.activeTemplateId]) {
    return state.activeTemplateId
  }

  return firstTemplateId() || ''
}

function firstTemplateId() {
  return Object.keys(state.templates)[0]
}

function readTemplateRecord(id: string) {
  const template = state.templates[id]
  if (!template) {
    throw new Error('未找到指定模板。')
  }
  return template
}

function readTreeNode(id: string) {
  const node = findTemplateTreeNode(state.templateTree, id)
  if (!node) {
    throw new Error('未找到指定模板节点。')
  }
  return node
}

function toTemplateContent(template: TemplateRecord): TemplateContent {
  return {
    id: template.id,
    name: template.name,
    fileName: template.fileName,
    category: template.category,
    xml: template.xml,
  }
}

function toTemplateProperties(template: TemplateRecord): TemplateProperties {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    status: template.status,
    version: template.version,
    updatedAt: template.updatedAt,
    fileName: template.fileName,
    source: template.source,
    isDirty: template.isDirty,
    uploadMessage: template.uploadMessage,
  }
}

function toOpenTab(id: string): TemplateOpenTab | null {
  const template = state.templates[id]
  if (!template) {
    return null
  }
  return {
    id: template.id,
    name: template.name,
    fileName: template.fileName,
    isDirty: template.isDirty,
    status: template.status,
  }
}

function historyVersion(template: TemplateRecord, note: string): TemplateHistoryVersion {
  return {
    id: `${template.id}-${template.version}-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    templateId: template.id,
    version: template.version,
    savedAt: `${template.updatedAt} 10:00`,
    operator: '模板制作员',
    note,
  }
}

function updateUploadStatus(id: string, status: TemplateUploadStatus, uploadMessage: string) {
  const template = readTemplateRecord(id)
  template.status = status
  template.uploadMessage = uploadMessage
  template.updatedAt = today
  syncTemplateNode(template)
  ensureOpenTab(id)
  return { ...template }
}

function ensureOpenTab(id: string) {
  if (!state.openTabs.includes(id)) {
    state.openTabs = [...state.openTabs, id]
  }
}

function removeTemplateRecords(node: TemplateTreeNode) {
  if (node.kind === 'template') {
    delete state.templates[node.id]
    delete state.history[node.id]
    state.openTabs = state.openTabs.filter(id => id !== node.id)
    return
  }

  for (const child of node.children || []) {
    removeTemplateRecords(child)
  }
}

function removeTreeNode(id: string) {
  const parent = findParentNode(id)
  if (!parent?.children) {
    return false
  }

  const before = parent.children.length
  parent.children = parent.children.filter(child => child.id !== id)
  return parent.children.length !== before
}

function findParentNode(id: string, nodes = state.templateTree, parent: TemplateTreeNode | null = null): TemplateTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return parent
    }

    const found = findParentNode(id, node.children || [], node)
    if (found) {
      return found
    }
  }

  return null
}

function syncTemplateNode(template: TemplateRecord) {
  const node = findTemplateTreeNode(state.templateTree, template.id)
  if (!node) {
    return
  }

  node.label = template.name
  node.category = template.category
  node.status = template.status
  node.templateId = template.id
}

function updateChildCategory(node: TemplateTreeNode, category: string) {
  for (const child of node.children || []) {
    child.category = category
    if (child.kind === 'template') {
      const template = state.templates[child.id]
      if (template) {
        template.category = category
      }
    }
    updateChildCategory(child, category)
  }
}

function filterNode(
  node: TemplateTreeNode,
  category: string,
  keyword: string,
): TemplateTreeNode | null {
  const children = (node.children || [])
    .map(child => filterNode(child, category, keyword))
    .filter((child): child is TemplateTreeNode => child !== null)

  const matchesCategory = !category || node.category === category || node.kind === 'root'
  const matchesKeyword = !keyword || node.label.toLocaleLowerCase().includes(keyword)
  const isMatch = matchesCategory && matchesKeyword

  if (isMatch || children.length > 0) {
    return { ...node, children }
  }

  return null
}

function collectCategories(nodes: readonly TemplateTreeNode[]) {
  const categories = new Set<string>()
  nodes.forEach((node) => {
    if (node.kind === 'category' && node.category) {
      categories.add(node.category)
    }
    collectCategories(node.children || []).forEach(category => categories.add(category))
  })
  return [...categories]
}

function cloneTree(nodes: readonly TemplateTreeNode[]): TemplateTreeNode[] {
  return nodes.map(node => cloneNode(node))
}

function cloneNode(node: TemplateTreeNode): TemplateTreeNode {
  return {
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }
}

function createId(prefix: string) {
  const id = `${prefix}-${state.nextId}`
  state.nextId += 1
  return id
}

function normalizeName(name: string, fallback: string) {
  return name.trim() || fallback
}

function ensureXmlFileName(name: string) {
  return name.toLocaleLowerCase().endsWith('.xml') ? name : `${name}.xml`
}

function nextVersion(version: string) {
  const match = /^v(\d+)\.(\d+)$/.exec(version)
  if (!match) {
    return 'v1.1'
  }

  return `v${match[1]}.${Number(match[2]) + 1}`
}
