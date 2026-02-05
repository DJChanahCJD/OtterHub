---
alwaysApply: false
description: 当前问题涉及前后端协作、项目架构时使用
---

# OtterHub

私人云盘系统  
基于 **Cloudflare Pages + KV + Telegram Bot API**，不支持 Node.js Runtime。

---

## 项目结构

frontend/        Next.js 前端（含 Hono RPC Client）
functions/       Cloudflare Pages Functions (Hono)
  routes/        业务路由
  middleware/    中间件
  utils/         工具函数
shared/          前后端共享类型
public/          静态资源
package.json     Monorepo

---

## 技术栈

### 前端
Next.js 16 · TypeScript 5  
TailwindCSS 4 · shadcn/ui (radix)  
Zustand · Hono RPC · lucide-react

### 后端
Cloudflare Pages Functions · Hono 4  
KV 存储 · JWT + Cookie 鉴权

---

## 存储设计

文件：Telegram Bot（>20MB 分片上传）
元数据：Cloudflare KV
本地开发：R2
