---
alwaysApply: false
globs: frontend/*, *.tsx
---

* 组件: 优先复用 `@/components/ui`
* 图标: `lucide-react` 按需导入
* 移动端: 使用 `useIsMobile` hook 判断