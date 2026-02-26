import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileType, FileMetadata, chunkPrefix, MAX_FILENAME_LENGTH, MAX_FILE_SIZE, MAX_CHUNK_NUM } from '@shared/types';
import { DBAdapterFactory } from '@utils/db-adapter';
import { getUniqueFileId, buildKeyId, getFileExt } from '@utils/file';
import { TEMP_CHUNK_TTL } from 'types';
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
      fileName: z.string().min(1).max(MAX_FILENAME_LENGTH),
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

chunkUploadRoutes.get(
  '/chunk/progress',
  zValidator(
    'query',
    z.object({
      key: z.string().min(1),
    })
  ),
  async (c) => {
    const { key } = c.req.valid('query');

    try {
      const kv = c.env.oh_file_url;
      const item = await kv.getWithMetadata(key);
      const metadata = item.metadata as FileMetadata | null;

      if (!metadata?.chunkInfo) {
        return fail(c, 'Not a chunked file', 400);
      }

      const uploadedIndices = metadata.chunkInfo.uploadedIndices || [];
      const total = metadata.chunkInfo.total || 0;
      const uploaded = uploadedIndices.length;
      const complete = total > 0 && uploaded === total;

      return ok(c, { uploadedIndices, uploaded, total, complete });
    } catch (error: any) {
      console.error(`Get chunk progress error: ${error.message}`);
      return fail(c, error.message, 400);
    }
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
