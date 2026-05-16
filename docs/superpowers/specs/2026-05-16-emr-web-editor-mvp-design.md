# EMR Web Editor MVP 需求设计

## 1. 背景与目标

当前 `emr-web-editor-demo` 已完成电子病历 XML 的本地导入、外部 `WriterControlForWASM` 加载、Canvas 降级预览、打印预览和正式打印接入。它目前更接近“预览/打印 demo”，还不是完整编辑器。

本阶段目标是参考 `D:\DCWriterLite\EMRWriterLite`，将 demo 演进为一个可实际编辑临床文书的 Web 编辑器 MVP。底层编辑、排版、命令、序列化和打印能力优先复用 EMRWriterLite/WriterControl；Vue 前端负责产品化编辑器壳层、状态编排、模板入口、保存、校验和用户交互。

本阶段命名为：**EMR Web Editor MVP：基于 WriterControl 的临床文书编辑器壳层**。

## 2. 已确认范围

### 2.1 编辑器定位

采用“临床文书编辑器 MVP”范围：

- 不停留在基础预览或简单文字编辑。
- 不在第一阶段全量复刻 EMRWriterLite 首页和所有复杂能力。
- 优先补齐临床文书编辑闭环：模板加载、常用编辑、临床控件、表格、保存、校验、打印。

### 2.2 保存边界

采用“双保存链路”：

- 本地 XML 下载：用于快速验收编辑结果。
- 后端保存接口：用于 demo 会话保存，并为后续 HIS/EMR 系统对接预留边界。

### 2.3 工具栏范围

第一阶段工具栏包含：

- 常用编辑命令：撤销、重做、复制、剪切、粘贴、全选。
- 常用格式命令：字体、字号、加粗、斜体、下划线、颜色、背景色、对齐、行距、段前段后。
- 临床文书插入：输入域、日期时间、勾选框、单选框、分页符、页码。
- 表格编辑：插入表格、删除表格、增删行列、合并单元格、拆分单元格、表格/行/单元格属性入口。
- 打印相关：打印预览、关闭预览、正式打印。
- 保存相关：本地下载、保存到后端。

第一阶段暂不默认纳入：

- 权限/痕迹全链路。
- PDF 高级导出。
- 区域打印和复杂打印策略。
- 全量 EMRWriterLite 工具栏复刻。
- 复杂临床质控规则。

### 2.4 模板入口

采用“左侧示例模板列表 + 本地导入”：

- 左侧提供 EMRWriterLite `demoDocuments` 示例模板列表。
- 用户可点击模板加载 XML。
- 保留本地 XML 文件导入。
- 最近打开记录暂不纳入 v1。

### 2.5 主界面布局

采用“模板侧栏 + Ribbon + 编辑区”：

- 左侧：模板列表、本地导入入口。
- 顶部：Ribbon 工具栏，按文件、开始、插入、表格、打印分组。
- 中央：WriterControl 编辑区。
- 底部：状态栏，展示文件名、保存状态、渲染模式、缩放、校验状态、打印预览状态。

### 2.6 校验范围

采用“保存前基础文书校验”：

- 检查必填输入域是否为空。
- 保存前汇总问题列表。
- 支持点击问题后尽量定位到对应字段。
- XML 序列化失败、WriterControl 未加载、保存失败等技术错误单独提示。
- 病历完整性、日期逻辑、诊断/医嘱一致性等复杂临床规则放到第二阶段。

## 3. 技术路线

采用“编辑器壳层 + WriterControl 适配层”。

Vue 前端负责完整应用壳层，底层通过 `WriterControlAdapter` 统一访问 WriterControl 能力。业务组件不得直接散落调用 `LoadDocumentFromString`、`DCExecuteCommand`、`GetCommandStatus`、`SaveDocumentToString`、`PrintDocument` 等底层 API。

这样可以保留 EMRWriterLite 的核心编辑能力，同时避免把原始 `Index.html` 的大量原生脚本逻辑直接搬进 Vue 工程。

## 4. 模块设计

### 4.1 EditorShell

编辑器总容器，负责组织页面结构：

- 左侧模板面板。
- 顶部 Ribbon 工具栏。
- 中央 WriterControl 编辑区。
- 底部状态栏。
- 全局错误提示与保存/校验反馈。

### 4.2 WriterControlAdapter

唯一直接访问 WriterControl 的适配层，负责封装：

- 加载 XML：`LoadDocumentFromString(xml, 'xml', ...)`。
- 执行命令：`DCExecuteCommand(...)` / `ExecuteCommand(...)`。
- 查询命令状态：`GetCommandStatus(...)`。
- 保存 XML：`SaveDocumentToString(...)`。
- 打印预览：`LoadPrintPreview(...)`、`ClosePrintPreview(...)`。
- 正式打印：`PrintDocument(...)`。
- 选择区/字段定位：优先使用现有 API，能力不足时降级为问题列表提示。
- 文档变更监听：接收 WriterControl 的文档内容变更事件，并通知文档会话状态。

### 4.3 RibbonCommandRegistry

统一维护 Ribbon 按钮与 WriterControl 命令之间的映射：

- 命令 id。
- 展示名称。
- 图标。
- 分组。
- WriterControl 命令名。
- 是否需要参数。
- 是否需要弹窗或二次输入。
- 命令可用状态查询方式。

组件只发出统一命令对象，具体转发逻辑集中在 registry 和 adapter 内。

### 4.4 TemplatePanel / TemplateService

负责模板入口：

- 从后端或静态路径读取模板列表。
- 展示模板名称。
- 点击模板后拉取 XML 内容。
- 将 XML 交给文档会话和 WriterControlAdapter 加载。
- 保留本地 XML 导入入口。

### 4.5 DocumentSessionStore

负责当前文档会话状态：

- 当前文档 id。
- 文件名。
- 来源：模板或本地导入。
- 原始 XML。
- 最近一次保存后的 XML 快照。
- 是否存在未保存变更。
- 是否正在加载、保存、校验或打印预览。
- 最近错误信息。

### 4.6 DocumentSaveService

负责保存链路：

- 从 WriterControlAdapter 获取最新 XML。
- 执行保存前基础校验。
- 本地下载 XML。
- 调用后端保存接口。
- 保存成功后更新文档会话状态。
- 保存失败时返回结构化错误。

### 4.7 DocumentValidationService

负责基础文书校验：

- 从 WriterControl 或最新 XML 中读取可校验字段。
- 识别必填输入域。
- 判断字段值是否为空。
- 生成问题列表：字段 id、字段名、提示文案、严重级别、定位参数。
- 提供问题定位入口。

### 4.8 StatusBar

展示关键运行状态：

- 当前文件名。
- 保存状态：已保存/未保存/保存中/保存失败。
- 渲染模式：外部渲染/结构化预览。
- 打印预览状态。
- 校验状态。
- 缩放状态。

## 5. 数据流

### 5.1 加载文档

1. 用户从左侧模板列表选择模板，或从本地导入 XML。
2. `TemplateService` 或导入逻辑读取 XML。
3. `DocumentSessionStore` 创建或更新当前文档会话。
4. `WriterControlAdapter` 调用 `LoadDocumentFromString(xml, 'xml', ...)`。
5. 加载成功后进入可编辑状态。
6. 加载失败时显示错误，且不得把 Canvas 降级预览误认为完整编辑器。

### 5.2 执行编辑命令

1. 用户点击 Ribbon 按钮。
2. Ribbon 组件发出统一命令 id。
3. `RibbonCommandRegistry` 查找对应 WriterControl 命令和参数规则。
4. `WriterControlAdapter` 调用 `DCExecuteCommand(...)` 或 `ExecuteCommand(...)`。
5. 命令执行后更新命令状态和文档脏状态。

### 5.3 保存文档

1. 用户点击保存或下载 XML。
2. `DocumentSaveService` 触发保存前校验。
3. 校验失败时展示问题列表并阻止保存。
4. 校验通过后，`WriterControlAdapter` 调用 `SaveDocumentToString(...)` 获取最新 XML。
5. 本地下载链路生成 XML 文件。
6. 后端保存链路提交 XML、文件名、会话 id 等信息。
7. 保存成功后更新 `DocumentSessionStore` 的保存快照和状态。

### 5.4 打印与预览

1. 用户点击打印预览。
2. `WriterControlAdapter` 调用 `LoadPrintPreview(...)`。
3. 用户关闭预览时调用 `ClosePrintPreview(...)`。
4. 用户正式打印时调用 `PrintDocument(...)`。
5. 打印仍复用现有 SVG DOM + 浏览器 `print()` 链路。

## 6. 后端接口边界

v1 后端保持轻量，优先服务模板和保存闭环。

### 6.1 模板接口

- `GET /api/templates`
  - 返回示例模板列表。
  - 字段建议：`id`、`name`、`fileName`、`category`。

- `GET /api/templates/{id}`
  - 返回模板 XML 内容。
  - 可同时返回模板元信息。

### 6.2 文档保存接口

- `POST /api/documents/save`
  - 请求字段建议：`sessionId`、`fileName`、`xml`、`source`、`updatedAt`。
  - v1 可先保存到临时会话、内存 store 或本地 demo 存储。
  - 后续可替换为真实 HIS/EMR 保存接口。

### 6.3 渲染资源接口

继续保留：

- `/renderer/*` 静态资源代理。
- 必要的 renderer 状态检查能力。

## 7. 错误处理与降级

- WriterControl 加载失败时，显示明确错误，提示当前无法编辑。
- Canvas 结构化预览只能作为降级预览，不作为完整编辑器。
- 命令不可用时，Ribbon 按钮应置灰或给出提示。
- 保存失败要区分校验失败、序列化失败、后端失败和未知异常。
- 打印预览失败时应允许恢复到普通编辑状态。
- 用户存在未保存变更时，切换模板或导入新文件前需要确认。

## 8. 验收标准

v1 完成后至少满足：

- 能从左侧模板列表加载 EMRWriterLite 示例 XML。
- 能本地导入 XML 并进入可编辑状态。
- 能执行常用格式命令、临床控件插入命令和表格编辑命令。
- 编辑后状态栏显示“未保存”，保存成功后恢复“已保存”。
- 能导出最新 XML 文件，重新导入后保留编辑结果。
- 能调用后端保存接口保存当前 XML。
- 保存前能拦截必填空字段，并显示问题汇总。
- 点击校验问题时能尽量定位到对应字段；无法定位时要明确提示。
- 打印预览、关闭预览、正式打印仍可用。
- 外部 WriterControl 不可用时，有明确降级提示。
- 构建通过。
- 关键单元测试通过，至少覆盖 Adapter、命令映射、保存服务、校验服务。

## 9. 后续阶段建议

第二阶段可继续补充：

- 权限、痕迹、修订和留痕。
- 更完整的属性面板。
- PDF 导出。
- 区域打印和高级打印选项。
- 最近打开记录。
- 更复杂的临床质控规则。
- HIS/EMR 真实接口对接。
- AI 文书助手或保存前智能检查。
