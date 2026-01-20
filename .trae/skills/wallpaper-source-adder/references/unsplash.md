# Unsplash API 简明文档

## 基础信息
- **Base URL**: `https://api.unsplash.com`
- **认证方式**: 在 Header 中添加 `Authorization: Client-ID <YOUR_ACCESS_KEY>`

## 核心端点

### 1. 获取照片列表 (Editorial Feed)
`GET /photos`
- **参数**:
  - `page`: 页码 (默认 1)
  - `per_page`: 每页数量 (默认 10, 最大 30)
  - `order_by`: 排序方式 (`latest`, `oldest`, `popular`)

### 2. 搜索照片
`GET /search/photos`
- **参数**:
  - `query`: 搜索关键词 (必需)
  - `page`: 页码
  - `per_page`: 每页数量
  - `orientation`: 画幅方向 (`landscape`, `portrait`, `squarish`)
  - `content_filter`: 内容过滤 (`low`, `high`)

### 3. 获取单张随机照片
`GET /photos/random`
- **参数**:
  - `query`: 关键词过滤
  - `orientation`: 画幅方向
  - `count`: 返回数量 (1-30)

## 数据结构 (Photo Object)
```json
{
  "id": "LBI7cgq3pbM",
  "width": 5245,
  "height": 3497,
  "urls": {
    "raw": "...",
    "full": "...",
    "regular": "...",
    "small": "...",
    "thumb": "..."
  },
  "links": {
    "download_location": "..."
  },
  "user": {
    "name": "Gilbert Kane",
    "username": "poorkane"
  }
}
```

## 注意事项
- **Hotlinking**: 必须直接使用 Unsplash 返回的 `urls` 链接，且在下载时应调用 `download_location` 端点以触发下载计数。
- **速率限制**: 免费版通常为 50 次/小时，生产版为 5000 次/小时。
