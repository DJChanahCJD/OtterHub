import { DBAdapter } from ".";
import { FileMetadata } from "../types";
import { validateChunks } from "./shared-utils";

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
  abstract uploadFile(file: File | Blob, metadata: FileMetadata): Promise<Response>;
  abstract uploadChunk(key: string, chunkIndex: number, chunkFile: File | Blob, waitUntil?: (promise: Promise<any>) => void): Promise<Response>;
  abstract get(key: string, req?: Request): Promise<Response>;
  abstract delete(key: string): Promise<boolean>;

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
    const uploaded = chunkInfo.uploadedIndices?.length
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
   * 将 ReadableStream 转换为 Blob
   */
  protected async streamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
    const reader = stream.getReader();
    const chunks: BlobPart[] = [];
  
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  
    return new Blob(chunks);
  }
}
