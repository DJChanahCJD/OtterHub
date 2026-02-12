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
  processGifFile,
} from "./tg-tools";
import { MAX_CHUNK_SIZE } from "@shared/types";

// Telegram存储适配器实现
export class TGAdapter extends BaseAdapter {
  constructor(env: any, kvName: string) {
    super(env, kvName);
  }

  private async getCachedTgFilePath(fileId: string): Promise<string | null> {
    const kv = this.env[this.kvName];
    const cacheKey = `tgpath:${fileId}`;

    try {
      const { metadata } = await kv.getWithMetadata(cacheKey);
      if (metadata?.tgFilePath) return metadata.tgFilePath;
    } catch {
    }

    const filePath = await getTgFilePath(fileId, this.env.TG_BOT_TOKEN);
    if (!filePath) return null;

    try {
      await kv.put(cacheKey, '', {
        expirationTtl: 60 * 60 * 24 * 7,
        metadata: {
          tgFilePath: filePath,
        }
      });
    } catch {
    }

    return filePath;
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
          `Chunk ${chunkIndex} upload failed: ${result.description || "Unknown error"
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
    const kv = this.env[this.kvName];
    // 优先获取 Metadata 判断文件类型
    const { value, metadata } = await kv.getWithMetadata(key);

    if (!metadata) {
      return failResponse(`Metadata not found for key: ${key}`, 404);
    }

    // 检查是否为分片合并文件（依据 metadata.chunkInfo）
    if (metadata.chunkInfo && isChunk) {
      return await this.getMergedFile(key, req, metadata, value);
    }

    return await this.getSingleFile(key, req, metadata);
  }

  /**
   * 获取单个文件
   */
  private async getSingleFile(
    key: string,
    req: Request | undefined,
    metadata: FileMetadata
  ): Promise<Response> {
    try {
      const { fileId } = getFileIdFromKey(key);
      const ext = key.substring(key.lastIndexOf(".") + 1);
      const contentType = getContentTypeByExt(ext);

      const filePath = await this.getCachedTgFilePath(fileId);
      if (!filePath) {
        return failResponse(`File not found for key: ${key}`, 404);
      }

      const tgUrl = buildTgFileUrl(this.env.TG_BOT_TOKEN, filePath);
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", encodeContentDisposition(metadata.fileName));
      headers.set("Cache-Control", "public, max-age=3600");
      headers.set("Accept-Ranges", "bytes");

      const range = req?.headers.get("Range") || null;
      if (range) {
        const tgResp = await fetch(tgUrl, { headers: { Range: range } });

        const contentRange = tgResp.headers.get("Content-Range");
        const contentLength = tgResp.headers.get("Content-Length");

        if (contentRange) headers.set("Content-Range", contentRange);
        if (contentLength) headers.set("Content-Length", contentLength);

        return new Response(tgResp.body, {
          status: tgResp.status,
          headers,
        });
      }

      const tgResp = await fetch(tgUrl);
      const contentLength = tgResp.headers.get("Content-Length");
      if (contentLength) headers.set("Content-Length", contentLength);

      return new Response(tgResp.body, { status: tgResp.status, headers });
    } catch (error) {
      return failResponse(`File not found for key: ${key}`, 404);
    }
  }

  /**
   * 合并分片文件
   */
  private async getMergedFile(
    key: string,
    req: Request | undefined,
    metadata: FileMetadata,
    value: string | ReadableStream | ArrayBuffer | null
  ): Promise<Response> {
    const ext = key.substring(key.lastIndexOf(".") + 1);
    const contentType = getContentTypeByExt(ext);

    if (!metadata.chunkInfo) {
      return failResponse("Invalid metadata: not a chunked file", 400);
    }


    // 解析 chunks
    let chunks: Chunk[] = [];
    try {
      if (value) {
        chunks = JSON.parse(value as string);
      }
    } catch (e) {
      console.error(`[TGAdapter] Failed to parse chunks for ${key}:`, e);
      return failResponse("Failed to parse chunks metadata", 500);
    }

    // 验证分片完整性
    const validation = validateChunksForMerge(chunks, metadata.chunkInfo.total);
    if (!validation.valid) {
      console.error(`[getMergedFile] ${validation.reason}`);
      return failResponse(validation.reason || "Invalid metadata", 425);
    }

    // 排序并计算总大小
    const { sortedChunks, totalSize } = sortChunksAndCalculateSize(chunks);

    // 解析 Range 请求
    const rangeResult = parseRangeHeader(
      req?.headers.get("Range") || null,
      totalSize
    );

    // 计算实际响应的字节范围
    const start = rangeResult ? rangeResult.start : 0;
    const end = rangeResult ? rangeResult.end : totalSize - 1;

    // 准备上下文
    const botToken = this.env.TG_BOT_TOKEN;
    const getFilePath = (fileId: string) => this.getCachedTgFilePath(fileId);

    // 创建连续流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let currentOffset = 0;
          let fetchPromise: Promise<Response> | null = null;
          let nextChunkIdx = -1;

          // 找到起始分片索引
          let startChunkIdx = 0;
          for (let i = 0; i < sortedChunks.length; i++) {
            const chunk = sortedChunks[i];
            const chunkEnd = currentOffset + chunk.size;
            if (chunkEnd > start) {
              startChunkIdx = i;
              break;
            }
            currentOffset += chunk.size;
          }

          // 预读取第一个分片
          if (startChunkIdx < sortedChunks.length) {
            nextChunkIdx = startChunkIdx;
          }

          // 循环处理分片
          for (let i = startChunkIdx; i < sortedChunks.length; i++) {
            const chunk = sortedChunks[i];
            const chunkStart = currentOffset;
            const chunkEnd = currentOffset + chunk.size;

            // 如果当前分片已经超出请求范围，停止
            if (chunkStart > end) break;

            // 触发当前分片的请求（如果还没触发）
            // 或者如果已经有预读取的 promise，使用它
            let response: Response;
            
            // 预读取逻辑：始终保持 fetchPromise 是 "下一个要处理的请求"
            // 当循环开始时，fetchPromise 应该是当前分片的请求（如果是第一次）或者上一轮预读取的
            
            // 修正逻辑：
            // 我们需要处理当前分片 chunk[i]。
            // 如果 fetchPromise 存在且对应当前分片（实际上我们在循环尾部预读 i+1），则 await 它。
            // 但第一次进入循环时，fetchPromise 是 null。
            
            // 让我们使用更清晰的预读取模型：
            // 在处理 chunk[i] 之前，确保 chunk[i] 正在请求中。
            // 在处理 chunk[i] 的过程中，启动 chunk[i+1] 的请求。

            const fetchChunk = async (c: Chunk) => {
               const filePath = await getFilePath(c.file_id);
               if (!filePath) throw new Error(`Missing chunk ${c.idx}`);
               const url = buildTgFileUrl(botToken, filePath);
               
               // 计算在该分片内的请求范围
               // 分片范围: [chunkStart, chunkEnd)
               // 请求范围: [start, end + 1)
               // 交集: [max(chunkStart, start), min(chunkEnd, end + 1))
               
               const reqStart = Math.max(chunkStart, start);
               const reqEnd = Math.min(chunkEnd, end + 1);
               
               // 转换为相对于分片的 Range
               const relativeStart = reqStart - chunkStart;
               const relativeEnd = reqEnd - chunkStart;
               
               // 如果请求的是整个分片，且分片很大，TG 可能支持 Range
               // 这里我们总是使用 Range 以减少带宽（如果只需要部分）
               // TG API range 是 inclusive
               const headers: HeadersInit = {
                   "Range": `bytes=${relativeStart}-${relativeEnd - 1}`
               };
               
               return fetch(url, { headers });
            };

            if (!fetchPromise) {
                fetchPromise = fetchChunk(chunk);
            }
            
            response = await fetchPromise;
            fetchPromise = null; // 消费掉

            // 立即启动下一个分片的预读取
            if (i + 1 < sortedChunks.length) {
                const nextChunk = sortedChunks[i + 1];
                const nextChunkStart = chunkEnd;
                // 仅当下一个分片在请求范围内时才预读
                if (nextChunkStart <= end) {
                    fetchPromise = fetchChunk(nextChunk);
                }
            }

            if (!response.ok || !response.body) {
              throw new Error(`Failed to fetch chunk ${chunk.idx}`);
            }

            // 流式传输当前分片数据
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }

            currentOffset += chunk.size;
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 206, // 始终返回 206 Partial Content
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
        message: `Upload to Telegram failed: ${responseData.description || "Unknown error"
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
        message: `Network error occurred: ${error.message || "Unknown network error"
          }`,
      };
    }
  }
}
