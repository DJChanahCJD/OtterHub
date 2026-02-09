import { Hono } from 'hono';
import { FileMetadata } from '@shared/types';
import { authMiddleware } from '../../middleware/auth';
import { DBAdapterFactory } from '@utils/db-adapter';
import { deleteCache, deleteFileCache } from '@utils/cache';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

export const actionRoutes = new Hono<{ Bindings: Env }>();

// 点赞/取消点赞
actionRoutes.post(
  '/:key/toggle-like',
  authMiddleware,
  async (c) => {
    const key = c.req.param('key');
    const kv = c.env.oh_file_url;

    try {
      const { value, metadata } = await kv.getWithMetadata(key);

      if (!metadata) {
        return fail(c, `File metadata not found for key: ${key}`, 404);
      }

      metadata.liked = !metadata.liked;
      await kv.put(key, value, { metadata });

      return ok(c, { liked: metadata.liked });
    } catch (e: any) {
      console.error('Toggle like error:', e);
      return fail(c, `Failed to toggle like: ${e.message}`, 500);
    }
  }
);

// 删除文件 (硬删除)
actionRoutes.delete(
  '/:key',
  authMiddleware,
  async (c) => {
    const key = c.req.param('key');
    const env = c.env;

    try {
      const db = DBAdapterFactory.getAdapter(env);

      const { isDeleted } = await db.delete(key);
      if (!isDeleted) {
        return c.json({ success: false, message: 'Failed to delete file' }, 404);
      }

      const url = new URL(c.req.url);
      await deleteCache(c.req.raw);
      await deleteFileCache(url.origin, key);

      return ok(c, { key }, 'File permanently deleted');
    } catch (error: any) {
      console.error('Delete file error:', error);
      return fail(c, `Failed to delete file: ${error.message}`, 500);
    }
  }
);
