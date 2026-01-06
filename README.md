# OtterHub
OtterHub 是一个基于 Cloudflare KV + Telegram Bot API 的文件存储服务，支持文件上传、下载、删除、收藏等操作。

## 快速开始
1. 安装依赖
   ```bash
   npm install
   cd frontend && npm install
   ```
2. 根目录下构建项目
   ```bash
   npm run start
   ```

## Cloudfare部署

1. Fork该项目，创建一个 Cloudfare Pages
构建命令: `cd frontend && npm install && npm run build`
构建输出目录：`frontend/out`

2. 设置环境变量
BASIC_USER:`your_username`
BASIC_PASS:`your_password`
TG_CHAT_ID:`your_tg_chat_id`
TG_BOT_TOKEN:`your_tg_bot_token`

2. 创建KV NAMESPACE `oh_file_url` 并绑定到项目

## 参考文档

- [Cloudflare KV API 文档](https://developers.cloudflare.com/kv/api/)
- [Cloudflare R2 API 文档](https://developers.cloudflare.com/r2/objects)
