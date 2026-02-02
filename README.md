# OtterHub

<p align="center">
  <img width="100" alt="OtterHub icon" src="public/otterhub-icon.svg">
</p>
<p align="center"><strong>Stash your files like an otter</strong></p>

<p align="center">
  基于 Cloudflare KV + Telegram Bot API 的免费私人云盘
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Pages%20%2B%20KV%20%2B%20R2-orange?logo=cloudflare" />
  <img src="https://img.shields.io/badge/Storage-Telegram-blue?logo=telegram" />
  <img src="https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" />
</p>

---

## 👋 为什么有 OtterHub？

现有基于 **Cloudflare + Telegram** 的文件存储方案，例如：

- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image) 
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)

它们都很优秀，但要么偏向**图床与轻量分享**，要么为了通用性引入了**较高的复杂度**，并不完全适合**长期自用的私人云盘**。

### OtterHub 的定位

> 像水獭一样，把文件悄悄藏好，需要时再拿出来 🦦

OtterHub 是一个 **为个人使用场景定制** 的私人云盘方案：

- 基于 **Cloudflare Pages + KV**
- 使用 **Telegram Bot** 作为实际文件存储
- 通过 **分片上传** 突破 20MB 单文件限制
- 支持 **HTTP Range**，适合视频 / 大文件访问
- 架构克制、状态最小化，优先长期可维护性

它不追求"什么都支持"，而是专注于**刚好够用、稳定、好维护**。


>  [!IMPORTANT]
> 体验站点：[OtterHub Demo](https://otterhub-demo.pages.dev/)
>
> 账号：`OtterHub` | 密码：`123456`
>
> 限制：演示站的默认文件不可删，仅支持上传 ≤20MB 文件（1 小时自动清理）

![网站截图](public/website-screenshot.png)



## ✨ 核心能力

- **私人文件存储**：
  - 支持图片 / 音频 / 视频 / 文档
  - KV Key 按类型划分前缀 `img:` `audio:` `video:` `doc:`，提升查询效率
  - 提供回收站功能（30天后自动清除），支持恢复和永久删除
- **大文件支持**：
  - 分片上传（≤20MB/片），已实测稳定上传并预览 **100MB** 文件，理论最大 1GB
  - 支持 HTTP Range，视频/音频按需加载，支持断点续传
- **实时预览**：
  - 通过文件 URL 直接打开，无需下载
  - 支持：图片 / 音频 / 视频 / 文本（txt、pdf 等）
- **可控性能与流量**：
  - 非 Range 请求走 Cloudflare Cache，Range 请求直出避免缓存污染
  - 图片加载策略：默认 / 省流（>5MB 不加载）/ 无图
- **安全与私密**：
  - 密码登录（基于 JWT + Cookie）
  - NSFW 图片客户端检测（nsfw.js），安全模式下自动遮罩
- **基础管理功能**：批量下载 / 删除，搜索 / 收藏 / 排序 / 标签

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Cloudflare 账号（免费）
- Telegram Bot Token

### 本地开发

1. **安装依赖**
   ```bash
   # 在根目录运行，自动安装所有 Workspaces 依赖
   npm install
   ```

2. **启动项目**
   ```bash
   npm run dev
   ```

3. **访问网站**
   - 前端：`http://localhost:3000`
   - 后端：`http://localhost:8080` (由 Wrangler 代理)

> [!TIP]
> 开发环境下密码为`123456`，且采用本地 R2 存储，可以直接上传文件，方便调试。
> 修改 functions 代码后，可运行 `npm run ci-test` 快速测试文件上传和下载功能是否正常。

---

## 📦 Cloudflare 部署

### 1. 创建 Pages 项目

Fork 本项目，然后在 Cloudflare Dashboard 创建 Pages 项目：

- **构建命令**: `npm run build`
- **构建输出目录**: `frontend/out`

### 2. 配置环境变量

在 Pages 项目的设置中添加以下环境变量：

```env
PASSWORD=your_password          # 密码
TG_CHAT_ID=your_tg_chat_id      # Telegram Chat ID
TG_BOT_TOKEN=your_tg_bot_token  # Telegram Bot Token
```

### 3. 绑定 KV Namespace

1. 在 Cloudflare Dashboard 创建 KV 命名空间 `oh_file_url`
2. 将 `oh_file_url` 绑定到 Pages 项目，变量名也设为 `oh_file_url`

> `TG_CHAT_ID` 和 `TG_BOT_TOKEN` 需在 Telegram 中获取。
> 💡 详细流程可参考：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)

---

## 🔧 技术原理

### 文件上传
> 以大文件分片上传流程为例

1. **初始化上传**
   - 前端发送 `GET /upload/chunk` 请求
   - 携带文件类型、名称、大小和总分片数
   - 后端创建最终 KV，返回唯一文件 key

2. **分片上传**

   - 前端将文件分片（每片 ≤ 20MB）
   - 携带 key 逐个发送 `POST /upload/chunk`
   - 后端将分片暂存到临时 KV（TTL = 1 小时，value ≤ 25MB）

3. **异步上传到 Telegram**

   - 使用 `waitUntil` 异步上传分片到 Telegram
   - 上传成功后获取 file_id

4. **合并完成**
   - 将 file_id 存入最终 KV 的 chunks 数组
   - 更新 uploadedIndices 元数据
   - 删除临时 KV

### 文件下载
> 以大文件流式获取流程为例

1. **读取元数据**

   - 从 KV 读取文件元数据和分片信息
   - 解析 chunks 数组中的 file_id

2. **流式拉取**

   - 从 Telegram API 流式拉取所有分片
   - 支持 HTTP Range 请求
   - 边拉取边返回给客户端

3. **断点续传**
   - 支持 Range 请求头
   - 可指定下载指定字节范围

### 数据存储结构
> 以 30MB 文件为例

#### KV Key + Metadata 结构

```json
{
  "name": "video:chunk_7yHZkP0bzyUN5VLE.mp4",
  "metadata": {
    "fileName": "示例视频-1080P.mp4",
    "fileSize": 30202507,
    "uploadedAt": 1768059589484,
    "liked": false,
    "chunkInfo": {
      "total": 2,
      "uploadedIndices": [1, 0]
    }
  }
}
```

#### KV Value 结构（chunks 数组）

```json
[
  {
    "idx": 1,
    "file_id": "BQACAgUAAyEGAASJIjr1AAIDa2lictGSBOJ24LnypIN5JCmV2u77AAJ_HwAC...",
    "size": 9230987
  },
  {
    "idx": 0,
    "file_id": "BQACAgUAAyEGAASJIjr1AAIDbGlictIJ9om0qQ66ZW4GssRXCARUAAKAHwAC...",
    "size": 20971520
  }
]
```

#### 存储容量分析

- **单文件占用**：< 500 字节（key + metadata + value 结构）
- **KV 总容量**：1GB（免费版）
- **理论存储数量**： **≥ 200万个**

> 计算公式：`1GB / 500字节 ≈ 200万`

---

## ❓ 常见问题

<details>
<summary>1. 上传完成后立即查看，为什么文件不完整？</summary>

上传过程使用了 `waitUntil` 进行异步处理，
在分片尚未全部上传完成前，文件可能暂时显示不完整。

通常只需 **稍等片刻并刷新页面** 即可正常显示。
</details>

<details>
<summary>2. Telegram 单文件限制 20MB，OtterHub 如何支持大文件？</summary>

通过 **分片上传 + 流式合并** 实现：

- 前端将文件拆分为多个 ≤20MB 的分片
- 每个分片独立上传到 Telegram
- 服务端记录分片 `file_id`
- 下载时按顺序流式拉取并合并

👉 当前最大支持 **1GB 文件（50 × 20MB）**。
</details>

<details>
<summary>3. Cloudflare Workers 免费版是否够用？</summary>

对于**个人存储场景**通常足够，**理论存储数量**： **≥ 200万个**
但大文件上传会占用较多内存和CPU资源，**不建议并发上传多个大文件**。

> 具体限制参考官方文档：https://developers.cloudflare.com/workers/platform/limits/

</details>

<details>
<summary>4. 如何获取 Telegram Bot Token 和 Chat ID？</summary>

以下为 AI 生成，详细流程可参考：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)

**Bot Token**

1. 在 Telegram 搜索 `@BotFather`
2. 发送 `/newbot`
3. 保存返回的 Token

**Chat ID**
- 搜索 `@userinfobot` 并发送任意消息
- 或访问：
  `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  </details>

---

## 📂 项目结构

```
OtterHub/
├── frontend/           # Next.js Frontend
│   ├── lib/
│   │   ├── api/        # Hono RPC Client (Type-safe)
│   │   │   ├── client.ts # RPC Client Instance
│   │   │   └── ...
│   └── ...
├── functions/          # Cloudflare Pages Functions (Hono Backend)
│   ├── routes/         # 业务路由模块
│   │   ├── file/       # 文件操作
│   │   ├── upload/     # 上传逻辑
│   │   ├── wallpaper/  # 壁纸服务
│   │   └── ...
│   ├── middleware/     # 中间件 (Auth, CORS)
│   ├── utils/          # 工具库 (DB Adapters, Proxy)
│   ├── app.ts          # Hono App 定义 & AppType 导出
│   └── [[path]].ts     # Pages Functions 入口
├── shared/             # 前后端共享类型/工具 (Workspaces)
├── public/             # 静态资源
├── package.json        # Monorepo 配置
└── README.md
```

---

## 🔍 参考资料

- [Cloudflare API](https://developers.cloudflare.com/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image) - CF + TG 文件存储方案来源
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) - DB 适配器 & 分片上传设计的灵感来源
- [Solara](https://github.com/akudamatata/Solara)

---

## 📋 TODO

- [x] 核心能力
  - [x] 分片上传（≤20MB / 片），支持大文件（已实测 100MB，理论 1GB）
  - [x] HTTP Range 支持（视频 / 音频按需加载、断点续传）
  - [x] Private 私有文件访问控制
  - [x] 回收站功能（支持恢复 / 永久删除 / 自动清理）

- [x] 文件管理
  - [x] 分页获取文件列表
  - [x] 批量操作（复制 / 删除 / 重命名）
  - [x] 收藏（Liked）和标签（Tag）
  - [x] 筛选功能（按标签 / 按收藏 / 按日期范围）和排序功能（文件大小 / 文件名称 / 上传时间）

- [x] 预览与展示
  - [x] 图片瀑布流（支持 GIF）
  - [x] 视频缩略图（Telegram thumbnail）
  - [x] 图片加载策略（默认 / 省流 / 无图）

- [x] 安全与体验
  - [x] NSFWJS 客户端检测（安全模式遮罩）
  - [x] 日夜模式
  - [x] 移动端基础适配
  - [x] Toast 轻量化（移动端友好）

### High Priority
- [x] 基于 cookie 实现登录登出
- [x] 右下角悬浮按钮（FAB），多操作统一入口（登出、管理页面）
  - FAB → Action Sheet / Popover → 操作列表（通过shadcn/ui + 自定义 FAB实现）
- [x] 随机壁纸
  - 多壁纸源（Wallhaven、Bing、Pixabay 等）
- [x] 全面重构为 Hono 后端（鉴权更灵活，可移植性更好）
- [x] 前端迁移至 Hono RPC (End-to-end Type Safety)
- [x] 临时分享文件（无论是否 Private 都可以访问）
  - [x] KV实现, 一次性 / 有效期 URL （允许用户选择）
  - [x] key: `shared:<uuid>`
  - [x] value: `<file_key>`
- [ ] 文件类型定制
  - [ ] 音频：音频播放列表（歌曲 / 播客场景）
    - 前端维护一个 playlist（基于当前筛选结果）
    - <audio> + Media Session API（锁屏控制）
  - [ ] 视频：在线播放支持 `video.js`
  - [ ] 文档：预览支持
    - [ ] 电子书（PDF、EPUB 等） `<iframe> / <embed> / pdf.js / epub.js`
    - [ ] 漫画（图片 → 连续阅读 / PDF）

---

### Low Priority

- [ ] API Token 支持
- [ ] 对接外部 API 工具
  - [ ] GD's Studio API（音频）
  - [ ] wallheaven / Pixabay / Unsplash
  - [ ] ~~在线图片编辑（压缩`browser-image-compression` / 裁剪`cropperjs` / 缩放+格式转换`Pica`）~~
  - [ ] ~~音视频格式转换（Save As 功能 `ffmpeg.wasm`）~~
- 其他
  - 是否拓展V2 API， `blog:`/`music:` 拓展场景
- [ ] Demo 站点上传限制可配置（环境变量）
- [ ] KV vs D1 数据库评估
  - D1：单库 500MB，分库可达 5GB
  - 优点：SQL、关系模型、文件夹结构更自然
  - 当前结论：KV 足够，暂不迁移
- [ ] ~~文件夹系统（通过文件名前缀 + 搜索 + Tag 达成等效能力）~~

---

## 🤝 Contributing

欢迎提交 **Issue** 反馈问题或建议新功能，也欢迎 **Pull Request** 一起完善项目！
觉得有用的话，点个 ⭐️ 支持一下吧！
