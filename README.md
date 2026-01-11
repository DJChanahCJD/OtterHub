# OtterHub

<p align="center">
  <img width="100" alt="OtterHub icon" src="public/otterhub-icon.svg">
</p>

<p align="center"><strong>All your resources, in one place.</strong></p>

<p align="center">
  基于 Cloudflare KV + Telegram Bot API 的个人文件存储服务
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Cloudflare-Pages%20%2B%20KV%20%2B%20R2-orange?logo=cloudflare" />
  <img src="https://img.shields.io/badge/Storage-Telegram-blue?logo=telegram" />
  <img src="https://img.shields.io/badge/Frontend-Next.js-black?logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" />
</p>


## 👋 介绍

> 🦦 **Stash your files like an otter**

OtterHub 是一个**无需服务器、可免费部署**的个人文件存储解决方案。  
利用 Cloudflare Workers / Pages + KV 与 Telegram Bot API，实现文件的上传、管理、分享与安全浏览。

> [!IMPORTANT]
> 体验站点：[OtterHub Demo](https://otterhub-demo.pages.dev/)
> 
> 账号：`OtterHub` | 密码：`123456`
> 
> 限制：演示站的默认文件不可删，仅支持上传≤20MB文件（1小时自动清理）

![网站截图](public/website-screenshot.png)



## ✨ 功能

### 文件管理

- **多格式支持**：图片 / 音频 / 视频 / 文档  
  KV 前缀优化：`img:` `audio:` `video:` `doc:`
- **大文件上传**：分片上传（≤20MB / 片），最大 1GB  
  支持 Range 请求、断点续传
- **批量操作**：下载 / 编辑 / 删除
- 搜索、收藏、排序、标签等功能

### 浏览体验

- 视图模式：网格 / 列表 / 瀑布流（仅图片）
- 图片加载模式：
  - 默认：加载所有图片
  - 省流：不加载 >5MB 图片
  - 无图：不加载
- 安全浏览模式：
  - NSFW 图片显示遮罩
  - 上传时通过 nsfw.js 检测，标记 NSFW 图片
- TODO: 分页加载，适合大量文件



## ⚡ 快速开始

### 前置要求

- Node.js 18+
- Cloudflare 账号（免费）
- Telegram Bot Token

### 本地开发

#### 开发模式（推荐）

1. **启动后端** (`127.0.0.1:8080`)

```bash
npm install
npm run start:backend
```

2. **启动前端** (`127.0.0.1:3000`)

```bash
cd frontend && npm install
npm run dev
```

> [!TIP]
> 开发环境下采用本地R2存储，可以直接上传文件，方便调试。
> 修改 functions 代码后，可运行`npm run ci-test`快速测试文件上传和下载功能是否正常。

#### 预览模式

如需预览打包后的前端资源，可在根目录执行：

```bash
npm start
```

> 该命令会先打包前端，然后启动后端（前端无热更新）



## 🚀 Cloudflare 部署

### 1. 创建 Pages 项目

Fork 本项目，然后在 Cloudflare Dashboard 创建 Pages 项目：

- **构建命令**: `npm run build:frontend`
- **构建输出目录**: `frontend/out`

### 2. 配置环境变量

在 Pages 项目的设置中添加以下环境变量：

```env
BASIC_USER=your_username        # 用户名
BASIC_PASS=your_password        # 密码
TG_CHAT_ID=your_tg_chat_id      # Telegram Chat ID
TG_BOT_TOKEN=your_tg_bot_token  # Telegram Bot Token
```


### 3. 绑定 KV Namespace

1. 在 Cloudflare Dashboard 创建 KV 命名空间 `oh_file_url`
2. 将 `oh_file_url` 绑定到 Pages 项目，变量名也设为 `oh_file_url`

> `TG_CHAT_ID` 和 `TG_BOT_TOKEN` 需在 Telegram 中获取。
> 💡 详细流程可参考：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)



## 🔧 技术原理

### 文件上传
> 以大文件分片上传流程为例

1. **初始化上传**
   - 前端发送 `GET /api/upload/chunk` 请求
   - 携带文件类型、名称、大小和总分片数
   - 后端创建最终 KV，返回唯一文件 key
   
2. **分片上传**

   - 前端将文件分片（每片 ≤ 20MB）
   - 携带 key 逐个发送 `POST /api/upload/chunk`
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

以下为AI生成，详细流程可参考：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)

**Bot Token**

1. 在 Telegram 搜索 `@BotFather`
2. 发送 `/newbot`
3. 保存返回的 Token

**Chat ID**
- 搜索 `@userinfobot` 并发送任意消息
- 或访问：
  `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
  </details>



## 📂 项目结构

```
OtterHub/
├── frontend/
├── functions/         # Cloudflare Pages Functions
│   ├── api/
│   │   ├── upload/   # 文件上传（普通+分片）
│   │   ├── list.ts
│   │   ├── delete/[key].ts
│   │   ├── editFileMeta/[key].ts
│   │   ├── _middleware.ts    # 认证中间件
│   │   ├── ...
│   ├── file/[key].ts  # 文件获取（支持 Range 请求）
│   ├── utils/
│   │   ├── db-adapter/  # 存储适配器（抽象层）
│   │   │   ├── base-adapter.ts    # 适配器基类
│   │   │   ├── tg-adapter-v2.ts    # Telegram 适配器
│   │   │   ├── r2-adapter-v2.ts     # R2 适配器
│   │   ├── ...
│   └── _middleware.ts    # 全局中间件（CORS）
├── public/           # 静态资源
├── package.json
└── README.md
```



## 🔍 参考资料

- [Cloudflare API](https://developers.cloudflare.com/api)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image) - CF + TG 文件存储方案来源
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) - DB 适配器 & 分片上传设计的灵感来源
- [Solara](https://github.com/akudamatata/Solara)



## 📋 TODO

- [ ] 优化 NSFW 检测
  - [x] 集成 NSFWJS 库，客户端检测
  - [ ] 评估 NSFWJS 性能开销，是否改用 Moderate Content/Sightengine 的免费 API
  - [ ] 支持视频、音频检测？

- [ ] 文件类型定制
  - [ ] 图片
    - [x] 静态Masonry 瀑布流布局
    - [ ] 动态瀑布流支持，虚拟滚动加载

  - [ ] 音频：播放列表功能, 对接 GD's Studio API
  - [ ] 视频：在线播放支持
  - [ ] 文档：预览支持


- [ ] 其他
  - [ ] 实现分页获取
  - [ ] 支持 Docker 部署

## 🤝 Contributing
欢迎提交 **Issue** 反馈问题或建议新功能，也欢迎 **Pull Request** 一起完善项目！  
觉得有用的话，点个 ⭐️ 支持一下吧！
