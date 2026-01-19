import { DBAdapter } from ".";
import { Chunk, chunkPrefix, FileMetadata, TEMP_CHUNK_TTL } from "../types";
import { fail, ok } from "../common";
import { isUploadedChunk, streamToBlob } from "./shared-utils";
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
  ): Promise<{ key: string }>;
  abstract get(key: string, req?: Request): Promise<Response>;
  abstract delete(key: string): Promise<boolean>;

  /**
   * 子类必须实现的抽象方法：上传分片到目标存储
   * @param chunkFile 要上传的分片文件
   * @param parentKey 父文件的 key
   * @param chunkIndex 分片索引
   * @returns 上传后的分片 ID
   */
  protected abstract uploadToTarget(
    chunkFile: File,
    parentKey: string,
    chunkIndex: number,
  ): Promise<string>;

  /**
   * 消费分片（模板方法）
   * 流程：
   * 1. 从临时 KV 读取分片内容
   * 2. 将 stream 转换为 File
   * 3. 调用子类的 uploadToTarget 上传
   * 4. 更新 KV metadata
   * 5. 删除临时 KV
   *
   * 子类只需实现 uploadToTarget，其他逻辑由基类处理
   */
  protected async consumeChunk(
    parentKey: string,
    tempChunkKey: string,
    chunkIndex: number,
  ): Promise<void> {
    const kv = this.env[this.kvName];

    try {
      console.log(
        `[consumeChunk] Processing chunk ${chunkIndex} for ${parentKey}`,
      );

      // 1. 从临时 KV 读取分片内容
      const chunkStream = await kv.get(tempChunkKey, "stream");
      if (!chunkStream) {
        console.error(`[consumeChunk] Temp chunk not found: ${tempChunkKey}`);
        return;
      }

      // 2. 将 stream 转换为 File
      const chunkBlob = await streamToBlob(chunkStream);
      const chunkFile = new File([chunkBlob], `part-${chunkIndex}`);

      // 3. 调用子类实现的上传方法
      const chunkId = await this.uploadToTarget(chunkFile, parentKey, chunkIndex);
      console.log(
        `[consumeChunk] Uploaded chunk ${chunkIndex}: ${chunkId}`,
      );

      // 4. 更新 KV metadata
      await this.updateChunkInfo(
        parentKey,
        chunkIndex,
        chunkId,
        chunkFile.size,
      );

      // 5. 删除临时 KV
      await kv.delete(tempChunkKey);

      console.log(`[consumeChunk] Completed chunk ${chunkIndex}`);
    } catch (error) {
      console.error(
        `[consumeChunk] Error processing chunk ${chunkIndex}:`,
        error,
      );
      // 即使出错也要删除临时 KV，避免堆积
      try {
        await kv.delete(tempChunkKey);
      } catch (e) {
        // 忽略删除错误
      }
      throw error;
    }
  }

  /**
   * 子类可选实现的方法：生成分片 ID
   * 默认实现：使用父 key 的一部分生成简短 ID
   * @param parentKey 父文件的 key
   * @param chunkIndex 分片索引
   * @returns 分片 ID
   */
  protected getTempChunkId(parentKey: string, chunkIndex: number): string {
    const shortFileId =
      parentKey.split("_")[1]?.slice(0, 16) ||
      getUniqueFileId();
    return `${chunkPrefix}${shortFileId}_${chunkIndex}`;
  }

  /**
   * 上传单个分片（通用实现）
   * 流程：
   * 1. 获取当前 metadata
   * 2. 检查分片是否已上传
   * 3. 将分片内容暂存到临时 KV
   * 4. 异步处理：调用 consumeChunk（模板方法）
   * 5. 使用 waitUntil 异步处理或直接等待
   */
  async uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File | Blob,
    waitUntil?: (promise: Promise<any>) => void,
  ): Promise<{ chunkIndex: number }> {
    const kv = this.env[this.kvName];

    // 1. 获取当前 metadata
    const metaResult = await this.getMetadata(key);
    if (!metaResult?.metadata?.chunkInfo) {
      throw new Error("Not a chunked file");
    }

    const metadata = metaResult.metadata;


    // 2. 检查分片是否已上传（使用通用工具函数）
    const isUploaded = isUploadedChunk(metadata, chunkIndex);
    if (isUploaded) {
      return { chunkIndex };
    }

    // 3. 将分片内容暂存到临时 KV（带过期时间）
    const tempChunkKey = this.getTempChunkId(key, chunkIndex);
    await kv.put(tempChunkKey, chunkFile.stream(), {
      expirationTtl: TEMP_CHUNK_TTL,
    });

    // 4. 异步处理：使用模板方法 consumeChunk
    const uploadPromise = this.consumeChunk(key, tempChunkKey, chunkIndex);

    if (waitUntil) {
      // 使用 waitUntil 异步处理，不阻塞响应
      waitUntil(uploadPromise);
    } else {
      // 如果没有 waitUntil，直接等待（兼容性）
      await uploadPromise;
    }

    return { chunkIndex };
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
   * 获取文件元数据（公开方法，用于权限检查）
   */
  async getPublicMetadata(key: string): Promise<{
    metadata: FileMetadata;
    value: string | null;
  } | null> {
    return this.getMetadata(key);
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
