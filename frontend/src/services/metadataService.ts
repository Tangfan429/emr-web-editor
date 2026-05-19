import type { MetadataTreeNode } from '../types/editorElement'

export interface MetadataTreeResult {
  tree: MetadataTreeNode[]
  refreshedAt: string
}

const today = '2026-05-18'

const initialMetadataTree: MetadataTreeNode[] = [
  {
    id: 'medical-elements',
    kind: 'group',
    label: '医疗数据元',
    children: [
      metadataItem('chief-complaint', '主诉', 'Medical.ChiefComplaint', '长文本', '患者就诊主要症状或体征。'),
      metadataItem('present-illness', '现病史', 'Medical.PresentIllness', '长文本', '当前疾病发生、发展和诊疗经过。'),
    ],
  },
  {
    id: 'common-elements',
    kind: 'group',
    label: '通用数据元',
    children: [
      metadataItem('patient-name', '患者姓名', 'Patient.Name', '文本', '患者基本信息。'),
      metadataItem('patient-sex', '性别', 'Patient.Sex', '字典', '患者生理性别。'),
      metadataItem('patient-age', '年龄', 'Patient.Age', '数字', '患者年龄。'),
      metadataItem('department', '科室', 'Visit.Department', '字典', '患者当前就诊科室。'),
    ],
  },
  {
    id: 'home-page-elements',
    kind: 'group',
    label: '病案首页',
    children: [
      metadataItem('primary-diagnosis', '主要诊断', 'Diagnosis.Primary', '文本', '出院主要诊断名称。'),
      metadataItem('admission-date', '入院日期', 'Visit.AdmissionDate', '日期时间', '本次住院入院时间。'),
      metadataItem('discharge-date', '出院日期', 'Visit.DischargeDate', '日期时间', '本次住院出院时间。'),
      metadataItem('record-number', '病案号', 'Case.RecordNumber', '文本', '病案首页唯一编号。'),
    ],
  },
  {
    id: 'operation-elements',
    kind: 'group',
    label: '手术信息',
    children: [
      metadataItem('operation-name', '手术名称', 'Operation.Name', '文本', '手术操作名称。'),
      metadataItem('operation-date', '手术日期', 'Operation.Date', '日期时间', '手术开始日期。'),
      metadataItem('operation-doctor', '术者', 'Operation.Doctor', '文本', '主要手术医师。'),
    ],
  },
]

let metadataTree = cloneTree(initialMetadataTree)
let refreshedAt = `${today} 10:00`

export function resetMetadataServiceState() {
  metadataTree = cloneTree(initialMetadataTree)
  refreshedAt = `${today} 10:00`
}

export async function fetchMetadataTree(): Promise<MetadataTreeResult> {
  return {
    tree: cloneTree(metadataTree),
    refreshedAt,
  }
}

export async function refreshMetadataTree(): Promise<MetadataTreeResult> {
  refreshedAt = `${today} 10:30`
  return fetchMetadataTree()
}

export function filterMetadataTree(
  nodes: readonly MetadataTreeNode[],
  keyword: string,
): MetadataTreeNode[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase()
  if (!normalizedKeyword) {
    return cloneTree(nodes)
  }

  return nodes
    .map(node => filterNode(node, normalizedKeyword))
    .filter((node): node is MetadataTreeNode => node !== null)
}

export function findMetadataItem(
  nodes: readonly MetadataTreeNode[],
  id: string,
): MetadataTreeNode | null {
  for (const node of nodes) {
    if (node.id === id && node.kind === 'item') {
      return { ...node }
    }

    const found = findMetadataItem(node.children || [], id)
    if (found) {
      return found
    }
  }

  return null
}

export function flattenMetadataItems(nodes: readonly MetadataTreeNode[]) {
  const items: Array<{ id: string; name: string; code: string; valueType: string }> = []
  for (const node of nodes) {
    if (node.kind === 'item') {
      items.push({
        id: node.id,
        name: node.label,
        code: node.code || '',
        valueType: node.valueType || '文本',
      })
    }
    items.push(...flattenMetadataItems(node.children || []))
  }
  return items
}

function metadataItem(
  id: string,
  label: string,
  code: string,
  valueType: string,
  description: string,
): MetadataTreeNode {
  return {
    id,
    kind: 'item',
    label,
    code,
    valueType,
    description,
  }
}

function filterNode(node: MetadataTreeNode, keyword: string): MetadataTreeNode | null {
  const children = (node.children || [])
    .map(child => filterNode(child, keyword))
    .filter((child): child is MetadataTreeNode => child !== null)

  const matches = [
    node.label,
    node.code,
    node.valueType,
    node.description,
    node.category,
  ].some(value => value?.toLocaleLowerCase().includes(keyword))

  if (matches || children.length > 0) {
    return {
      ...node,
      children,
    }
  }

  return null
}

function cloneTree(nodes: readonly MetadataTreeNode[]): MetadataTreeNode[] {
  return nodes.map(node => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }))
}
