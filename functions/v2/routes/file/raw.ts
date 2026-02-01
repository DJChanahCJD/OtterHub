import { Hono } from 'hono';
import { DBAdapterFactory } from '@utils/db-adapter';
import { getFromCache, putToCache } from '@utils/cache';
import type { Env } from '../../types/hono';

export const rawRoutes = new Hono<{ Bindings: Env }>();

rawRoutes.get('/:key', async (c) => {
  const key = c.req.param('key');
  const db = DBAdapterFactory.getAdapter(c.env);

  try {
    const item = await db.getFileMetadataWithValue?.(key);
    if (!item) return c.json({ success: false, message: "File not found" }, 404);

    // Range 请求：明确不缓存
    if (c.req.header('Range')) {
      return await db.get(key, c.req.raw);
    }

    const cached = await getFromCache(c.req.raw);
    if (cached) return cached;

    const resp = await db.get(key, c.req.raw);
    await putToCache(c.req.raw, resp.clone(), "file");

    return resp;
  } catch (error: any) {
    console.error('Fetch raw file error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});
