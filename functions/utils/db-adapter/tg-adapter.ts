import { BaseAdapter } from "./base-adapter";
import { ok, fail, encodeContentDisposition } from "../common";
import { buildKeyId, getFileIdFromKey, getContentTypeByExt } from "../file";

import { FileMetadata, ApiResponse, chunkPrefix, FileType, MAX_CHUNK_SIZE } from "../types";
import { parseRangeHeader, sortChunksAndCalculateSize, findUploadedChunk } from "./shared-utils";
import { getTgFileId, resolveFileDescriptor, buildTgApiUrl, buildTgFileUrl, getTgFilePath, getTgFile } from "./tg-tools";

// Telegram存储适配器实现
export class TGAdapter extends BaseAdapter {
  constructor(env: any, kvName: string) {
    super(env, kvName);
  }

  async uploadFile(
    file: File | Blob,
    metadata: FileMetadata
  ): Promise<Response> {
    if (metadata.fileSize > MAX_CHUNK_SIZE) {
      throw new Error(`File size exceeds ${MAX_CHUNK_SIZE}MB`);
    }

    const { fileName } = metadata;

    if (!(file instanceof File)) {
      throw new Error("Invalid file");
    }

    const desc = resolveFileDescriptor(file, fileName);

    const formData = new FormData();
    formData.append("chat_id", this.env.TG_CHAT_ID);
    formData.append(desc.field, file);

    const result = await this.sendToTelegram(formData, desc.apiEndpoint);
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
      const metaResult = await this.getMetadata(key);
      if (!metaResult?.metadata?.chunkInfo) {
        throw new Error(`Not a chunked file: ${key}`);
      }

      const metadata = metaResult.metadata;

      // 使用通用工具函数检查分片是否已上传
      const existingChunk = findUploadedChunk(metadata, chunkIndex);
      if (existingChunk) {
        console.log(`[TGAdapter] Chunk ${chunkIndex} already uploaded`);
        return ok(existingChunk.file_id);
      }

      // 上传到 Telegram
      const formData = new FormData();
      formData.append("chat_id", this.env.TG_CHAT_ID);
      formData.append("document", chunkFile, `${chunkPrefix}${chunkIndex}`);

      const apiUrl = buildTgApiUrl(this.env.TG_BOT_TOKEN, "sendDocument");

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
          size: chunkFile.size,
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

      const file = await getTgFile(fileId, this.env.TG_BOT_TOKEN);

      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set(
        "Content-Disposition",
        `inline; filename="${fileId}.${ext}"`
      );
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Accept-Ranges", "bytes");

      // 获取文件大小
      const contentLength = file.headers.get("Content-Length");
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 使用通用工具函数处理 Range 请求
      const rangeResult = parseRangeHeader(req?.headers.get("Range") || null, fileSize);
      if (rangeResult && fileSize > 0) {
        const { start, end } = rangeResult;

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

    const metaResult = await this.getMetadata(key);
    if (!metaResult?.metadata?.chunkInfo) {
      return fail("Invalid metadata", 400);
    }

    const { metadata } = metaResult;
    const { chunkInfo } = metadata;

    // 使用通用工具函数排序并计算总大小
    const { sortedChunks, totalSize } = sortChunksAndCalculateSize(chunkInfo.chunks);

    // 捕获变量，避免 ReadableStream start 回调中引用丢失
    const botToken = this.env.TG_BOT_TOKEN;

    // 使用通用工具函数处理 Range 请求
    const rangeResult = parseRangeHeader(req?.headers.get("Range") || null, totalSize);
    if (rangeResult) {
      const { start, end } = rangeResult;

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

              const filePath = await getTgFilePath(chunk.file_id, botToken);
              if (!filePath) {
                throw new Error(`Missing chunk ${chunk.idx}`);
              }

              const url = buildTgFileUrl(botToken, filePath);
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

    // 使用 stream 合并分片，避免内存占用过大
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const chunk of sortedChunks) {
            const filePath = await getTgFilePath(chunk.file_id, botToken);
            if (!filePath) {
              throw new Error(`Missing chunk ${chunk.idx}`);
            }

            const url = buildTgFileUrl(botToken, filePath);
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
    const apiUrl = buildTgApiUrl(this.env.TG_BOT_TOKEN, apiEndpoint);

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
}
