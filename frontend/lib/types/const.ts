// === 常量 ===
export const MAX_CONCURRENTS = 3  // 最大并发上传数
export const MAX_CHUNK_SIZE = 20 * 1024 * 1024 // 20MB

// Cloudflare Worker免费版限制: https://developers.cloudflare.com/workers/platform/limits/#worker-limits
// 最大128MB内存, 因此在下载大文件后，再次下载可能会报错
export const DIRECT_DOWNLOAD_LIMIT = MAX_CHUNK_SIZE * 2 // 小的媒体文件可通过a.click直接下载，超过则让用户通过浏览器控件下载
export const MAX_CHUNK_NUM = 50 // 由于Cloudflare Worker的CPU限制，这里限制最大分片数为50, 即文件大小不得超过1000MB≈1GB
export const MAX_FILE_SIZE = MAX_CHUNK_SIZE * MAX_CHUNK_NUM

export const TRASH_EXPIRATION_TTL = 30 * 24 * 60 * 60; // 设置 30 天过期