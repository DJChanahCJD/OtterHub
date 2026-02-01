import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { proxyGet } from '../../../utils/proxy';
import { fail } from '../../../utils/common';
import type { Env } from '../../types/hono';

export const wallpaperProxyRoutes = new Hono<{ Bindings: Env }>();

wallpaperProxyRoutes.get(
  '/proxy',
  zValidator(
    'query',
    z.object({
      url: z.string().url(),
    })
  ),
  async (c) => {
    const { url: targetUrl } = c.req.valid('query');
    try {
      const response = await proxyGet(targetUrl);
      if (response.ok) {
        const newHeaders = new Headers(response.headers);
        newHeaders.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
        return new Response(response.body, {
          status: response.status,
          headers: newHeaders,
        });
      }
      return response;
    } catch (e: any) {
      console.error("Wallpaper proxy error:", e);
      return c.json(fail(`Wallpaper proxy error: ${e.message}`), 500);
    }
  }
);
