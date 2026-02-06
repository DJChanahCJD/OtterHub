---
alwaysApply: false
globs: frontend/*,*.tsx
---
* 组件：复用@/components/ui
* 图标：lucide-react按需导入
* 移动端：useIsMobile hook判断
* 依赖安装(monorepo)：npm install [包名] --workspace=frontend
* 批量处理：import { processBatch } from "@/lib/utils"
* 跨平台构建:
  * 必须在 `package.json` 的 `optionalDependencies` 中显式添加 `@next/swc-linux-x64-gnu` (与 Next.js 版本一致)。
  * 对于 Tailwind CSS v4，需添加 `@tailwindcss/oxide-linux-x64-gnu` (与 `@tailwindcss/postcss` 版本一致)。
  * 这是为了防止 Windows 环境下生成错误的 lockfile 导致 Linux CI 构建失败。