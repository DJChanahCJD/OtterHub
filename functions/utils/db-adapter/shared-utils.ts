import { Chunk, FileMetadata } from "../types";

/**
 * 解析 Range 请求头
 * @param range Range 请求头字符串
 * @param fileSize 文件总大小
 * @returns { start, end } 或 null（如果无效）
 */
export function parseRangeHeader(
  range: string | null,
  fileSize: number
): { start: number; end: number } | null {
  if (!range) return null;

  const match = /bytes=(\d+)-(\d+)?/.exec(range);
  if (!match) return null;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : fileSize - 1;

  if (start >= fileSize || end < start) {
    return null;
  }

  return { start, end };
}

/**
 * 检查分片文件是否完整
 * @param metadata 文件元数据
 * @param chunks 分片数组（可选，用于 R2AdapterV2 从 value 中解析）
 * @returns 完整性检查结果
 */
export function validateChunks(
  metadata: FileMetadata,
  chunks?: Chunk[]
): { valid: boolean; uploaded: number; total: number; reason?: string } {
  if (!metadata?.chunkInfo) {
    return { valid: false, uploaded: 0, total: 0, reason: "No chunkInfo in metadata" };
  }

  const { chunkInfo } = metadata;

  // R2AdapterV2: chunks 从 value 中获取
  const chunksArray = chunks;
  const uploadedCount = chunkInfo.uploadedIndices?.length || chunksArray.length;
  const total = chunkInfo.total;

  if (uploadedCount !== total || chunksArray.length !== total) {
    return {
      valid: false,
      uploaded: uploadedCount,
      total,
      reason: `Incomplete file: ${uploadedCount}/${total}`,
    };
  }

  return { valid: true, uploaded: uploadedCount, total };
}

/**
 * 排序分片并计算总大小
 * @param chunks 分片数组
 * @returns 排序后的分片数组和总大小
 */
export function sortChunksAndCalculateSize(chunks: Chunk[]): {
  sortedChunks: Chunk[];
  totalSize: number;
} {
  const sortedChunks = [...chunks].sort((a, b) => a.idx - b.idx);
  const totalSize = sortedChunks.reduce((sum, c) => sum + c.size, 0);
  return { sortedChunks, totalSize };
}

/**
 * 检查分片是否已上传
 * @param metadata 文件元数据
 * @param chunkIndex 分片索引
 * @returns 已上传的分片信息或 null
 */
export function findUploadedChunk(
  metadata: FileMetadata,
  chunkIndex: number,
  chunksFromValue?: Chunk[]
): Chunk | null {
  if (!metadata?.chunkInfo) return null;

  const { chunkInfo } = metadata;
  const chunksArray = chunksFromValue || chunkInfo.chunks;

  // R2AdapterV2: 检查 uploadedIndices
  if (chunkInfo.uploadedIndices?.includes(chunkIndex)) {
    return chunksArray.find(c => c.idx === chunkIndex) || null;
  }

  // R2Adapter / TGAdapter: 直接在 chunks 中查找
  return chunksArray.find(c => c.idx === chunkIndex) || null;
}
