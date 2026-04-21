import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileMetadata, FileTag, MAX_FILENAME_LENGTH } from '@shared/types';
import { DBAdapterFactory } from '@utils/db-adapter';
import { proxyGet } from '@utils/proxy';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';
import {
  extractMimeType,
  extractFileNameFromDisposition,
  extractFileNameFromUrl,
  getExtByMime,
  hasExtension,
} from '@shared/utils/file';

export const urlUploadRoutes = new Hono<{ Bindings: Env }>();

urlUploadRoutes.post(
  '/by-url',
  zValidator(
    'json',
    z.object({
      url: z.string().url(),
      fileName: z.string().optional(),
      isNsfw: z.boolean().optional().default(false),
    })
  ),
  async (c) => {
    const { url, fileName, isNsfw } = c.req.valid('json');

    try {
      const response = await proxyGet(url);
      if (!response.ok) {
        return fail(c, `Failed to fetch remote file: Status ${response.status}`, response.status as any);
      }

      if (!response.body) {
        return fail(c, 'Empty response body from remote URL', 502);
      }

      // 1. 提取 MIME 类型
      const mimeType = extractMimeType(response.headers.get('content-type'));

      // 2. 推导文件名（优先级：用户传入 > URL 路径 > Content-Disposition）
      let resolvedName =
        fileName ||
        extractFileNameFromUrl(url) ||
        extractFileNameFromDisposition(response.headers.get('content-disposition')) ||
        'remote_file';

      // 3. 若文件名无扩展名，根据 MIME 类型补全
      if (!hasExtension(resolvedName) && mimeType) {
        const ext = getExtByMime(mimeType);
        if (ext) resolvedName += ext;
      }

      const finalFileName = resolvedName.substring(0, MAX_FILENAME_LENGTH);
      const fileSize = parseInt(response.headers.get('content-length') || '0');

      const dbAdapter = DBAdapterFactory.getAdapter(c.env);
      const metadata: FileMetadata = {
        fileName: finalFileName,
        fileSize,
        uploadedAt: Date.now(),
        liked: false,
        tags: isNsfw ? [FileTag.NSFW] : [],
      };

      const { key } = await dbAdapter.uploadStream(
        response.body, 
        metadata, 
        c.executionCtx.waitUntil.bind(c.executionCtx),
        mimeType
      );
      return ok(c, { key, fileSize });
    } catch (error: any) {
      console.error('Remote upload error:', error);
      return fail(c, `Failed to upload remote file: ${error.message}`, 500);
    }
  }
);
