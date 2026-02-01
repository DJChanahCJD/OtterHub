import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileMetadata, FileTag } from '@shared/types';
import { DBAdapterFactory } from '@utils/db-adapter';
import { proxyGet } from '@utils/proxy';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

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

      const finalFileName = (fileName || 'remote_file').substring(0, 100);
      const fileSize = parseInt(response.headers.get('content-length') || '0');

      const dbAdapter = DBAdapterFactory.getAdapter(c.env);
      const metadata: FileMetadata = {
        fileName: finalFileName,
        fileSize,
        uploadedAt: Date.now(),
        liked: false,
        tags: isNsfw ? [FileTag.NSFW] : [],
      };

      const { key } = await dbAdapter.uploadStream(response.body, metadata);
      return ok(c, { key, fileSize });
    } catch (error: any) {
      console.error('Remote upload error:', error);
      return fail(c, `Failed to upload remote file: ${error.message}`, 500);
    }
  }
);
