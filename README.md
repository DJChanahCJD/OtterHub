<p align="center">
  <img width="100" alt="OtterHub icon" src="public/otterhub-icon.svg">
</p>
<p align="center" style="font-size: 24px; font-weight: bold;">OtterHub</p>
<p align="center" style="color: #00CD99;">All your resources, in one place.</p>


---

基于 Cloudflare KV + Telegram Bot API 的文件存储服务，支持文件上传、下载、删除、收藏等操作。

> 🦦 **Stash your files like an otter**

## 功能


## 技术原理

### 文件上传流程
施工ing

### 文件获取流程
施工ing


## 本地开发

### 开发模式（推荐）

1. 启动后端 `127.0.0.1:8080`
```bash
npm install
npm run start:backend
```

2. 启动前端 `127.0.0.1:3000`
```bash
cd frontend && npm install
npm run dev
```

### 预览模式

如需预览打包后的前端资源，可在根目录执行：
```bash
npm start
```
该命令会先打包前端，然后启动后端（前端无热更新）。



## Cloudflare 部署

### 1. 创建 Pages 项目

Fork 本项目，创建 Cloudflare Pages：

- **构建命令**: `build:frontend`
- **构建输出目录**: `frontend/out`

### 2. 配置环境变量

```env
BASIC_USER=your_username
BASIC_PASS=your_password
TG_CHAT_ID=your_tg_chat_id
TG_BOT_TOKEN=your_tg_bot_token
```

### 3. 绑定 KV Namespace

创建 KV 命名空间 `oh_file_url` 并绑定到项目。

> 具体流程请参考该项目的文档：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)


## 常见问题
### 上传文件后立即查看，为什么显示分片不完全？
上传逻辑用了waitUntil异步上传，可能存在延迟，稍等一会即可。

### Telegram Bot API最大只允许转发20MB的文件，你是如何实现上传超过20MB的文件的？
 Telegram Bot API 不支持直接上传超过20MB的文件，因此需要通过分片上传的方式实现。
 具体实现流程如下：
 1. 前端发送初始化请求(GET /api/upload/chunk)，携带文件类型、名称、大小和总分片数，后端创建一个最终KV，返回唯一文件key。
 2. 前端将文件分片（每片≤20MB），携带key逐个发送分片到后端(POST /api/upload/chunk)。
 3. 后端收到分片后，将其暂存到临时KV中（TTL=1小时，value最大存储25MB），使用waitUntil异步上传到Telegram。
 4. 上传成功后，将TG返回的file_id存入最终KV的chunks数组，更新元数据中的uploadedIndices，并删除临时KV。
 5. 获取文件时，后端从KV读取所有分片的file_id，流式从TG拉取并合并返回，支持Range请求。

## TODO

- [ ] NSFW相关
   - [x] 支持安全浏览模式（过滤/blur遮罩？ NSFW内容）
      智能无图（>5MB不加载）
      省流模式（不加载图片）
   - [x] 集成NSFWJS库，用于上传图片时检测NSFW内容，打上FileTag （TODO：评估一下性能开销？） -> 不再需要后端调用ModerateContent API
   - NSFW检测免费API： 
      - [Moderate Content API](https://account.moderatecontent.com/login)	1 万次 / 月，但似乎无法注册了
      - [Sightengine](https://sightengine.com/docs/getstarted)	 每月2000次免费，每日最多500次
- [ ] 考虑是否前端转Vue3 + Vite + TS，或者使用antd
- [ ] 不同文件类型的定制化
   - [ ] 图片：支持Masonry瀑布流布局（低优先级）
   - [ ] 音频: 对接GD Studio's API；提供音乐播放功能（播放列表？）
   - [ ] 视频：...
   - [ ] 文档：支持预览
- [ ] 支持分页 el-pagination?

## 参考资料

- [Cloudflare KV API 文档](https://developers.cloudflare.com/kv/api/)
- [Cloudflare R2 API 文档](https://developers.cloudflare.com/r2/objects)
- [Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)
- [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed)
- [Solara](https://github.com/akudamatata/Solara)
