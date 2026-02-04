// types.ts

// Cloudflare 配置
export enum CF {
  KV_NAME = 'oh_file_url',
  R2_BUCKET = 'oh_file_r2',
  SETTINGS_KEY = 'oh_settings', //  单独放一个用于存储设置数据的key
  MUSIC_STORE_KEY = 'oh_music_store', // 音乐数据存储 key
}

// == 常量
// 临时分片超时时间（秒）
export const TEMP_CHUNK_TTL = 3600; // 1小时
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

export const MAX_CHUNK_NUM = 50 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM

export const TRASH_EXPIRATION_TTL = 30 * 24 * 60 * 60; // 设置 30 天过期
