---
name: wallpaper-source-adder
description: 用于在 OtterHub 项目中快速添加和集成新的随机壁纸数据源（Wallpaper Source）。
---

# 核心流程

添加壁纸源涉及前端类型定义、后端接口实现以及前端 UI 配置三个部分。

## 1. 类型定义（共享）

在以下两个文件中同步添加新的 `WallpaperSourceId`：
- `frontend/lib/types/wallpaper.ts`
- `functions/utils/types.ts`

## 2. 后端实现 (Functions)

### 定义配置类型
在 `functions/api/providers/wallpaper/types.ts` 中定义该源所需的查询参数类型（如 `PixabayConfig`）。

### 实现 Provider 逻辑
在 `functions/api/providers/wallpaper/` 下创建 `{id}.ts`：
- 导出 `onRequest` 函数。
- 处理分页逻辑（建议默认随机页码）。
- 调用第三方 API 并将结果映射为 `UnifiedWallpaper[]` 格式。
- `UnifiedWallpaper` 必须包含 `id`, `previewUrl`, `rawUrl`, `source`。（若返回的url对网内网络不友好，需用 `functions/utils/proxy getProxyUrl`方法包装, 仅需包装 previewUrl, 而 rawUrl 保持不变）

## 3. 前端实现 (Components)

### 定义前端配置类型
在 `frontend/components/settings/wallpaper-tab/types.ts` 中定义 `Config` 类型。

### 创建 Source 组件
在 `frontend/components/settings/wallpaper-tab/sources/` 下创建 `{id}.tsx`：
- 导出符合 `WallpaperProvider<T>` 接口的对象。
- 实现 `ConfigPanel` 用于渲染过滤参数 UI（如关键词输入、分类选择）。
- 处理 API Key 的获取与设置（若无 Key 则使用 `WP_API_KEY_PLACEHOLDER`, 若有则还需要在`frontend\components\settings\wallpaper-tab\ApiKeyDialog.tsx`的 getHelpUrl 方法中添加该源的 API 文档链接 ）。

### 注册 Source
在 `frontend/components/settings/wallpaper-tab/sources/index.ts` 中：
- 导入新创建的 Source 对象。
- 将其添加到 `WALLPAPER_SOURCES` 映射中。

# 关键规则

- **统一格式**：所有 Provider 必须返回 `UnifiedWallpaper` 结构，确保前端展示组件无需修改。
- **配置同步**：API Key 应支持云端同步，普通过滤参数（如关键词）仅存在本地。
- **错误处理**：后端 Provider 应捕获 API 错误并使用 `fail()` 函数返回友好的错误信息。
- **API Key 规范**：前端统一传递 `apiKey` 参数，后端 Provider 需通过 `url.searchParams.get("apiKey")` 获取，并自行映射到第三方 API 所需的字段（如 `key`, `client_id` 或 Header）。
- **NSFW 标识**：在 Provider 中显式定义 `isNsfw` 逻辑，以便前端打标。
