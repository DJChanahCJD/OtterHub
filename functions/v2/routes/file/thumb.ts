import { Hono } from 'hono';
import { getTgFilePath, buildTgFileUrl } from '@utils/db-adapter/tg-tools';
import type { Env } from '../../types/hono';

export const thumbRoutes = new Hono<{ Bindings: Env }>();

thumbRoutes.get('/:key/thumb', async (c) => {
  const thumbFileId = c.req.param('key');

  try {
    const filePath = await getTgFilePath(thumbFileId, c.env.TG_BOT_TOKEN);
    if (!filePath) {
      return c.json({ success: false, message: "Thumbnail not found" }, 404);
    }

    const thumbUrl = buildTgFileUrl(c.env.TG_BOT_TOKEN, filePath);
    const response = await fetch(thumbUrl);

    if (!response.ok) {
      return c.json({ success: false, message: "Failed to fetch thumbnail" }, 502);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error('Fetch thumbnail error:', error);
    return c.json({ success: false, message: error.message }, 500);
  }
});
