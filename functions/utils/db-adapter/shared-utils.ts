import { Chunk, FileMetadata, trashPrefix } from "@shared/types";

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
 * 验证上传是否完成
 * 职责：检查所有分片是否已上传完成（基于 uploadedIndices）
 * 数据源：metadata.chunkInfo.uploadedIndices
 * 用途：决定是否允许合并文件
 * @param metadata 文件元数据
 * @returns 完整性检查结果
 */
export function validateUploadCompletion(
  metadata: FileMetadata,
): { valid: boolean; uploaded: number; total: number; reason?: string } {
  if (!metadata?.chunkInfo) {
    return { valid: false, uploaded: 0, total: 0, reason: "No chunkInfo in metadata" };
  }

  const { chunkInfo } = metadata;
  const uploadedCount = chunkInfo.uploadedIndices?.length || 0;
  const total = chunkInfo.total;

  if (uploadedCount !== total) {
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
 * 验证分片是否可以合并
 * 职责：检查分片数组是否完整且连续
 * 数据源：从 KV value 解析的 chunks 数组
 * 用途：在合并前验证分片数据完整性
 * @param chunks 分片数组
 * @param expectedTotal 期望的分片总数
 * @returns 验证结果
 */
export function validateChunksForMerge(
  chunks: Chunk[],
  expectedTotal: number,
): { valid: boolean; reason?: string } {
  if (chunks.length !== expectedTotal) {
    return {
      valid: false,
      reason: `Chunks count mismatch: ${chunks.length}/${expectedTotal}`,
    };
  }

  // 检查分片索引是否连续（0, 1, 2, ..., total-1）
  const sortedIndices = [...chunks]
    .sort((a, b) => a.idx - b.idx)
    .map(c => c.idx);

  for (let i = 0; i < expectedTotal; i++) {
    if (sortedIndices[i] !== i) {
      return {
        valid: false,
        reason: `Chunks are not continuous: missing index ${i}`,
      };
    }
  }

  return { valid: true };
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
export function isUploadedChunk(
  metadata: FileMetadata,
  chunkIndex: number,
): boolean | null {
  if (!metadata?.chunkInfo) return null;
  return metadata.chunkInfo.uploadedIndices?.includes(chunkIndex)
}

/**
 * 将 ReadableStream 转换为 Blob
 * @param stream 要转换的 ReadableStream
 * @returns 转换后的 Blob
 */
export async function streamToBlob(
  stream: ReadableStream<Uint8Array>
): Promise<Blob> {
  const reader = stream.getReader();
  const chunks: BlobPart[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  return new Blob(chunks);
}


/**
 * 解析原来的存储 Key（如果是回收站文件，则移除前缀）
 */
export function extractKeyFromTrash(key: string): string {
  return key.startsWith(trashPrefix) ? key.slice(trashPrefix.length) : key;
}