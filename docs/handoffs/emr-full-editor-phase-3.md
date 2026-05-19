# 都昌电子病历编辑器完整版迭代第三阶段交接

## 第三阶段完成清单

- 已在第一、第二阶段工作台基础上增量实现高级编辑能力入口，没有重做工作台布局、命令注册、service 边界或 WriterControl 保存/打印链路。
- 已在 `commandRegistry` 补齐“插入”菜单高级入口：插入输入域、插入单选框、插入复选框、插入页眉页脚、另存为页眉页脚、插入条形码、插入二维码。
- 已新增元数据树 service 与左侧元数据面板，支持树形展示、搜索、刷新、选择、绑定到当前输入域、插入为输入域。
- 已新增片段模板 service 与左侧片段模板面板，支持树形展示、搜索、刷新、选择、插入入口。
- 已将右侧元素属性从静态 mock 占位升级为响应式属性编辑区，支持输入域、单选框、复选框、表格、表格行、单元格、条码、二维码、页眉页脚 mock 类型切换。
- 已新增 `useElementInspector`、`elementPropertyService`、`writerElementAdapter` 边界，属性更新会返回成功、底层不支持、当前未选中元素、更新失败等状态反馈。
- 输入域支持名称、编码、默认值、只读、必填、可见性、数据元绑定编辑；绑定/插入数据元时优先走 `InsertInputField` WriterControl 命令。
- 单选框、复选框支持控件类型、显示文本、绑定值、默认选中、候选项展示；候选项集中由 `elementPropertyService` mock service 提供。
- 表格能力保留二阶段入口，并补齐表格、表格行、单元格三类属性面板骨架和状态联动。
- 条码、二维码、页眉页脚入口已建立前端配置状态和清晰“不支持”反馈，不静默失败。

## 修改文件列表

- `frontend/src/types/document.ts`
- `frontend/src/types/editorElement.ts`
- `frontend/src/components/editor/EditorShell.vue`
- `frontend/src/components/editor/WorkbenchTopMenu.vue`
- `frontend/src/components/editor/WorkbenchAssistPanel.vue`
- `frontend/src/components/editor/MetadataPanel.vue`
- `frontend/src/components/editor/FragmentTemplatePanel.vue`
- `frontend/src/components/editor/PropertyInspectorPanel.vue`
- `frontend/src/components/editor/TemplatePropertiesPanel.vue`
- `frontend/src/components/editor/ElementPropertiesPanel.vue`
- `frontend/src/components/editor/commandRegistry.ts`
- `frontend/src/components/editor/commandRegistry.test.ts`
- `frontend/src/composables/useElementInspector.ts`
- `frontend/src/services/metadataService.ts`
- `frontend/src/services/metadataService.test.ts`
- `frontend/src/services/fragmentTemplateService.ts`
- `frontend/src/services/fragmentTemplateService.test.ts`
- `frontend/src/services/elementPropertyService.ts`
- `frontend/src/services/elementPropertyService.test.ts`
- `frontend/src/services/templateWorkbenchService.ts`
- `frontend/src/services/templateWorkbenchService.test.ts`
- `frontend/src/utils/writerElementAdapter.ts`
- `frontend/src/utils/writerElementAdapter.test.ts`
- `docs/handoffs/emr-full-editor-phase-3.md`

## 新增组件结构说明

- `WorkbenchAssistPanel.vue`：继续作为中左辅助区外壳，只负责元数据/片段模板页签切换和事件透传。
- `MetadataPanel.vue`：负责元数据树搜索、刷新、选择、绑定、插入为输入域入口。
- `FragmentTemplatePanel.vue`：负责片段模板树搜索、刷新、选择和插入入口。
- `PropertyInspectorPanel.vue`：继续作为右侧属性栏外壳，只负责模板属性/元素属性页签。
- `TemplatePropertiesPanel.vue`：承载模板属性和历史版本展示，延续第二阶段模板状态联动。
- `ElementPropertiesPanel.vue`：承载输入域、选项控件、表格、条码二维码等元素属性编辑 UI。

## Command Registry 新增命令清单

- `insertInputFieldFromInsert`：WriterControl `InsertInputField`
- `insertRadioFromInsert`：WriterControl `InsertCheckBoxOrRadio`
- `insertCheckboxFromInsert`：WriterControl `InsertCheckBoxOrRadio`
- `insertHeaderFooter`：应用层 mock/adapter 占位
- `saveAsHeaderFooter`：应用层 mock/adapter 占位
- `insertBarcode`：应用层 mock/adapter 占位
- `insertQrcode`：应用层 mock/adapter 占位

## WriterControl Adapter 支持与不支持能力说明

- 已继续复用既有 `createWriterControlAdapter` 的 `DCExecuteCommand`、`ExecuteCommand`、`LoadDocumentFromString`、`SaveDocumentToString`、打印、打印预览能力。
- 输入域插入：可通过 `InsertInputField` 执行；元数据插入为输入域会构造 `ID`、`Name`、`BackgroundText`、`BindingPath`、`EnableValueValidate` 等参数。
- 单选框/复选框插入：菜单可通过 `InsertCheckBoxOrRadio` 执行；候选项属性面板为 mock service 数据。
- 表格命令：沿用二阶段已接入的 `InsertTable`、`Table_DeleteTable`、`Table_MergeCell`、`Table_SplitCellExt`、`tableproperties`、`tablerowproperties`、`tablecellproperties` 等命令分发。
- 当前元素读取/写入：新增 `writerElementAdapter`，会尝试 `GetCurrentElement`、`CurrentElement`、`Selection.CurrentElement`、`SetCurrentElementProperties`、`SetCurrentElementProperty` 等薄适配；当前外部 WriterControl 未确认暴露这些接口时会返回“不支持”并保留前端 mock 状态。
- 片段模板插入：新增 `insertFragmentTemplate` 适配，尝试 `InsertFragmentFromString` / `LoadFragmentFromString`；当前未确认底层暴露时返回用户可见“不支持”。
- 条码、二维码、页眉页脚：当前未在参考 `toolboxdescription.json` 中找到可靠插入命令，第三阶段只建立前端配置、adapter 边界和不支持提示，不写入文档 XML。

## 元数据 Service/Mock 边界

`metadataService.ts` 集中提供 mock 数据，不写死在 Vue 组件中：

- 分组：医疗数据元、通用数据元、病案首页、手术信息。
- 能力：`fetchMetadataTree`、`refreshMetadataTree`、`filterMetadataTree`、`findMetadataItem`、`flattenMetadataItems`。
- 后续接真实 API 时替换 service 内部数据源，`MetadataPanel` 与 `EditorShell` 事件边界保持不变。

## 片段模板 Service/Mock 边界

`fragmentTemplateService.ts` 集中提供 mock 数据，不写死在 Vue 组件中：

- 分组：住院病历、护理病历、手术信息。
- 能力：`fetchFragmentTemplateTree`、`refreshFragmentTemplateTree`、`filterFragmentTemplateTree`、`findFragmentTemplate`、`flattenFragmentTemplates`。
- 当前片段包含 mock XML 字符串；插入优先走 `writerElementAdapter`，不支持时显示明确提示。

## 元素属性联动设计说明

- `useElementInspector` 是属性联动 composable，维护当前元素属性、更新状态、类型切换、绑定元数据、从 WriterControl 读取当前元素。
- `elementPropertyService` 管理默认元素属性、mock 选项候选项、元数据绑定、输入域/选项控件 WriterControl 参数转换。
- `writerElementAdapter` 是唯一尝试读写 WriterControl 当前元素属性的薄适配，Vue 组件不直接访问 WriterControl 私有结构。
- `ElementPropertiesPanel` 只接收 `element` 和 `status`，通过 `update`、`selectType`、`refresh` 事件向上提交。
- 属性更新状态会在右侧面板展示：成功、不支持、未选中、失败，不静默吞掉底层能力缺口。

## 当前已知问题

- 元数据、片段模板、候选项、页眉页脚库仍为前端 mock，刷新页面不会持久化用户配置。
- 当前 WriterControl 当前元素选择事件/属性读写接口未确认可用，因此右侧属性面板主要保持前端 mock 状态；若底层暴露接口，优先在 `writerElementAdapter` 中接入。
- 条码、二维码、页眉页脚插入没有可靠底层命令，当前只显示配置和不支持提示，不修改文档内容。
- 片段模板插入未确认底层接口，当前 adapter 会显式返回“不支持”，不会破坏保存 XML。
- MCP Playwright 验收未完成：首次打开 `http://127.0.0.1:5173/` 时 MCP 调用等待超时，随后 Playwright MCP transport closed，工具通道未恢复。页面/API 通过本地 HTTP 探针确认可访问，但这不能替代 MCP 页面验收。

## 第四阶段推荐入口

1. 与 WriterControl/ DCWriter 维护方确认当前元素选择、属性读取、属性写入、片段插入、条码二维码、页眉页脚真实命令或 JS API。
2. 在 `writerElementAdapter.ts` 中接真实 API，并补充红绿测试覆盖真实返回形态。
3. 将 `metadataService.ts`、`fragmentTemplateService.ts`、`elementPropertyService.ts` 的 mock 数据替换为真实数据元、片段模板、值域/候选项接口。
4. 为页眉页脚建立 service/API 边界，支持库管理、另存为、插入复用。
5. 若要做复杂表格设计器，应在当前表格属性骨架之上增量扩展，不要重写表格命令链路。

## 禁止后续阶段推翻的设计决策

- 不要重做第一、第二阶段工作台布局、多页签、模板树、保存上传闭环。
- 不要绕过 `commandRegistry` 在按钮里硬编码命令。
- 不要让 Vue 属性组件直接访问 WriterControl 私有结构；必须经 `writerElementAdapter` 或同级 adapter。
- 不要把元数据、片段模板、候选项 mock 数据写进组件；必须继续放在 service 层。
- 不要删除或替换既有保存 XML、下载 XML、打印、打印预览链路。
- 底层不支持的能力必须继续显示明确反馈，不允许静默失败。

## 验收命令与结果

- `npm test`
  - 结果：通过，18 个测试文件、99 个测试全部通过。
- `npm run build`
  - 结果：通过，`vue-tsc -b` 与 `vite build` 均成功。
- 本地服务探针
  - `http://127.0.0.1:5173/` 返回 200。
  - `http://localhost:5190/api/templates` 返回 200。
- MCP Playwright 页面验证
  - 结果：未完成。
  - 过程：调用 MCP Playwright 打开 `http://127.0.0.1:5173/` 超时；随后 `browser_snapshot`、`browser_close`、`browser_tabs`、`browser_run_code_unsafe` 均超时。清理 Playwright MCP 相关进程后工具返回 `Transport closed`，未能恢复自动化通道。
  - 后续建议：恢复 MCP Playwright 服务后，重点验证插入菜单、元数据搜索/刷新/选择/插入、片段模板搜索/选择/插入、元素属性类型切换、输入域属性编辑状态反馈、保存、打印、打印预览入口。
