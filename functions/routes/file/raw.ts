import { Hono } from 'hono';
import { DBAdapterFactory } from '@utils/db-adapter';
import { getFromCache, putToCache } from '@utils/cache';
import type { Env } from '../../types/hono';
import { fail } from '@utils/response';
import { FileTag } from "@shared/types";
import { verifyJWT } from "@utils/auth";
import { getCookie } from 'hono/cookie';

export const rawRoutes = new Hono<{ Bindings: Env }>();

rawRoutes.get('/:key', async (c) => {
  const key = c.req.param('key');
  const db = DBAdapterFactory.getAdapter(c.env);

  try {
    const item = await db.getFileMetadataWithValue?.(key);
    if (!item) return fail(c, "File not found", 404);

    // Check for private tag
    const isPrivate = item.metadata?.tags?.includes(FileTag.Private);

    if (isPrivate) {
      const token = getCookie(c, 'auth');
      let authorized = false;

      if (token) {
        try {
          // Use JWT_SECRET if available, otherwise fallback to PASSWORD
          await verifyJWT(token, c.env.JWT_SECRET || c.env.PASSWORD);
          authorized = true;
        } catch (e) {
          // Token invalid
        }
      }

      if (!authorized) {
        return fail(c, "Unauthorized access to private file", 401);
      }
    }

    // Range 请求：明确不缓存
    if (c.req.header('Range')) {
      return await db.get(key, c.req.raw);
    }

    // Only check cache for public files
    if (!isPrivate) {
      const cached = await getFromCache(c.req.raw);
      if (cached) return cached;
    }

    const resp = await db.get(key, c.req.raw);

    // Only cache public files
    if (!isPrivate) {
      await putToCache(c.req.raw, resp.clone(), "file");
    } else {
      // Ensure private files are not cached by browser/proxies
      resp.headers.set("Cache-Control", "private, no-store, max-age=0");
    }

    return resp;
  } catch (error: any) {
    console.error('Fetch raw file error:', error);
    return fail(c, error.message);
  }
});
