import type { FragmentTemplateTreeNode } from '../types/editorElement'

export interface FragmentTemplateTreeResult {
  tree: FragmentTemplateTreeNode[]
  refreshedAt: string
}

const today = '2026-05-18'

const initialFragmentTemplateTree: FragmentTemplateTreeNode[] = [
  {
    id: 'fragment-inpatient',
    kind: 'group',
    label: '住院病历',
    children: [
      fragmentItem(
        'chief-complaint',
        '通用入院主诉',
        '住院病历',
        '患者因“反复不适 3 天”入院。',
      ),
      fragmentItem(
        'physical-exam',
        '体格检查片段',
        '住院病历',
        '查体：神志清楚，精神可，心肺腹查体未见明显异常。',
      ),
    ],
  },
  {
    id: 'fragment-nursing',
    kind: 'group',
    label: '护理病历',
    children: [
      fragmentItem(
        'nursing-risk',
        '护理风险说明',
        '护理病历',
        '已完成跌倒、压疮、管路滑脱等风险评估。',
      ),
    ],
  },
  {
    id: 'fragment-operation',
    kind: 'group',
    label: '手术信息',
    children: [
      fragmentItem(
        'post-operation-course',
        '术后首次病程',
        '手术信息',
        '患者术后安返病房，生命体征平稳，切口敷料清洁干燥。',
      ),
      fragmentItem(
        'operation-summary',
        '手术记录摘要',
        '手术信息',
        '麻醉满意，手术过程顺利，术中出血少。',
      ),
    ],
  },
]

let fragmentTemplateTree = cloneTree(initialFragmentTemplateTree)
let refreshedAt = `${today} 10:00`

export function resetFragmentTemplateServiceState() {
  fragmentTemplateTree = cloneTree(initialFragmentTemplateTree)
  refreshedAt = `${today} 10:00`
}

export async function fetchFragmentTemplateTree(): Promise<FragmentTemplateTreeResult> {
  return {
    tree: cloneTree(fragmentTemplateTree),
    refreshedAt,
  }
}

export async function refreshFragmentTemplateTree(): Promise<FragmentTemplateTreeResult> {
  refreshedAt = `${today} 10:30`
  return fetchFragmentTemplateTree()
}

export function filterFragmentTemplateTree(
  nodes: readonly FragmentTemplateTreeNode[],
  keyword: string,
): FragmentTemplateTreeNode[] {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase()
  if (!normalizedKeyword) {
    return cloneTree(nodes)
  }

  return nodes
    .map(node => filterNode(node, normalizedKeyword))
    .filter((node): node is FragmentTemplateTreeNode => node !== null)
}

export function findFragmentTemplate(
  nodes: readonly FragmentTemplateTreeNode[],
  id: string,
): FragmentTemplateTreeNode | null {
  for (const node of nodes) {
    if (node.id === id && node.kind === 'item') {
      return { ...node }
    }

    const found = findFragmentTemplate(node.children || [], id)
    if (found) {
      return found
    }
  }

  return null
}

export function flattenFragmentTemplates(nodes: readonly FragmentTemplateTreeNode[]) {
  const items: Array<{ id: string; name: string; category: string }> = []
  for (const node of nodes) {
    if (node.kind === 'item') {
      items.push({
        id: node.id,
        name: node.label,
        category: node.category || '',
      })
    }
    items.push(...flattenFragmentTemplates(node.children || []))
  }
  return items
}

function fragmentItem(
  id: string,
  label: string,
  category: string,
  text: string,
): FragmentTemplateTreeNode {
  return {
    id,
    kind: 'item',
    label,
    category,
    description: text,
    xml: createFragmentDocumentXml(text),
    insertMode: 'writer-command',
  }
}

function createFragmentDocumentXml(text: string) {
  const safeText = escapeXml(text)

  return `<?xml version="1.0" encoding="utf-8"?>
<XTextDocument xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" EditorVersionString="1.2015.12.23">
   <Attributes />
   <XElements>
      <Element xsi:type="XTextBody">
         <Attributes />
         <AcceptTab>true</AcceptTab>
         <XElements>
            <Element xsi:type="XString">
               <XElements xsi:nil="true" />
               <Text>${safeText}</Text>
            </Element>
            <Element xsi:type="XParagraphFlag" />
         </XElements>
      </Element>
   </XElements>
   <BodyText>${safeText}</BodyText>
   <ContentStyles>
      <Default xsi:type="DocumentContentStyle">
         <FontName>宋体</FontName>
         <FontSize>12</FontSize>
      </Default>
      <Styles />
   </ContentStyles>
   <FileFormat>XML</FileFormat>
</XTextDocument>`
}

function filterNode(node: FragmentTemplateTreeNode, keyword: string): FragmentTemplateTreeNode | null {
  const children = (node.children || [])
    .map(child => filterNode(child, keyword))
    .filter((child): child is FragmentTemplateTreeNode => child !== null)

  const matches = [
    node.label,
    node.category,
    node.description,
  ].some(value => value?.toLocaleLowerCase().includes(keyword))

  if (matches || children.length > 0) {
    return {
      ...node,
      children,
    }
  }

  return null
}

function cloneTree(nodes: readonly FragmentTemplateTreeNode[]): FragmentTemplateTreeNode[] {
  return nodes.map(node => ({
    ...node,
    children: node.children ? cloneTree(node.children) : undefined,
  }))
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
