import { DBAdapter } from ".";
import { Chunk, chunkPrefix, FileMetadata, TEMP_CHUNK_TTL } from "../types";
import { fail, ok } from "../common";
import { findUploadedChunk, validateChunks } from "./shared-utils";
import { getUniqueFileId } from "../file";

/**
 * 存储适配器基类
 * 提供通用的分片文件处理逻辑
 */
export abstract class BaseAdapter implements DBAdapter {
  protected env: any;
  protected kvName: string;

  constructor(env: any, kvName: string) {
    this.env = env;
    this.kvName = kvName;
  }

  // 子类必须实现的方法
  abstract uploadFile(
    file: File | Blob,
    metadata: FileMetadata,
  ): Promise<Response>;
  abstract get(key: string, req?: Request): Promise<Response>;
  abstract delete(key: string): Promise<boolean>;

  /**
   * 子类必须实现的抽象方法：消费分片（上传到存储并更新 metadata）
   * @param parentKey 父文件的 key
   * @param tempChunkKey 临时分片的 KV key
   * @param chunkIndex 分片索引
   * @returns Promise<void>
   */
  protected abstract consumeChunk(
    parentKey: string,
    tempChunkKey: string,
    chunkIndex: number,
  ): Promise<void>;

  /**
   * 子类可选实现的方法：生成分片 ID
   * 默认实现：使用父 key 的一部分生成简短 ID
   * @param parentKey 父文件的 key
   * @param chunkIndex 分片索引
   * @returns 分片 ID
   */
  protected generateChunkId(parentKey: string, chunkIndex: number): string {
    const shortFileId =
      parentKey.split("_")[1]?.slice(0, 16) ||
      getUniqueFileId();
    return `${shortFileId}_${chunkIndex}`;
  }

  /**
   * 上传单个分片（通用实现）
   * 流程：
   * 1. 获取当前 metadata
   * 2. 检查分片是否已上传
   * 3. 将分片内容暂存到临时 KV
   * 4. 异步处理：调用子类的 consumeChunk
   * 5. 使用 waitUntil 异步处理或直接等待
   */
  async uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File | Blob,
    waitUntil?: (promise: Promise<any>) => void,
  ): Promise<Response> {
    const kv = this.env[this.kvName];

    // 1. 获取当前 metadata
    const metaResult = await this.getMetadata(key);
    if (!metaResult?.metadata?.chunkInfo) {
      return fail("Not a chunked file", 400);
    }

    const metadata = metaResult.metadata;
    const chunks: Chunk[] = metaResult.value
      ? JSON.parse(metaResult.value)
      : [];

    // 2. 检查分片是否已上传（使用通用工具函数）
    const uploadedChunk = findUploadedChunk(metadata, chunkIndex, chunks);
    if (uploadedChunk) {
      return ok(uploadedChunk.file_id);
    }

    // 3. 将分片内容暂存到临时 KV（带过期时间）
    const tempChunkKey = `${chunkPrefix}${key}-${chunkIndex}`;
    await kv.put(tempChunkKey, chunkFile.stream(), {
      expirationTtl: TEMP_CHUNK_TTL,
    });

    // 4. 异步处理：上传到存储并更新 metadata
    const uploadPromise = this.consumeChunk(key, tempChunkKey, chunkIndex);

    if (waitUntil) {
      // 使用 waitUntil 异步处理，不阻塞响应
      waitUntil(uploadPromise);
    } else {
      // 如果没有 waitUntil，直接等待（兼容性）
      await uploadPromise;
    }

    return ok({ chunkIndex });
  }

  /**
   * 获取上传进度（通用实现）
   */
  async getProgress(key: string): Promise<{
    uploaded: number;
    total: number;
    complete: boolean;
  } | null> {
    const item = await this.env[this.kvName].getWithMetadata(key);
    const metadata: FileMetadata = item.metadata;

    if (!metadata?.chunkInfo) {
      return null;
    }

    const { chunkInfo } = metadata;
    const uploaded = chunkInfo.uploadedIndices?.length;
    const total = chunkInfo.total;
    const complete = uploaded === total;

    return { uploaded, total, complete };
  }

  /**
   * 获取文件元数据
   */
  protected async getMetadata(key: string): Promise<{
    metadata: FileMetadata;
    value: string | null;
  } | null> {
    try {
      const item = await this.env[this.kvName].getWithMetadata(key);
      const metadata: FileMetadata = item.metadata;
      const value = item.value;

      if (!metadata) {
        return null;
      }

      return { metadata, value };
    } catch (error) {
      console.error(`[getMetadata] Error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 更新分片信息（使用重试机制避免并发冲突）
   */
  protected async updateChunkInfo(
    key: string,
    chunkIndex: number,
    chunkId: string,
    chunkSize: number,
  ): Promise<void> {
    const kv = this.env[this.kvName];
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      try {
        // 1. 获取最新状态
        const metaResult = await this.getMetadata(key);
        if (!metaResult) {
          throw new Error(`Metadata not found for key: ${key}`);
        }

        const metadata = metaResult.metadata;
        const chunks: Chunk[] = metaResult.value
          ? JSON.parse(metaResult.value)
          : [];

        // 2. 检查是否已上传
        if (metadata.chunkInfo.uploadedIndices?.includes(chunkIndex)) {
          console.log(
            `[updateChunkInfo] Chunk ${chunkIndex} already uploaded, skipping`,
          );
          return;
        }

        // 3. 更新 uploadedIndices
        if (!metadata.chunkInfo.uploadedIndices) {
          metadata.chunkInfo.uploadedIndices = [];
        }
        metadata.chunkInfo.uploadedIndices.push(chunkIndex);

        // 4. 更新 chunks 数组（存储在 value 中）
        chunks.push({
          idx: chunkIndex,
          file_id: chunkId,
          size: chunkSize,
        });

        // 5. 写回 KV
        await kv.put(key, JSON.stringify(chunks), { metadata });

        console.log(
          `[updateChunkInfo] Updated chunk ${chunkIndex} (attempt ${i + 1})`,
        );
        return;
      } catch (error) {
        console.error(`[updateChunkInfo] Attempt ${i + 1} failed:`, error);
        if (i === maxRetries - 1) {
          throw error;
        }
        // 指数退避
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 100),
        );
      }
    }
  }
}
