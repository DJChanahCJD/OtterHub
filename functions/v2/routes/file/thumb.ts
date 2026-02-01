import { Hono } from 'hono';
import { getTgFilePath, buildTgFileUrl } from '@utils/db-adapter/tg-tools';
import type { Env } from '../../types/hono';
import { fail } from '@utils/response';

export const thumbRoutes = new Hono<{ Bindings: Env }>();

thumbRoutes.get('/:key/thumb', async (c) => {
  const thumbFileId = c.req.param('key');

  try {
    const filePath = await getTgFilePath(thumbFileId, c.env.TG_BOT_TOKEN);
    if (!filePath) {
      return fail(c, "Thumbnail not found", 404);
    }

    const thumbUrl = buildTgFileUrl(c.env.TG_BOT_TOKEN, filePath);
    const response = await fetch(thumbUrl);

    if (!response.ok) {
      return fail(c, "Failed to fetch thumbnail", 502);
    }

    c.header(
      'Content-Type',
      response.headers.get('Content-Type') || 'image/jpeg'
    );
    c.header('Cache-Control', 'public, max-age=86400');

    return c.body(response.body);
  } catch (error: any) {
    console.error('Fetch thumbnail error:', error);
    return fail(c, error.message);
  }
});

