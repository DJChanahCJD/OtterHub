import { MAX_CHUNK_SIZE } from "@shared/types"

// === 常量 ===
export const MAX_CONCURRENTS = 3  // 最大并发上传数

// Cloudflare Worker免费版限制: https://developers.cloudflare.com/workers/platform/limits/#worker-limits
// 最大128MB内存, 因此在下载大文件后，再次下载可能会报错
export const DIRECT_DOWNLOAD_LIMIT = MAX_CHUNK_SIZE * 2 // 小的媒体文件可通过a.click直接下载，超过则让用户通过浏览器控件下载
