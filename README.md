# Medical Record Web Editor Demo

这是一个用于演示电子病历 XML Web 化预览的前后端分离项目。项目采用 Vue 3 + Vite + TypeScript 构建前端界面，使用 .NET 9 Minimal API 提供 XML 导入、基础校验、脱敏和可选渲染资源代理能力。

仓库内容已按公开演示用途整理：不包含真实患者信息、不包含本地运行日志、不包含构建产物，也不包含需要额外授权的渲染运行时资源。

## 功能范围

- 上传 XML 文件并创建临时文档会话。
- 对导入 XML 做基础格式校验和敏感标识清理。
- 在浏览器中提供 Canvas 预览、缩放和打印。
- 在缺少外部渲染资源时自动降级为结构化预览。
- 预留 `/renderer/*` 静态路径，用于本地接入已有渲染资源。

## 项目结构

```text
.
├─ backend/                  .NET 9 Minimal API
│  ├─ Program.cs             API、静态资源代理和 XML 脱敏逻辑
│  ├─ sample-data/           脱敏演示 XML
│  └─ appsettings*.json      本地渲染资源路径配置
├─ frontend/                 Vue 3 + Vite + TypeScript
│  ├─ src/components/editor/ 编辑器界面组件
│  ├─ src/composables/       导入和渲染逻辑
│  └─ package.json           前端脚本和依赖
└─ .gitignore                上传 GitHub 前的忽略规则
```

## 环境要求

- .NET SDK 9.0 或以上
- Node.js 20.19 或以上
- npm

## 本地启动

启动后端：

```powershell
cd .\backend
dotnet run
```

启动前端：

```powershell
cd .\frontend
npm install
npm run dev
```

默认地址：

- 后端：`http://localhost:5190`
- 前端：`http://localhost:5173`

Vite 已允许端口自动递增；如果 `5173` 被占用，会自动切换到下一个可用端口。

## 可选渲染资源

仓库不提交外部渲染运行时和专有静态资源。需要在本地接入时，可把资源放在以下目录，或通过 `backend/appsettings*.json` 修改路径：

```text
backend/renderer-source/
backend/renderer-runtime/
backend/renderer-assets/
```

缺少这些资源时，前端仍可上传 XML 并显示结构化 Canvas 预览。

## 示例数据

演示 XML 位于：

```text
backend/sample-data/sample-record.xml
```

该文件只包含合成演示内容，不应替换为真实病历或患者资料后提交到公开仓库。

## 上传前检查

建议上传前执行：

```powershell
cd .\frontend
npm run build
cd ..\backend
dotnet build
```

同时确认没有提交以下内容：

- `frontend/node_modules/`
- `frontend/dist/`
- `backend/bin/`
- `backend/obj/`
- `backend/artifacts/`
- `backend/renderer-source/`
- `backend/renderer-runtime/`
- `*.log`
- 调试截图或临时 JSON
