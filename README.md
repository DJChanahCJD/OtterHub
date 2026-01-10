<p align="center">
  <img width="100" alt="OtterHub icon" src="public/otterhub-icon.svg">
</p>
<p align="center" style="font-size: 24px; font-weight: bold;">OtterHub</p>
<p align="center" style="color: #00CD99;">All your resources, in one place.</p>


---

基于 Cloudflare KV + Telegram Bot API 的文件存储服务，支持文件上传、下载、删除、收藏等操作。

## 本地开发

```bash
npm install
cd frontend && npm install
cd .. && npm run start
```

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
> 具体流程请参考该项目的文档：[Telegraph-Image](https://github.com/cf-pages/Telegraph-Image)

### 3. 绑定 KV Namespace

创建 KV 命名空间 `oh_file_url` 并绑定到项目。

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
