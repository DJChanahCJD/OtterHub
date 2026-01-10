// functions/utils/db-adapter/tg-adapter.ts
import { DBAdapter } from ".";
import { ok, fail, encodeContentDisposition } from "../common";
import { buildKeyId, getFileIdFromKey, getContentTypeByExt } from "../file-tools";

import { FileMetadata, ApiResponse, chunkPrefix, FileType } from "../types";
import { getTgFileId, resolveFileDescriptor } from "./tg-tools";

// Telegram存储适配器实现
export class TGAdapter implements DBAdapter {
  private env: any;
  private kvName: string;
  // 默认分片大小 20MB
  private static readonly MAX_CHUNK_SIZE = 20 * 1024 * 1024;

  constructor(env: any, kvName: string) {
    this.env = env;
    this.kvName = kvName;
  }

  async uploadFile(
    file: File | Blob,
    metadata: FileMetadata
  ): Promise<Response> {
    if (metadata.fileSize > TGAdapter.MAX_CHUNK_SIZE) {
      throw new Error(`File size exceeds ${TGAdapter.MAX_CHUNK_SIZE}MB`);
    }
    
    const { fileName } = metadata;

    if (!(file instanceof File)) {
      throw new Error("Invalid file");
    }

    const desc = resolveFileDescriptor(file, fileName);

    const formData = new FormData();
    formData.append("chat_id", this.env.TG_CHAT_ID);
    formData.append(desc.field, file);

    const result = await this.sendToTelegram(formData, desc.api);
    if (!result.success) {
      throw new Error(result.message);
    }

    const tgFileId = getTgFileId(result.data);
    if (!tgFileId) {
      throw new Error("Failed to extract Telegram file_id");
    }

    const key = buildKeyId(desc.fileType, tgFileId, desc.ext);

    const kv = this.env[this.kvName];
    if (kv) {
      await kv.put(key, "", { metadata });
    }

    return ok(key, JSON.stringify(result));
  }

    /**
   * 上传单个分片
   * @returns 该分片的 tg_file_id
   */
  async uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File | Blob
  ): Promise<Response> {
    try {
      console.log(`[TGAdapter] Uploading chunk ${chunkIndex} for ${key}, size=${chunkFile.size}`);

      // 获取当前 KV
      const item = await this.env[this.kvName].getWithMetadata(key);

      const metadata: FileMetadata = item.metadata;

      if (!metadata.chunkInfo) {
        throw new Error(`Not a chunked file: ${key}`);
      }

      // 检查分片是否已上传
      const existingChunk = metadata.chunkInfo.chunks.find(
        (c) => c.idx === chunkIndex
      );
      if (existingChunk) {
        console.log(`[TGAdapter] Chunk ${chunkIndex} already uploaded`);
        return ok(existingChunk.file_id); // 已上传，直接返回
      }

      // 上传到 Telegram
      const formData = new FormData();
      formData.append("chat_id", this.env.TG_CHAT_ID);
      formData.append("document", chunkFile, `${chunkPrefix}${chunkIndex}`);

      const apiUrl = `https://api.telegram.org/bot${this.env.TG_BOT_TOKEN}/sendDocument`;

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const result = await response.json();

        if (!result.ok) {
          throw new Error(
            `Chunk ${chunkIndex} upload failed: ${
              result.description || "Unknown error"
            }`
          );
        }

        const tgFileId = result.result.document.file_id;
        console.log(`[TGAdapter] Chunk ${chunkIndex} uploaded successfully, tg_file_id=${tgFileId}`);

        // 更新 KV：追加分片
        metadata.chunkInfo.chunks.push({
          idx: chunkIndex,
          file_id: tgFileId,
          size: chunkFile.size, // TODO: TG是否会压缩？能否从result中获取
        });

        await this.env[this.kvName].put(key, "", { metadata });

        return ok(tgFileId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error(`Chunk ${chunkIndex} upload timeout after 60s`);
        }
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }

  async get(key: string, req?: Request): Promise<Response> {
    const { fileId, isChunk } = getFileIdFromKey(key);
    // 检查是否为分片文件
    if (isChunk) {
      return await this.getMergedFile(key, req);
    }
    return await this.getSingleFile(key, req);
  }
  /**
   * 获取单个文件
   */
  private async getSingleFile(key: string, req?: Request): Promise<Response> {
    try {
      const { fileId, isChunk } = getFileIdFromKey(key);
      const ext = key.substring(key.lastIndexOf(".") + 1);
      const contentType = getContentTypeByExt(ext);

      const file = await this.getTgFile(fileId);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set(
        "Content-Disposition",
        `inline; filename="${fileId}.${ext}"` //  实现访问url在新标签页打开的效果
      );
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Accept-Ranges", "bytes");

      // 获取文件大小
      const contentLength = file.headers.get("Content-Length");
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 处理 Range 请求
      const range = req?.headers.get("Range");
      if (range && fileSize > 0) {
        const match = /bytes=(\d+)-(\d+)?/.exec(range);
        if (match) {
          const start = Number(match[1]);
          const end = match[2] ? Number(match[2]) : fileSize - 1;

          if (start >= fileSize || end < start) {
            return new Response("Range Not Satisfiable", {
              status: 416,
              headers: {
                "Content-Range": `bytes */${fileSize}`,
              },
            });
          }

          // Telegram 不支持 Range，需要下载整个文件然后截取
          const arrayBuffer = await file.arrayBuffer();
          const slice = arrayBuffer.slice(start, end + 1);

          headers.set("Content-Range", `bytes ${start}-${end}/${fileSize}`);
          headers.set("Content-Length", String(end - start + 1));

          return new Response(slice, {
            status: 206,
            headers,
          });
        }
      }

      if (fileSize > 0) {
        headers.set("Content-Length", String(fileSize));
      }

      return new Response(file.body, {
        status: file.status,
        headers,
      });
    } catch (error) {
      return fail(`File not found for key: ${key}`, 404);
    }
  }

  /**
   * 合并分片文件
   */
  private async getMergedFile(key: string, req?: Request): Promise<Response> {
    const ext = key.substring(key.lastIndexOf(".") + 1);
    const contentType = getContentTypeByExt(ext);

    const item = await this.env[this.kvName].getWithMetadata(key);
    const metadata: FileMetadata = item.metadata;

    if (!metadata?.chunkInfo) {
      return fail("Invalid metadata", 400);
    }

    const { chunkInfo } = metadata;

    if (chunkInfo.chunks.length !== chunkInfo.total) {
      return fail(
        `Incomplete file: ${chunkInfo.chunks.length}/${chunkInfo.total}`,
        425
      );
    }

    const sortedChunks = [...chunkInfo.chunks].sort((a, b) => a.idx - b.idx);
    const totalSize = sortedChunks.reduce((sum, c) => sum + c.size, 0);

    // 捕获 this 引用，避免 ReadableStream start 回调中 this 丢失
    const botToken = this.env.TG_BOT_TOKEN;
    const getFilePath = this.getTgFilePath.bind(this);

    // 处理 Range 请求
    const range = req?.headers.get("Range");
    if (range) {
      const match = /bytes=(\d+)-(\d+)?/.exec(range);
      if (match) {
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : totalSize - 1;

        if (start >= totalSize || end < start) {
          return new Response("Range Not Satisfiable", {
            status: 416,
            headers: {
              "Content-Range": `bytes */${totalSize}`,
            },
          });
        }

        // 创建 Range 流
        const rangeStream = new ReadableStream({
          async start(controller) {
            try {
              let byteOffset = 0;
              const targetEnd = end + 1;

              for (const chunk of sortedChunks) {
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

                const filePath = await getFilePath(chunk.file_id);
                if (!filePath) {
                  throw new Error(`Missing chunk ${chunk.idx}`);
                }

                const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
                const res = await fetch(url);

                if (!res.ok || !res.body) {
                  throw new Error(`Failed to fetch chunk ${chunk.idx}`);
                }

                // 读取整个分片，然后截取需要的部分
                const arrayBuffer = await res.arrayBuffer();
                const slice = arrayBuffer.slice(readStart, readEnd);
                controller.enqueue(new Uint8Array(slice));

                byteOffset += chunk.size;
              }

              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(rangeStream, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${end}/${totalSize}`,
            "Content-Length": String(end - start + 1),
            "Content-Disposition": encodeContentDisposition(metadata.fileName),
            "Cache-Control": "public, max-age=3600",
            "Accept-Ranges": "bytes",
          },
        });
      }
    }

    // 使用 stream 合并分片，避免内存占用过大
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of sortedChunks) {
            const filePath = await getFilePath(chunk.file_id);
            if (!filePath) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }

            const url = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
            const res = await fetch(url);

            if (!res.ok || !res.body) {
              throw new Error(`Failed to fetch chunk ${chunk.idx}`);
            }

            // 直接 pipe 到 controller，不落内存
            const reader = res.body.getReader();
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

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": encodeContentDisposition(metadata.fileName),
        "Cache-Control": "public, max-age=3600",
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalSize),
      },
    });
  }

  /**
   * 获取上传进度
   * @returns { uploaded: number, total: number, complete: boolean }
   */
  async getProgress(key: string): Promise<{
    uploaded: number;
    total: number;
    complete: boolean;
  } | null> {
    // 获取当前 KV
    const item = await this.env[this.kvName].getWithMetadata(key);

    const metadata: FileMetadata = item.metadata;

    if (!metadata?.chunkInfo) {
      return null;
    }

    const { chunkInfo } = metadata;
    const uploaded = chunkInfo.chunks.length;
    const total = chunkInfo.total;
    const complete = uploaded === total;

    return { uploaded, total, complete };
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Telegram API不支持直接删除文件
      // 只从KV存储中删除文件信息
      await this.env[this.kvName].delete(key);

      return true;
    } catch (error) {
      return false;
    }
  }

  // https://core.telegram.org/bots/api#sending-files
  private async sendToTelegram(
    formData: FormData,
    apiEndpoint: string,
    retryCount = 3
  ): Promise<ApiResponse<any>> {
    const apiUrl = `https://api.telegram.org/bot${this.env.TG_BOT_TOKEN}/${apiEndpoint}`;

    try {
      const response = await fetch(apiUrl, { method: "POST", body: formData });
      const responseData = await response.json();
      console.log("Telegram response:", responseData);

      if (response.ok) {
        return { success: true, data: responseData };
      }

      // 所有类型的文件上传失败都重试
      if (retryCount > 0) {
        console.log(`Retry ${retryCount} times left. Retrying upload...`);
        // 图片类型特殊处理：转为文档方式重试
        if (apiEndpoint === "sendPhoto") {
          console.log("Retrying image as document...");
          const newFormData = new FormData();
          newFormData.append("chat_id", formData.get("chat_id") as string);
          newFormData.append("document", formData.get("photo") as File);
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (3 - retryCount))
          );
          return await this.sendToTelegram(
            newFormData,
            "sendDocument",
            retryCount - 1
          );
        }
        // 其他类型直接重试
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (3 - retryCount))
        );
        return await this.sendToTelegram(formData, apiEndpoint, retryCount - 1);
      }

      return {
        success: false,
        message: `Upload to Telegram failed: ${
          responseData.description || "Unknown error"
        }`,
      };
    } catch (error: any) {
      if (retryCount > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (3 - retryCount))
        );
        return await this.sendToTelegram(formData, apiEndpoint, retryCount - 1);
      }
      return {
        success: false,
        message: `Network error occurred: ${
          error.message || "Unknown network error"
        }`,
      };
    }
  }

  // Telegram Bot API 文件处理逻辑
  // 原Telegraph API: 'https://telegra.ph/' + url.pathname + url.search;
  private async getTgFile(fileId: string) {
    const filePath = await this.getTgFilePath(fileId);

    if (!filePath) {
      return fail(`File not found: ${fileId}`, 404);
    }

    const url = `https://api.telegram.org/file/bot${this.env.TG_BOT_TOKEN}/${filePath}`;
    return fetch(url);
  }

  private async getTgFilePath(fileId: string): Promise<string | null> {
    // TODO: 考虑缓存url
    const url = `https://api.telegram.org/bot${this.env.TG_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    return data?.ok ? data.result.file_path : null;
  }
}
