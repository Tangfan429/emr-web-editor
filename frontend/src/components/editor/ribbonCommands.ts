import type { EditorCommandId, WriterCommandPayload } from '../../types/document'

export interface RibbonCommand {
  id: EditorCommandId
  label: string
  icon?: string
  payload: WriterCommandPayload
  requiresWriter?: boolean
}

export interface RibbonGroup {
  id: string
  label: string
  commands: RibbonCommand[]
}

export interface RibbonTab {
  id: string
  label: string
  groups: RibbonGroup[]
}

function command(
  id: EditorCommandId,
  label: string,
  commandName: string,
  parameter: unknown = null,
  showUI = false,
): RibbonCommand {
  return {
    id,
    label,
    payload: {
      commandName,
      showUI,
      parameter,
      executor: 'dc',
    },
    requiresWriter: true,
  }
}

function legacyCommand(
  id: EditorCommandId,
  label: string,
  commandName: string,
  parameter: unknown = null,
  showUI = false,
): RibbonCommand {
  return {
    id,
    label,
    payload: {
      commandName,
      showUI,
      parameter,
      executor: 'legacy',
    },
    requiresWriter: true,
  }
}

export const ribbonTabs: RibbonTab[] = [
  {
    id: 'file',
    label: '文件',
    groups: [{ id: 'save', label: '保存', commands: [] }],
  },
  {
    id: 'start',
    label: '开始',
    groups: [
      {
        id: 'clipboard',
        label: '剪贴板',
        commands: [
          command('undo', '撤销', 'Undo'),
          command('redo', '重做', 'Redo'),
          command('copy', '复制', 'Copy'),
          command('cut', '剪切', 'Cut'),
          command('paste', '粘贴', 'Paste'),
          command('selectAll', '全选', 'selectall'),
        ],
      },
      {
        id: 'format',
        label: '格式',
        commands: [
          command('bold', '加粗', 'bold', true),
          command('italic', '斜体', 'italic', true),
          command('underline', '下划线', 'underline', true),
          command('alignLeft', '左对齐', 'aligntoleft'),
          command('alignCenter', '居中', 'aligntocenter'),
          command('alignRight', '右对齐', 'aligntoright'),
        ],
      },
    ],
  },
  {
    id: 'insert',
    label: '插入',
    groups: [
      {
        id: 'clinical',
        label: '临床控件',
        commands: [
          command('insertInputField', '输入域', 'InsertInputField', null, true),
          command('insertDateTime', '日期时间', 'InsertDatetime', null, true),
          command('insertCheckbox', '勾选框', 'InsertCheckBoxOrRadio', { type: 'checkbox' }, false),
          command('insertRadio', '单选框', 'InsertCheckBoxOrRadio', { type: 'radio' }, false),
          command('insertPageBreak', '分页符', 'insertpagebreak', null, true),
          command('insertPageInfo', '页码', 'InsertPageInfoElement', null, false),
        ],
      },
    ],
  },
  {
    id: 'table',
    label: '表格',
    groups: [
      {
        id: 'table-edit',
        label: '表格编辑',
        commands: [
          command('insertTable', '插入表格', 'InsertTable', null, true),
          command('deleteTable', '删除表格', 'Table_DeleteTable'),
          command('insertRowUp', '上方插入行', 'Table_InsertRowUp'),
          command('insertRowDown', '下方插入行', 'Table_InsertRowDown'),
          command('insertColumnLeft', '左侧插入列', 'Table_InsertColumnLeft'),
          command('insertColumnRight', '右侧插入列', 'Table_InsertColumnRight'),
          command('mergeCell', '合并单元格', 'Table_MergeCell'),
          legacyCommand('splitCell', '拆分单元格', 'Table_SplitCellExt', null, true),
          command('tableProperties', '表格属性', 'tableproperties', null, true),
          command('rowProperties', '行属性', 'tablerowproperties', null, true),
          command('cellProperties', '单元格属性', 'tablecellproperties', null, true),
        ],
      },
    ],
  },
  {
    id: 'print',
    label: '打印',
    groups: [{ id: 'print-actions', label: '打印', commands: [] }],
  },
]

export function findRibbonCommand(id: EditorCommandId) {
  for (const tab of ribbonTabs) {
    for (const group of tab.groups) {
      const found = group.commands.find(command => command.id === id)
      if (found) return found
    }
  }

  return null
}

export function createWriterCommandPayload(id: EditorCommandId): WriterCommandPayload | null {
  return findRibbonCommand(id)?.payload || null
}
