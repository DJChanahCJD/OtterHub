---
name: next-starter
description: 快速初始化 Next.js + Shadcn UI + Tailwind CSS 项目骨架。适用于纯前端新项目创建或现有项目标准化。
---

# 核心流程

1. **初始化项目环境**
   - 运行 `npx create-next-app@latest`（如果项目未初始化）。
   - 安装核心依赖：`npm install lucide-react next-themes react-dom sonner tailwind-merge class-variance-authority clsx`。

2. **同步资产文件**
   - **Shadcn 配置**: 将 [components.json](assets/components.json) 写入根目录。
   - **基础布局**: 将 [layout.tsx](assets/layout.tsx) 写入 `app/layout.tsx`。
   - **基础工具**: 将 [utils.ts](assets/utils.ts) 写入 `lib/utils.ts`。
   - **类型定义**: 将 [types.ts](assets/types.ts) 写入 `lib/types.ts`。
   - **API 请求封装**: 将 [api.ts](assets/api.ts) 写入 `lib/api.ts`。
   - **本地存储管理**: 将 [local-storage.ts](assets/local-storage.ts) 写入 `lib/local-storage.ts`。
   - **Next.js 配置**: 将 [next.config.js](assets/next.config.js) 写入 `next.config.mjs`。
   - **环境变量**: 将 [.env.local](assets/.env.local) 写入根目录。

3. **初始化 Shadcn UI**
   - 运行 `npx shadcn-ui@latest init`（基于 `components.json`）。

# 关键规则

- **强制类型安全**: 必须在 `lib/types.ts` 中定义所有 API 响应类型，并配合 `ApiResponse<T>` 使用。
- **请求封装**: 所有 API 调用必须通过 `lib/utils.ts` 中的 `request` 函数，以确保一致的错误处理（401 重定向）和业务状态检查。
- **状态管理**: 优先使用 Zustand 管理全局状态，避免直接操作 `window.localStorage`。
- **主题约束**: 强制使用 `next-themes` 的 `ThemeProvider`，默认主题设为 `light`。
- **构建优化**: `next.config.mjs` 默认开启 `output: 'export'`，适用于静态站点托管。
- **目录规范**: 
  - `lib/`: 存放工具函数、API、类型。
  - `components/ui/`: 存放 Shadcn 组件。
  - `app/`: 存放页面与布局。

# 资源引用

- 参考 [api.ts](assets/api.ts) 了解标准登录/登出接口实现。
- 参考 [utils.ts](assets/utils.ts) 了解请求拦截逻辑。
