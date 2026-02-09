import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileMetadata } from '@shared/types';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

export const metaRoutes = new Hono<{ Bindings: Env }>();

metaRoutes.patch(
  '/:key/meta',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      fileName: z.string().max(100).optional(),
      tags: z.array(z.string()).optional(),
    })
  ),
  async (c) => {
    const key = c.req.param('key');
    const { fileName, tags } = c.req.valid('json');
    const kv = c.env.oh_file_url;

    try {
      const { value, metadata } = await kv.getWithMetadata(key);

      if (!metadata) {
        return fail(c, `File metadata not found for key: ${key}`, 404);
      }

      if (fileName !== undefined) metadata.fileName = fileName;
      if (tags !== undefined) metadata.tags = tags;

      await kv.put(key, value, { metadata });

      return ok(c, metadata);
    } catch (e: any) {
      console.error('Update metadata error:', e);
      return fail(c, `Failed to update metadata: ${e.message}`);
    }
  }
);
