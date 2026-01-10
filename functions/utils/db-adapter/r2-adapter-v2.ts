import { BaseAdapter } from "./base-adapter";
import { ok, fail, encodeContentDisposition } from "../common";
import {
  getUniqueFileId,
  buildKeyId,
  getFileIdFromKey,
  getContentTypeByExt,
} from "../file";
import {
  Chunk,
  FileMetadata,
  FileType,
  TEMP_CHUNK_TTL,
  chunkPrefix,
} from "../types";
import {
  parseRangeHeader,
  validateChunks,
  sortChunksAndCalculateSize,
} from "./shared-utils";

// R2存储适配器实现（新版本：优化分片上传）
export class R2AdapterV2 extends BaseAdapter {
  private bucketName: string;

  constructor(env: any, bucketName: string, kvName: string) {
    super(env, kvName);
    this.bucketName = bucketName;
  }

  async uploadFile(
    file: File | Blob,
    metadata: FileMetadata,
  ): Promise<Response> {
    const fileId = getUniqueFileId();
    const fileName = metadata.fileName;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    // 根据文件类型确定前缀
    let fileType: FileType;
    if (file.type.startsWith("image/")) {
      fileType = FileType.Image;
    } else if (file.type.startsWith("audio/")) {
      fileType = FileType.Audio;
    } else if (file.type.startsWith("video/")) {
      fileType = FileType.Video;
    } else {
      fileType = FileType.Document;
    }

    // 构建带有前缀的完整fileId
    const key = buildKeyId(fileType, fileId, fileExtension);

    // 将文件上传到R2存储
    await this.env[this.bucketName].put(key, file, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 将文件信息保存到KV存储（value 为空字符串，chunks 在 metadata）
    if (this.env[this.kvName]) {
      await this.env[this.kvName].put(key, "", { metadata });
    }

    return ok(key);
  }

  /**
   * 上传分片到 R2 存储
   * 由基类的 consumeChunk 模板方法调用
   */
  protected async uploadToTarget(
    chunkFile: File,
    parentKey: string,
    chunkIndex: number,
  ): Promise<string> {
    const bucket = this.env[this.bucketName];
    const chunkId = this.getTempChunkId(parentKey, chunkIndex);

    await bucket.put(chunkId, chunkFile, {
      httpMetadata: {
        contentType: chunkFile.type,
      },
    });

    return chunkId;
  }

  async get(key: string, req?: Request): Promise<Response> {
    const { fileId, isChunk } = getFileIdFromKey(key);
    if (isChunk) {
      return await this.getMergedFile(key, req);
    }
    return await this.getSingleFile(key, req);
  }

  private async getSingleFile(key: string, req?: Request): Promise<Response> {
    try {
      const object = await this.env[this.bucketName].get(key);
      if (!object) {
        console.error(`[getSingleFile] File not found: ${key}`);
        return fail(`File not found for key: ${key}`, 404);
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("Accept-Ranges", "bytes");

      // 覆盖 Content-Type 为标准的（带 charset）
      const ext = key.substring(key.lastIndexOf(".") + 1);
      headers.set("Content-Type", getContentTypeByExt(ext));

      const size = object.size;
      const range = req?.headers.get("Range");

      // 处理 Range 请求（使用通用工具函数）
      const rangeResult = parseRangeHeader(range, size);
      if (rangeResult) {
        const { start, end } = rangeResult;

        const partial = await this.env[this.bucketName].get(key, {
          range: { offset: start, length: end - start + 1 },
        });

        if (!partial) {
          return fail("Failed to read file range", 500);
        }

        headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
        headers.set("Content-Length", String(end - start + 1));

        return new Response(partial.body, { status: 206, headers });
      }

      headers.set("Content-Length", String(size));
      return new Response(object.body, { status: 200, headers });
    } catch (error) {
      console.error(`[getSingleFile] Error:`, error);
      return fail(`Failed to read file: ${error}`, 500);
    }
  }

  private async getMergedFile(key: string, req?: Request): Promise<Response> {
    try {
      const metaResult = await this.getMetadata(key);
      if (!metaResult) {
        console.error(`[getMergedFile] No metadata found for key: ${key}`);
        return fail("Metadata not found", 404);
      }

      const { metadata, value } = metaResult;

      // 解析 chunks
      let chunks: Chunk[] = [];
      try {
        if (value) {
          chunks = JSON.parse(value);
        }
      } catch (e) {
        console.error(`[getMergedFile] Failed to parse chunks for ${key}:`, e);
        return fail("Failed to parse chunks metadata", 500);
      }

      // 使用通用工具函数验证分片完整性
      const validation = validateChunks(metadata);
      if (!validation.valid) {
        console.error(`[getMergedFile] ${validation.reason}`);
        return fail(validation.reason || "Invalid metadata", 425);
      }

      // 使用通用工具函数排序并计算总大小
      const { sortedChunks, totalSize } = sortChunksAndCalculateSize(chunks);

      const headers = new Headers();
      const ext = metadata.fileName.split(".").pop()?.toLowerCase() || "bin";
      headers.set("Content-Type", getContentTypeByExt(ext));
      headers.set("Accept-Ranges", "bytes");

      // 处理 Range 请求（使用通用工具函数）
      const rangeResult = parseRangeHeader(
        req?.headers.get("Range") || null,
        totalSize,
      );
      if (rangeResult) {
        const { start, end } = rangeResult;

        headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
        headers.set("Content-Length", String(end - start + 1));
        headers.set("Cache-Control", "no-cache");

        return new Response(this.createRangeStream(sortedChunks, start, end), {
          status: 206,
          headers,
        });
      }

      // 非 Range：返回完整文件
      headers.set("Content-Length", String(totalSize));
      headers.set(
        "Content-Disposition",
        encodeContentDisposition(metadata.fileName),
      );

      return new Response(this.createMergedStream(sortedChunks), {
        status: 200,
        headers,
      });
    } catch (error) {
      console.error(`[getMergedFile] Error:`, error);
      return fail(`Failed to read merged file: ${error}`, 500);
    }
  }

  // 创建合并流
  private createMergedStream(chunks: Chunk[]) {
    const bucket = this.env[this.bucketName];
    return new ReadableStream({
      async start(controller) {
        try {
          console.log(`[createMergedStream] Merging ${chunks.length} chunks`);
          for (const chunk of chunks) {
            const object = await bucket.get(chunk.file_id);
            if (!object) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }

            const reader = object.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } finally {
              reader.releaseLock();
            }
          }
          console.log(`[createMergedStream] Completed`);
          controller.close();
        } catch (err) {
          console.error(`[createMergedStream] Error:`, err);
          controller.error(err);
        }
      },
      cancel() {
        console.log(`[createMergedStream] Cancelled`);
      },
    });
  }

  // 创建 Range 流
  private createRangeStream(chunks: Chunk[], start: number, end: number) {
    const bucket = this.env[this.bucketName];
    return new ReadableStream({
      async start(controller) {
        try {
          let byteOffset = 0;
          const targetEnd = end + 1;

          console.log(
            `[Range] Stream start: ${start}-${end}/${chunks.length} chunks`,
          );

          for (const chunk of chunks) {
            const chunkStart = byteOffset;
            const chunkEnd = byteOffset + chunk.size;

            // 跳过不在范围内的分片
            if (chunkEnd <= start || chunkStart >= targetEnd) {
              byteOffset += chunk.size;
              continue;
            }

            // 计算当前分片需要读取的范围
            const readStart = Math.max(0, start - chunkStart);
            const readEnd = Math.min(chunk.size, targetEnd - chunkStart);

            // 检查是否需要读取完整分片
            const isFullChunk = readStart === 0 && readEnd === chunk.size;

            let object;
            if (isFullChunk) {
              object = await bucket.get(chunk.file_id);
            } else {
              object = await bucket.get(chunk.file_id, {
                range: { offset: readStart, length: readEnd - readStart },
              });
            }

            if (!object) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }

            const reader = object.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                controller.enqueue(value);
              }
            } finally {
              reader.releaseLock();
            }

            byteOffset += chunk.size;
          }

          console.log(`[Range] Stream completed`);
          controller.close();
        } catch (err) {
          console.error(`[Range] Stream error:`, err);
          controller.error(err);
        }
      },
      cancel() {
        console.log(`[Range] Stream cancelled`);
      },
    });
  }

  async delete(key: string): Promise<boolean> {
    try {
      const metaResult = await this.getMetadata(key);
      if (!metaResult) {
        return false;
      }

      const { value } = metaResult;
      let chunks: Chunk[] = [];
      try {
        if (value) {
          chunks = JSON.parse(value);
        }
      } catch (e) {
        console.error(`[delete] Failed to parse chunks for ${key}:`, e);
      }

      // 删除所有分片
      if (chunks.length > 0) {
        const deletePromises = chunks.map((chunk) =>
          this.env[this.bucketName].delete(chunk.file_id),
        );
        await Promise.all(deletePromises);
      }

      // 删除主文件
      await this.env[this.bucketName].delete(key);

      // 从KV存储中删除文件信息
      await this.env[this.kvName].delete(key);

      return true;
    } catch (error) {
      console.error("R2 delete error:", error);
      return false;
    }
  }
}
