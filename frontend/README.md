# Medical Record Web Editor Frontend

Vue 3 + TypeScript + Vite 前端，用于上传电子病历 XML 并展示 Canvas 预览。

## 启动

```powershell
npm install
npm run dev
```

默认访问 `http://localhost:5173`；如果端口被占用，Vite 会自动换端口。

## 构建

```powershell
npm run build
```

前端通过 Vite 代理访问后端：

- `/api` -> `http://localhost:5190`
- `/renderer` -> `http://localhost:5190`
