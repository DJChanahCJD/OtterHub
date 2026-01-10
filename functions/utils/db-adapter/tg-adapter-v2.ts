import { BaseAdapter } from "./base-adapter";
import { ok, fail, encodeContentDisposition } from "../common";
import { buildKeyId, getFileIdFromKey, getContentTypeByExt } from "../file";

import {
  FileMetadata,
  ApiResponse,
  chunkPrefix,
  FileType,
  MAX_CHUNK_SIZE,
  TEMP_CHUNK_TTL,
  Chunk,
} from "../types";
import {
  parseRangeHeader,
  sortChunksAndCalculateSize,
  findUploadedChunk,
  validateChunks,
  streamToBlob,
} from "./shared-utils";
import {
  getTgFileId,
  resolveFileDescriptor,
  buildTgApiUrl,
  buildTgFileUrl,
  getTgFilePath,
  getTgFile,
} from "./tg-tools";

// Telegram存储适配器实现（新版本：优化分片上传）
export class TGAdapterV2 extends BaseAdapter {
  constructor(env: any, kvName: string) {
    super(env, kvName);
  }

  async uploadFile(
    file: File | Blob,
    metadata: FileMetadata,
  ): Promise<Response> {
    if (metadata.fileSize > MAX_CHUNK_SIZE) {
      throw new Error(`File size exceeds ${MAX_CHUNK_SIZE}MB`);
    }

    const { fileName } = metadata;

    if (!(file instanceof File)) {
      throw new Error("Invalid file");
    }

    const { apiEndpoint, field, fileType, ext } = resolveFileDescriptor(
      file,
      fileName,
    );

    const formData = new FormData();
    formData.append("chat_id", this.env.TG_CHAT_ID);
    formData.append(field, file);

    const result = await this.sendToTelegram(formData, apiEndpoint);
    if (!result.success) {
      throw new Error(result.message);
    }

    const tgFileId = getTgFileId(result.data);
    if (!tgFileId) {
      throw new Error("Failed to extract Telegram file_id");
    }

    const key = buildKeyId(fileType, tgFileId, ext);

    const kv = this.env[this.kvName];
    if (kv) {
      await kv.put(key, "", { metadata });
    }

    return ok(key, JSON.stringify(result));
  }

  /**
   * 消费分片：从临时 KV 读取，上传到 Telegram，更新 KV metadata
   */
  protected async consumeChunk(
    parentKey: string,
    tempChunkKey: string,
    chunkIndex: number,
  ): Promise<void> {
    const kv = this.env[this.kvName];

    try {
      console.log(
        `[TGAdapterV2] Processing chunk ${chunkIndex} for ${parentKey}`,
      );

      // 1. 从临时 KV 读取分片内容
      const chunkStream = await kv.get(tempChunkKey, "stream");
      if (!chunkStream) {
        console.error(`[TGAdapterV2] Temp chunk not found: ${tempChunkKey}`);
        return;
      }

      // 2. 将 stream 转换为 File
      const chunkBlob = await streamToBlob(chunkStream);
      const chunkFile = new File([chunkBlob], `${chunkPrefix}${chunkIndex}`);

      // 3. 上传到 Telegram
      const formData = new FormData();
      formData.append("chat_id", this.env.TG_CHAT_ID);
      formData.append("document", chunkFile);

      const apiUrl = buildTgApiUrl(this.env.TG_BOT_TOKEN, "sendDocument");

      // 添加超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时

      let tgFileId: string;
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
            }`,
          );
        }

        tgFileId = result.result.document.file_id;
        console.log(
          `[TGAdapterV2] Uploaded chunk ${chunkIndex} to Telegram: ${tgFileId}`,
        );
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error(`Chunk ${chunkIndex} upload timeout after 60s`);
        }
        throw error;
      }

      // 4. 更新 KV（使用重试机制避免并发冲突）
      await this.updateChunkInfo(
        parentKey,
        chunkIndex,
        tgFileId,
        chunkFile.size,
      );

      // 5. 删除临时 KV
      await kv.delete(tempChunkKey);

      console.log(`[TGAdapterV2] Completed chunk ${chunkIndex}`);
    } catch (error) {
      console.error(
        `[TGAdapterV2] Error processing chunk ${chunkIndex}:`,
        error,
      );
      // 即使出错也要删除临时 KV，避免堆积
      try {
        await kv.delete(tempChunkKey);
      } catch (e) {
        // 忽略删除错误
      }
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
      headers.set("Content-Disposition", `inline; filename="${fileId}.${ext}"`);
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Accept-Ranges", "bytes");

      // 获取文件大小
      const contentLength = file.headers.get("Content-Length");
      const fileSize = contentLength ? parseInt(contentLength, 10) : 0;

      // 使用通用工具函数处理 Range 请求
      const rangeResult = parseRangeHeader(
        req?.headers.get("Range") || null,
        fileSize,
      );
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

    const item = await this.getMetadata(key);
    if (!item?.metadata?.chunkInfo) {
      return fail("Invalid metadata", 400);
    }

    const { metadata, value } = item;

    // 解析 chunks（从 value 中获取，而非 metadata.chunkInfo.chunks）
    let chunks: Chunk[] = [];
    try {
      if (value) {
        chunks = JSON.parse(value);
      }
    } catch (e) {
      console.error(`[TGAdapterV2] Failed to parse chunks for ${key}:`, e);
      return fail("Failed to parse chunks metadata", 500);
    }

    // 使用通用工具函数验证分片完整性
    const validation = validateChunks(metadata, chunks);
    if (!validation.valid) {
      console.error(`[getMergedFile] ${validation.reason}`);
      return fail(validation.reason || "Invalid metadata", 425);
    }

    // 使用通用工具函数排序并计算总大小
    const { sortedChunks, totalSize } = sortChunksAndCalculateSize(chunks);

    // 捕获变量，避免 ReadableStream start 回调中引用丢失
    const botToken = this.env.TG_BOT_TOKEN;

    // 使用通用工具函数处理 Range 请求
    const rangeResult = parseRangeHeader(
      req?.headers.get("Range") || null,
      totalSize,
    );
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
    retryCount = 3,
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
            setTimeout(resolve, 1000 * (3 - retryCount)),
          );
          return await this.sendToTelegram(
            newFormData,
            "sendDocument",
            retryCount - 1,
          );
        }
        // 其他类型直接重试
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (3 - retryCount)),
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
          setTimeout(resolve, 1000 * (3 - retryCount)),
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
