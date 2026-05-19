import type {
  AppCommandId,
  EditorCommandId,
  PlaceholderCommandId,
  WriterCommandPayload,
  WriterEditorCommandId,
} from '../../types/document'

export type CommandKind = 'app' | 'writer' | 'placeholder'

export interface CommandDefinition {
  id: EditorCommandId
  label: string
  kind: CommandKind
  icon?: string
  payload?: WriterCommandPayload
  disabledReason?: string
}

export interface CommandGroup {
  id: string
  label: string
  commands: CommandDefinition[]
}

export interface CommandMenuTab {
  id: string
  label: string
  groups: CommandGroup[]
}

function appCommand(id: AppCommandId, label: string, icon?: string): CommandDefinition {
  return { id, label, icon, kind: 'app' }
}

function placeholderCommand(
  id: PlaceholderCommandId,
  label: string,
  disabledReason = '该能力将在第二阶段接入。',
): CommandDefinition {
  return { id, label, kind: 'placeholder', disabledReason }
}

function writerCommand(
  id: WriterEditorCommandId,
  label: string,
  commandName: string,
  parameter: unknown = null,
  showUI = false,
  icon?: string,
): CommandDefinition {
  return {
    id,
    label,
    icon,
    kind: 'writer',
    payload: {
      commandName,
      showUI,
      parameter,
      executor: 'dc',
    },
  }
}

export const topMenuTabs: CommandMenuTab[] = [
  {
    id: 'file',
    label: '文件',
    groups: [
      {
        id: 'document-lifecycle',
        label: '文档',
        commands: [
          appCommand('importXml', '导入 XML', 'FileUp'),
          appCommand('save', '保存', 'Save'),
          appCommand('saveAsTemplate', '另存为', 'CopyPlus'),
          appCommand('downloadXml', '下载 XML', 'Download'),
          appCommand('uploadTemplate', '上传', 'UploadCloud'),
          appCommand('batchUploadTemplates', '批量上传', 'CloudUpload'),
          appCommand('cancelUpload', '取消上传', 'X'),
          appCommand('historyVersions', '历史版本', 'History'),
        ],
      },
      {
        id: 'print-actions',
        label: '打印',
        commands: [
          appCommand('print', '打印', 'Printer'),
          appCommand('printPreview', '打印预览', 'FileSearch'),
          appCommand('closePrintPreview', '关闭预览', 'X'),
          appCommand('clearDocument', '清空', 'RotateCcw'),
        ],
      },
    ],
  },
  {
    id: 'format',
    label: '格式',
    groups: [
      {
        id: 'clipboard',
        label: '剪贴板',
        commands: [
          writerCommand('undo', '撤销', 'Undo', null, false, 'Undo2'),
          writerCommand('redo', '重做', 'Redo', null, false, 'Redo2'),
          writerCommand('copy', '复制', 'Copy', null, false, 'Copy'),
          writerCommand('cut', '剪切', 'Cut', null, false, 'Scissors'),
          writerCommand('paste', '粘贴', 'Paste', null, false, 'ClipboardPaste'),
          writerCommand('selectAll', '全选', 'selectall', null, false, 'CheckSquare'),
        ],
      },
      {
        id: 'font',
        label: '字体',
        commands: [
          writerCommand('bold', '加粗', 'Bold', null, false, 'Bold'),
          writerCommand('italic', '斜体', 'Italic', null, false, 'Italic'),
          writerCommand('underline', '下划线', 'Underline', null, false, 'Underline'),
          placeholderCommand('fontName', '字体'),
          placeholderCommand('fontSize', '字号'),
          placeholderCommand('foreColor', '文字颜色'),
          placeholderCommand('backColor', '背景颜色'),
        ],
      },
    ],
  },
  {
    id: 'paragraph',
    label: '段落',
    groups: [
      {
        id: 'alignment',
        label: '对齐',
        commands: [
          writerCommand('alignLeft', '左对齐', 'AlignLeft', null, false, 'AlignLeft'),
          writerCommand('alignCenter', '居中', 'AlignCenter', null, false, 'AlignCenter'),
          writerCommand('alignRight', '右对齐', 'AlignRight', null, false, 'AlignRight'),
        ],
      },
      {
        id: 'paragraph-future',
        label: '段落设置',
        commands: [placeholderCommand('pageSettings', '页面设置')],
      },
    ],
  },
  {
    id: 'common',
    label: '常规',
    groups: [
      {
        id: 'clinical-control',
        label: '临床控件',
        commands: [
          writerCommand('insertInputField', '输入域', 'InsertInputField', null, true, 'FileText'),
          writerCommand('insertDateTime', '日期时间', 'InsertDateTimeField', null, true, 'CalendarDays'),
          writerCommand(
            'insertCheckbox',
            '勾选框',
            'InsertCheckBoxOrRadio',
            { Name: 'checkbox', Type: 'checkbox', CaptionFlowLayout: true },
            true,
            'CheckSquare',
          ),
          writerCommand(
            'insertRadio',
            '单选框',
            'InsertCheckBoxOrRadio',
            { Name: 'radio', Type: 'radio', CaptionFlowLayout: true },
            true,
            'CircleDot',
          ),
        ],
      },
      {
        id: 'view-control',
        label: '视图',
        commands: [
          appCommand('zoomOut', '缩小', 'ZoomOut'),
          appCommand('resetZoom', '重置缩放', 'RotateCcw'),
          appCommand('zoomIn', '放大', 'ZoomIn'),
        ],
      },
    ],
  },
  {
    id: 'design',
    label: '设计',
    groups: [
      {
        id: 'template-design',
        label: '模板设计',
        commands: [
          placeholderCommand('templateAudit', '上传审批'),
          placeholderCommand('dataElementManager', '数据元'),
          placeholderCommand('dictionaryManager', '字典'),
          placeholderCommand('dataSourceManager', '数据源'),
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
          writerCommand('insertTable', '插入表格', 'InsertTable', null, true, 'Table'),
          writerCommand('deleteTable', '删除表格', 'Table_DeleteTable', null, false, 'Trash2'),
          writerCommand('insertRowUp', '上方插入行', 'Table_InsertRowUp', null, false, 'Rows3'),
          writerCommand('insertRowDown', '下方插入行', 'Table_InsertRowDown', null, false, 'Rows3'),
          writerCommand('insertColumnLeft', '左侧插入列', 'Table_InsertColumnLeft', null, false, 'Columns3'),
          writerCommand('insertColumnRight', '右侧插入列', 'Table_InsertColumnRight', null, false, 'Columns3'),
          writerCommand('mergeCell', '合并单元格', 'Table_MergeCell', null, false, 'Merge'),
          writerCommand('splitCell', '拆分单元格', 'Table_SplitCellExt', null, true, 'SplitSquareHorizontal'),
          writerCommand('tableProperties', '表格属性', 'tableproperties', null, true, 'Settings'),
          writerCommand('rowProperties', '行属性', 'tablerowproperties', null, true, 'Settings'),
          writerCommand('cellProperties', '单元格属性', 'tablecellproperties', null, true, 'Settings'),
        ],
      },
    ],
  },
  {
    id: 'insert',
    label: '插入',
    groups: [
      {
        id: 'insert-document',
        label: '文档元素',
        commands: [
          writerCommand('insertInputFieldFromInsert', '插入输入域', 'InsertInputField', null, true, 'TextCursorInput'),
          writerCommand(
            'insertRadioFromInsert',
            '插入单选框',
            'InsertCheckBoxOrRadio',
            { Name: 'radio', Type: 'radio', CaptionFlowLayout: true },
            true,
            'CircleDot',
          ),
          writerCommand(
            'insertCheckboxFromInsert',
            '插入复选框',
            'InsertCheckBoxOrRadio',
            { Name: 'checkbox', Type: 'checkbox', CaptionFlowLayout: true },
            true,
            'CheckSquare',
          ),
          appCommand('insertHeaderFooter', '插入页眉页脚', 'PanelTop'),
          appCommand('saveAsHeaderFooter', '另存为页眉页脚', 'SaveAll'),
          appCommand('insertBarcode', '插入条形码', 'Barcode'),
          appCommand('insertQrcode', '插入二维码', 'QrCode'),
          writerCommand('insertPageBreak', '分页符', 'insertpagebreak', null, true, 'FileText'),
          writerCommand(
            'insertPageInfo',
            '页码',
            'InsertPageInfoElement',
            {
              ID: 'pageinfo1',
              Height: '65',
              Width: '400',
              ValueType: 'PageIndex',
              FormatString: '第[%PageIndex%]页 共[%NumOfPages%]页',
            },
            true,
            'Hash',
          ),
        ],
      },
    ],
  },
  {
    id: 'advanced',
    label: '高级',
    groups: [
      {
        id: 'advanced-manage',
        label: '高级管理',
        commands: [
          placeholderCommand('advancedHistoryVersions', '历史版本'),
          placeholderCommand('advancedTemplateAudit', '审批记录'),
          placeholderCommand('advancedPermissions', '权限控制'),
          placeholderCommand('batchReplace', '批量替换'),
          placeholderCommand('signatureSettings', '签名设置'),
        ],
      },
    ],
  },
]

const commandDefinitions = topMenuTabs.flatMap(tab =>
  tab.groups.flatMap(group => group.commands),
)

export const appCommandIds = commandDefinitions
  .filter((command): command is CommandDefinition & { id: AppCommandId; kind: 'app' } => command.kind === 'app')
  .map(command => command.id)

export const writerCommandIds = commandDefinitions
  .filter((command): command is CommandDefinition & { id: WriterEditorCommandId; kind: 'writer' } => command.kind === 'writer')
  .map(command => command.id)

export function findCommandDefinition(id: EditorCommandId) {
  return commandDefinitions.find(command => command.id === id) || null
}

export function createWriterCommandPayload(id: EditorCommandId): WriterCommandPayload | null {
  const definition = findCommandDefinition(id)
  return definition?.kind === 'writer' ? definition.payload || null : null
}
