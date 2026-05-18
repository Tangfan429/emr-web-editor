# 都昌电子病历编辑器完整版迭代第二阶段交接

## 第二阶段完成清单

- 已在第一阶段工作台基础上增量实现模板制作闭环，没有重做顶部菜单、左侧模板树、中左辅助区、编辑区、右侧属性栏和底部状态栏布局。
- 已补齐模板目录新建、重命名、删除入口。
- 已补齐模板文件新建、重命名、删除、打开入口。
- 已实现多页签打开模板，页签展示上传状态和未保存标记。
- 已实现当前模板未保存状态提示，WriterControl 内容变更会同步模板 dirty 状态。
- 已实现保存、另存为；保存继续保留第一阶段后端保存链路，同时同步模板版本和历史记录。
- 已实现上传、批量上传、取消上传的前端状态流转。
- 已实现历史版本查看入口和 mock 数据展示。
- 已保留本地 XML 导入入口，并保留导出当前 XML 到本地入口。
- 已将模板属性面板与当前模板状态联动，展示文件名、状态、版本、来源、未保存和上传说明。
- 所有模板业务数据访问集中在 `templateWorkbenchService`，组件只触发事件和消费 service 返回数据。

## 修改文件列表

- `frontend/src/types/document.ts`
- `frontend/src/services/templateWorkbenchService.ts`
- `frontend/src/services/templateWorkbenchService.test.ts`
- `frontend/src/services/documentSaveService.ts`
- `frontend/src/services/documentSaveService.test.ts`
- `frontend/src/components/editor/commandRegistry.ts`
- `frontend/src/components/editor/commandRegistry.test.ts`
- `frontend/src/components/editor/EditorShell.vue`
- `frontend/src/components/editor/TemplateTreePanel.vue`
- `frontend/src/components/editor/TemplateTreeNode.vue`
- `frontend/src/components/editor/WorkbenchTopMenu.vue`
- `frontend/src/components/editor/WorkbenchEditorArea.vue`
- `frontend/src/components/editor/PropertyInspectorPanel.vue`
- `docs/handoffs/emr-full-editor-phase-2.md`

## 模板 CRUD 设计说明

`templateWorkbenchService.ts` 维护二期前端 mock 状态：模板树、模板记录、打开页签、当前模板、历史版本和上传状态。目录和文件 CRUD 都通过 service 函数完成：

- 目录：`createTemplateDirectory`、`renameTemplateDirectory`、`deleteTemplateDirectory`。
- 文件：`createTemplateFile`、`renameTemplateFile`、`deleteTemplateFile`、`openTemplateContent`。
- 查询：`fetchTemplateWorkbenchData`、`findTemplateTreeNode`、`filterTemplateTree`、`getTemplateContent`。

`EditorShell.vue` 只作为组合层：模板树事件进入 Shell，再调用 service，之后通过 `fetchTemplateWorkbenchData(activeId)` 刷新各面板。第一阶段的 `commandRegistry`、service 层、types 和组件边界仍保留。

## 上传状态流转说明

模板上传状态类型扩展为：`未上传`、`待上传`、`上传中`、`已取消`、`已上传`、`上传失败`。

- 单模板上传：`requestTemplateUpload` 进入 `待上传`，`beginTemplateUpload` 进入 `上传中`，`completeTemplateUpload` 进入 `已上传`。
- 批量上传：`batchUploadTemplates` 对打开页签里的模板批量进入队列和上传中，Shell 再模拟完成。
- 取消上传：`cancelTemplateUpload` 将当前模板置为 `已取消`。

当前上传是前端状态流转 mock，没有真实网络上传。后续接真实 API 时应替换 service 内部实现，不应改组件事件边界。

## 历史版本 Mock/Service 边界

历史版本由 `TemplateHistoryVersion` 描述，保存在 `templateWorkbenchService` 内部 `history` 状态中。保存模板、另存为、上传完成会追加 mock 历史记录。右侧属性面板只消费 `historyVersions`，不生成或硬编码业务数据。

## 当前已知问题

- 模板目录、模板文件和上传状态仍为前端内存 mock，刷新页面后不会持久化。
- 历史版本只展示 mock 数据，暂不支持回滚、对比和真实审计。
- 另存为、新建、重命名、删除使用浏览器 `prompt/confirm`，第三阶段可替换为统一弹窗组件。
- 当前二期上传用定时器模拟，不代表真实后端上传进度。
- 右侧元素属性仍沿用第一阶段 mock，占位等待 WriterControl 当前元素选择事件。
- 页面验证时若外部 WriterControl 资源加载慢，Canvas 降级预览仍会出现，但保存、导入导出、模板树和状态流转入口可验证。
- 本地 XML 导入要求文件是 WriterControl/DCWriter 可加载的 XML；普通示例 XML（如 `backend/sample-data/sample-record.xml`）会触发底层 WriterControl 空引用错误，已用 `backend/renderer-source/demoDocuments/Admission Record.xml` 验证可正常导入。

## 第三阶段推荐入口

1. 将 `templateWorkbenchService` 的内存状态替换为真实模板 CRUD、上传和历史版本 API。
2. 为新建/重命名/删除/另存为替换统一弹窗，补充表单校验和失败反馈。
3. 接入真实上传进度、上传失败重试、取消上传请求。
4. 接入历史版本对比、恢复、审计记录。
5. 在 `writerControlAdapter` 增加当前元素选择/属性读取/属性更新薄适配，替换右侧元素属性 mock。

## 禁止后续阶段推翻的设计决策

- 不要重做第一阶段工作台布局。
- 不要绕过 `commandRegistry` 在按钮里硬编码命令。
- 不要把模板 CRUD、上传、历史版本逻辑写进 Vue 组件，必须继续从 `templateWorkbenchService` 或其真实 API 实现进入。
- 不要删除或替换第一阶段 WriterControl 适配、保存、打印、打印预览链路。
- 不要让右侧属性面板直接访问 WriterControl 私有结构；必须经 adapter 或 service 边界。

## 验收命令与结果

- `npm test`
  - 结果：通过，14 个测试文件、86 个测试全部通过。
- `npm run build`
  - 结果：通过，`vue-tsc -b` 与 `vite build` 均成功。
- MCP Playwright 页面验证
  - 结果：通过，验证地址 `http://127.0.0.1:5173/`。
  - 已确认模板树显示目录、模板文件、状态标签和目录/模板操作入口。
  - 已确认点击 `西医病案首页` 后打开模板，进入外部渲染，保存、另存为、下载 XML、上传、批量上传、取消上传、历史版本、打印和打印预览入口启用。
  - 已确认保存后状态栏保持 `已保存`，右侧模板属性与当前模板联动。
  - 已确认另存为通过 prompt 新建模板，模板树新增文件，编辑区出现多页签，右侧属性切到新模板。
  - 已确认单模板上传可从 `未上传` 流转到 `已上传`，取消上传可流转到 `已取消`，批量上传可将打开页签批量流转到 `已上传`。
  - 已确认历史版本入口可展开，展示保存、另存为和上传产生的 mock 版本记录。
  - 已确认下载 XML 入口会创建 `blob:` URL、设置 `download="西医病案首页.xml"`、挂载临时 anchor、点击并清理；Playwright 的 download 事件未捕获到 blob 下载，但 DOM 探针确认导出链路触发。
  - 已确认导入本地 DCWriter XML 文件 `backend/renderer-source/demoDocuments/Admission Record.xml` 后进入外部渲染，状态栏显示 `Admission Record.xml` 与 `已保存`。
  - 已确认打印预览进入 `打印预览中`，关闭预览恢复 `编辑模式`，第一阶段打印预览能力未回退。
  - 页面验证期间无新增 Vue 运行时错误；仅见外部 WASM 版本提示和浏览器剪贴板权限提示。
