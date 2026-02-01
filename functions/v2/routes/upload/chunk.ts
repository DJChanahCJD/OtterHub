import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileType, FileMetadata, chunkPrefix } from '@shared/types';
import { DBAdapterFactory } from '@utils/db-adapter';
import { getUniqueFileId, buildKeyId, getFileExt } from '@utils/file';
import { MAX_CHUNK_NUM, MAX_FILE_SIZE, TEMP_CHUNK_TTL } from '@utils/types';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

export const chunkUploadRoutes = new Hono<{ Bindings: Env }>();

// 初始化分片上传
chunkUploadRoutes.get(
  '/chunk/init',
  zValidator(
    'query',
    z.object({
      fileType: z.nativeEnum(FileType),
      fileName: z.string().min(1).max(100),
      fileSize: z.string().transform(v => parseInt(v, 10)),
      totalChunks: z.string().transform(v => parseInt(v, 10)),
    })
  ),
  async (c) => {
    const { fileType, fileName, fileSize, totalChunks } = c.req.valid('query');

    if (fileSize > MAX_FILE_SIZE || totalChunks > MAX_CHUNK_NUM) {
      return fail(c, "File size exceeds the limit", 400);
    }

    const fileId = getUniqueFileId();
    const key = buildKeyId(fileType, `${chunkPrefix}${fileId}`, getFileExt(fileName));

    const metadata: FileMetadata = {
      fileName,
      fileSize,
      uploadedAt: Date.now(),
      liked: false,
      chunkInfo: {
        total: totalChunks,
        uploadedIndices: [],
      },
    };

    const kv = c.env.oh_file_url;
    await kv.put(key, "", { metadata, expirationTtl: TEMP_CHUNK_TTL });

    return ok(c, key);
  }
);

// 上传分片
chunkUploadRoutes.post(
  '/chunk',
  async (c) => {
    try {
      const formData = await c.req.formData();
      const key = formData.get("key") as string;
      const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
      const chunk = formData.get("chunkFile") as File;

      if (!key || isNaN(chunkIndex) || !chunk) {
        return fail(c, "Missing required parameters", 400);
      }

      const db = DBAdapterFactory.getAdapter(c.env);
      const { chunkIndex: uploadedChunkIndex } = await db.uploadChunk(key, chunkIndex, chunk, c.executionCtx.waitUntil.bind(c.executionCtx));
      
      return ok(c, uploadedChunkIndex);
    } catch (error: any) {
      console.error(`Upload chunk error: ${error.message}`);
      return fail(c, error.message, 400);
    }
  }
);
