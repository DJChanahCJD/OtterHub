import { BaseAdapter } from "./base-adapter";
import { failResponse } from "@utils/response";
import { encodeContentDisposition } from "../common";
import { buildKeyId, getFileIdFromKey, getContentTypeByExt } from "../file";

import {
  FileMetadata,
  ApiResponse,
  Chunk,
  FileType,
} from "@shared/types";
import {
  parseRangeHeader,
  sortChunksAndCalculateSize,
  validateChunksForMerge,
} from "./shared-utils";
import {
  getTgFileId,
  getVideoThumbId,
  resolveFileDescriptor,
  buildTgApiUrl,
  buildTgFileUrl,
  getTgFilePath,
  getTgFile,
  processGifFile,
} from "./tg-tools";
import { MAX_CHUNK_SIZE } from "types";

// Telegram存储适配器实现
export class TGAdapter extends BaseAdapter {
  constructor(env: any, kvName: string) {
    super(env, kvName);
  }

  async uploadFile(
    file: File | Blob | Uint8Array,
    metadata: FileMetadata,
  ): Promise<{ key: string }> {
    if (metadata.fileSize > MAX_CHUNK_SIZE) {
      throw new Error(`File size exceeds ${MAX_CHUNK_SIZE}MB`);
    }

    const { fileName } = metadata;

    // 如果不是 File 实例，将其转换为 File
    let finalFile: File;
    if (file instanceof File) {
      finalFile = file;
    } else {
      const extension = fileName.split(".").pop()?.toLowerCase() || "";
      const contentType = getContentTypeByExt(extension);
      finalFile = new File([file as unknown as BlobPart], fileName, { type: contentType });
    }

    const { file: processedFile, fileName: processedFileName } =
      await processGifFile(finalFile, fileName);

    const { apiEndpoint, field, fileType, ext } = resolveFileDescriptor(
      processedFile,
      processedFileName,
    );

    const formData = new FormData();
    formData.append("chat_id", this.env.TG_CHAT_ID);
    formData.append(field, processedFile);

    const result = await this.sendToTelegram(formData, apiEndpoint);
    if (!result.success) {
      throw new Error(result.message);
    }

    const tgFileId = getTgFileId(result.data);
    if (!tgFileId) {
      throw new Error("Failed to extract Telegram file_id");
    }

    // 如果是视频类型，尝试获取缩略图
    if (fileType === FileType.Video) {
      const thumbFileId = getVideoThumbId(result.data);
      if (thumbFileId) {
        metadata.thumbUrl = `/file/${thumbFileId}/thumb`;
      }
    }

    const key = buildKeyId(fileType, tgFileId, ext);

    const kv = this.env[this.kvName];
    if (kv) {
      await kv.put(key, "", { metadata });
    }

    return { key };
  }

  async uploadStream(
    stream: ReadableStream,
    metadata: FileMetadata,
  ): Promise<{ key: string }> {
    // Telegram 不支持流式上传，需要转为 Blob
    const response = new Response(stream);
    const blob = await response.blob();
    return this.uploadFile(blob, metadata);
  }

  /**
   * 上传分片到 Telegram 存储
   * 由基类的 consumeChunk 模板方法调用
   */
  protected async uploadToTarget(
    chunkFile: File | Blob | Uint8Array,
    parentKey: string,
    chunkIndex: number,
    fileName?: string,
  ): Promise<{ chunkId: string; thumbUrl?: string }> {
    const formData = new FormData();
    formData.append("chat_id", this.env.TG_CHAT_ID);

    // 确保是 File 实例以便带有文件名
    let fileToUpload: File;
    if (chunkIndex === 0 && fileName) {
      // 如果是第一个分片且有文件名，使用原文件名以帮助Telegram识别文件类型（如视频）
      const blob =
        chunkFile instanceof File ? chunkFile : new Blob([chunkFile as unknown as BlobPart]);
      const type = chunkFile instanceof File ? chunkFile.type : undefined;
      fileToUpload = new File([blob], fileName, { type });
    } else if (chunkFile instanceof File) {
      fileToUpload = chunkFile;
    } else {
      fileToUpload = new File([chunkFile as unknown as BlobPart], `part-${chunkIndex}`);
    }

    formData.append("document", fileToUpload);

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
          }`,
        );
      }

      const chunkId = result.result.document.file_id;
      let thumbUrl: string | undefined;

      // 尝试获取缩略图
      if (chunkIndex === 0) {
        const thumbFileId = getVideoThumbId(result);
        if (thumbFileId) {
          thumbUrl = `/file/${thumbFileId}/thumb`;
        }
      }

      return { chunkId, thumbUrl };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error(`Chunk ${chunkIndex} upload timeout after 60s`);
      }
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
      const { fileId } = getFileIdFromKey(key);
      const ext = key.substring(key.lastIndexOf(".") + 1);
      const contentType = getContentTypeByExt(ext);

      const file = await getTgFile(fileId, this.env.TG_BOT_TOKEN);

      const { metadata } = await this.getFileMetadataWithValue(key);
      if (!metadata) {
        return failResponse(`Metadata not found for key: ${key}`, 404);
      }
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", encodeContentDisposition(metadata.fileName));
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
      return failResponse(`File not found for key: ${key}`, 404);
    }
  }

  /**
   * 合并分片文件
   */
  private async getMergedFile(key: string, req?: Request): Promise<Response> {
    const ext = key.substring(key.lastIndexOf(".") + 1);
    const contentType = getContentTypeByExt(ext);

    const { metadata, value } = await this.env[this.kvName].getWithMetadata(key);
    if (!metadata) {
      return failResponse(`Metadata not found for key: ${key}`, 404);
    }
    if (!metadata.chunkInfo) {
      return failResponse("Invalid metadata: not a chunked file", 400);
    }


    // 解析 chunks（从 value 中获取，而非 metadata.chunkInfo.chunks）
    let chunks: Chunk[] = [];
    try {
      if (value) {
        chunks = JSON.parse(value);
      }
    } catch (e) {
      console.error(`[TGAdapter] Failed to parse chunks for ${key}:`, e);
      return failResponse("Failed to parse chunks metadata", 500);
    }

    // 使用通用工具函数验证分片完整性
    const validation = validateChunksForMerge(chunks, metadata.chunkInfo.total);
    if (!validation.valid) {
      console.error(`[getMergedFile] ${validation.reason}`);
      return failResponse(validation.reason || "Invalid metadata", 425);
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

  async delete(key: string): Promise<{ isDeleted: boolean }> {
    try {
      // Telegram API不支持直接删除文件
      // 只从KV存储中删除文件信息
      await this.env[this.kvName].delete(key);

      return { isDeleted: true };
    } catch (error) {
      return { isDeleted: false };
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

      if (response.ok) {
        return { success: true, data: responseData };
      }

      const attempt = 3 - retryCount;
      const backoffMs = Math.min(30000, Math.pow(2, attempt) * 1000);
      const retryAfterSec =
        typeof responseData?.parameters?.retry_after === "number"
          ? responseData.parameters.retry_after
          : undefined;
      const waitMs =
        retryAfterSec !== undefined
          ? Math.max(backoffMs, retryAfterSec * 1000)
          : backoffMs;

      // 所有类型的文件上传失败都重试
      if (retryCount > 0) {
        // 图片类型特殊处理：转为文档方式重试
        if (apiEndpoint === "sendPhoto") {
          const newFormData = new FormData();
          newFormData.append("chat_id", formData.get("chat_id") as string);
          newFormData.append("document", formData.get("photo") as File);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          return await this.sendToTelegram(
            newFormData,
            "sendDocument",
            retryCount - 1,
          );
        }
        // 其他类型直接重试
        await new Promise((resolve) => setTimeout(resolve, waitMs));
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
        const attempt = 3 - retryCount;
        const backoffMs = Math.min(30000, Math.pow(2, attempt) * 1000);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
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
