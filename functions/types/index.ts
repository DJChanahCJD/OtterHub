// types.ts

// Cloudflare 配置
export enum CF {
  KV_NAME = 'oh_file_url',
  R2_BUCKET = 'oh_file_r2',

  // KV key
  SETTINGS_KEY = 'oh_settings', //  通用设置
  WALLPAPER_CONFIG_KEY = 'oh_wallpaper_config', // 壁纸数据存储
}

// == 常量
// 临时分片超时时间（秒）
export const TEMP_CHUNK_TTL = 3600; // 1小时
