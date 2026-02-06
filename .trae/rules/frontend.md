---
alwaysApply: false
globs: frontend/*,*.tsx
---
* 组件：复用@/components/ui
* 图标：lucide-react按需导入
* 移动端：useIsMobile hook判断
* 依赖安装(monorepo)：npm install [包名] --workspace=frontend
* 批量处理：import { processBatch } from "@/lib/utils"