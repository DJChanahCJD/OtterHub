import { DBAdapter } from ".";
import { buildKeyId, ok, fail, getUniqueFileId, getFileIdFromKey, getContentTypeByExt, encodeContentDisposition } from "../common";
import { Chunk, FileMetadata, FileType } from "../types";

// R2存储适配器实现
export class R2Adapter implements DBAdapter {
  private env: any;
  private bucketName: string;
  private kvName: string;

  constructor(env: any, bucketName: string, kvName: string) {
    this.env = env;
    this.bucketName = bucketName;
    this.kvName = kvName;
  }

  async uploadFile(file: File | Blob, metadata: FileMetadata): Promise<Response> {
    // 生成唯一的fileId
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

    // 将文件信息保存到KV存储
    if (this.env[this.kvName]) {
      await this.env[this.kvName].put(key, "", { metadata });
    }

    return ok(key);
  }

  async uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File
  ): Promise<Response> {
    // 获取 KV 中的 metadata
    const item = await this.env[this.kvName].getWithMetadata(key);
    const metadata: FileMetadata = item.metadata;

    if (!metadata?.chunkInfo) {
      return fail("Not a chunked file", 400);
    }

    // 检查分片是否已上传
    const existingChunk = metadata.chunkInfo.chunks.find(
      (c) => c.idx === chunkIndex
    );
    if (existingChunk) {
      return ok(existingChunk.file_id);
    }

    // 构建分片在 R2 中的 key: {原始key}_{index}
    const chunkId = `${key}_${chunkIndex}`;

    // 上传分片到 R2
    await this.env[this.bucketName].put(chunkId, chunkFile, {
      httpMetadata: {
        contentType: chunkFile.type,
      },
    });

    // 更新 KV：追加分片信息
    metadata.chunkInfo.chunks.push({
      idx: chunkIndex,
      file_id: chunkId,
      size: chunkFile.size,
    });

    await this.env[this.kvName].put(key, "", { metadata });

    return ok(chunkId);
  }

  async get(key: string, req?: Request): Promise<Response> {
    const { fileId, isChunk } = getFileIdFromKey(key);
    // 检查是否为分片文件
    if (isChunk) {
        return await this.getMergedFile(key, req);
    }
    return await this.getSingleFile(key, req);
  }

  private async getSingleFile(key: string, req?: Request): Promise<Response> {
    const object = await this.env[this.bucketName].get(key);
    if (!object) {
      return fail(`File not found for key: ${key}`, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("Accept-Ranges", "bytes");

    const size = object.size;
    const range = req?.headers.get("Range");

    // ===== 处理 Range 请求 =====
    if (range) {
      // 只支持单段 Range：bytes=start-end
      const match = /bytes=(\d+)-(\d+)?/.exec(range);
      if (!match) {
        return new Response("Invalid Range", { status: 416 });
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : size - 1;

      if (start >= size || end < start) {
        return new Response("Range Not Satisfiable", { status: 416 });
      }

      const partial = await this.env[this.bucketName].get(key, {
        range: { start, end },
      });

      headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
      headers.set("Content-Length", String(end - start + 1));

      return new Response(partial.body, {
        status: 206,
        headers,
      });
    }

    // ===== 非 Range：返回完整文件 =====
    headers.set("Content-Length", String(size));
    return new Response(object.body, {
      status: 200,
      headers,
    });
  }

  private async getMergedFile(key: string, req?: Request): Promise<Response> {
    // 获取 metadata
    const item = await this.env[this.kvName].getWithMetadata(key);
    const metadata: FileMetadata = item.metadata;

    if (!metadata?.chunkInfo) {
      return fail("Invalid metadata", 400);
    }

    const { chunkInfo } = metadata;

    // 检查分片是否完整
    if (chunkInfo.chunks.length !== chunkInfo.total) {
      return fail(
        `Incomplete file: ${chunkInfo.chunks.length}/${chunkInfo.total}`,
        425
      );
    }

    // 按索引排序
    const sortedChunks = [...chunkInfo.chunks].sort((a, b) => a.idx - b.idx);

    // 计算总大小
    const totalSize = sortedChunks.reduce((sum, c) => sum + c.size, 0);

    const headers = new Headers();
    const ext = metadata.fileName.split(".").pop()?.toLowerCase() || "bin";
    headers.set("Content-Type", getContentTypeByExt(ext));
    headers.set("Accept-Ranges", "bytes");

    // 处理 Range 请求
    const range = req?.headers.get("Range");
    if (range) {
      const match = /bytes=(\d+)-(\d+)?/.exec(range);
      if (!match) {
        return new Response("Invalid Range", { status: 416 });
      }

      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : totalSize - 1;

      if (start >= totalSize || end < start) {
        return new Response("Range Not Satisfiable", { status: 416 });
      }

      headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      headers.set("Content-Length", String(end - start + 1));

      return new Response(
        this.createRangeStream(sortedChunks, start, end),
        { status: 206, headers }
      );
    }

    // 非 Range：返回完整文件
    headers.set("Content-Length", String(totalSize));
    headers.set("Content-Disposition", encodeContentDisposition(metadata.fileName));

    return new Response(this.createMergedStream(sortedChunks), {
      status: 200,
      headers,
    });
  }

  // 创建合并流
  private createMergedStream(chunks: Chunk[]) {
    // 捕获 this 引用，避免 ReadableStream start 回调中 this 丢失
    const bucket = this.env[this.bucketName];
    return new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of chunks) {
            const object = await bucket.get(chunk.file_id);
            if (!object) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }
            const reader = object.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }

  // 创建 Range 流
  private createRangeStream(chunks: Chunk[], start: number, end: number) {
    // 捕获 this 引用，避免 ReadableStream start 回调中 this 丢失
    const bucket = this.env[this.bucketName];
    return new ReadableStream({
      async start(controller) {
        try {
          let byteOffset = 0;
          const targetEnd = end + 1;

          for (const chunk of chunks) {
            const chunkStart = byteOffset;
            const chunkEnd = byteOffset + chunk.size;

            // 跳过不在范围内的分片
            if (chunkEnd <= start || chunkStart >= targetEnd) {
              byteOffset += chunk.size;
              continue;
            }

            const object = await bucket.get(chunk.file_id);
            if (!object) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }

            // 计算当前分片需要读取的范围
            const readStart = Math.max(0, start - chunkStart);
            const readEnd = Math.min(chunk.size, targetEnd - chunkStart);

            const ranged = await bucket.get(chunk.file_id, {
              range: { start: readStart, end: readEnd - 1 },
            });

            const reader = ranged.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }

            byteOffset += chunk.size;
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }

  async delete(key: string): Promise<boolean> {
    try {
      // 检查是否为分片文件，需要删除所有分片
      const item = await this.env[this.kvName].getWithMetadata(key);
      const metadata: FileMetadata = item.metadata;

      if (metadata?.chunkInfo?.chunks) {
        // 删除所有分片
        const deletePromises = metadata.chunkInfo.chunks.map(chunk =>
          this.env[this.bucketName].delete(chunk.file_id)
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
