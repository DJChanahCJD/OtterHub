import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { FileMetadata } from '@shared/types';
import { authMiddleware } from '../../middleware/auth';
import type { Env } from '../../types/hono';

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
      const value = await kv.getWithMetadata(key);
      const metadata = value.metadata as FileMetadata;

      if (!metadata) {
        return c.json({ success: false, message: `File metadata not found for key: ${key}` }, 404);
      }

      if (fileName !== undefined) metadata.fileName = fileName;
      if (tags !== undefined) metadata.tags = tags;

      await kv.put(key, "", { metadata });

      return c.json({ success: true, data: { metadata } });
    } catch (e: any) {
      console.error('Update metadata error:', e);
      return c.json({ success: false, message: `Failed to update metadata: ${e.message}` }, 500);
    }
  }
);
