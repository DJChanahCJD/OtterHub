// types.ts

// Cloudflare 配置
export enum CF {
  KV_NAME = 'oh_file_url',
  R2_BUCKET = 'oh_file_r2',

  // KV key
  SETTINGS_KEY = 'oh_settings', //  通用设置
  WALLPAPER_CONFIG_KEY = 'oh_wallpaper_config', // 壁纸数据存储
  MUSIC_STORE_KEY = 'oh_music_store', // 音乐数据存储
}

// == 常量
// 临时分片超时时间（秒）
export const TEMP_CHUNK_TTL = 3600; // 1小时
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export const MAX_CHUNK_NUM = 50 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM

export const TRASH_EXPIRATION_TTL = 30 * 24 * 60 * 60; // 设置 30 天过期
