import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { UnifiedWallpaper } from '@shared/types';
import { ok, fail } from '@utils/common';
import type { Env } from '../../types/hono';

export const picsumRoutes = new Hono<{ Bindings: Env }>();

picsumRoutes.get(
  '/picsum',
  zValidator(
    'query',
    z.object({
      page: z.string().optional().default('1'),
      limit: z.string().optional().default('20'),
      grayscale: z.string().optional().transform(v => v === 'true'),
    })
  ),
  async (c) => {
    const { page, limit, grayscale } = c.req.valid('query');
    try {
      const apiUrl = `https://picsum.photos/v2/list?page=${page}&limit=${limit}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`Picsum API error: ${response.status}`);
      }

      const data: any[] = await response.json();
      const unifiedData: UnifiedWallpaper[] = data.map((item: any) => {
        let previewUrl = `https://picsum.photos/id/${item.id}/800/600`;
        let rawUrl = item.download_url;

        if (grayscale) {
          previewUrl += '?grayscale';
          rawUrl += '?grayscale';
        }

        return {
          id: item.id,
          previewUrl,
          rawUrl,
          source: "picsum",
        };
      });

      return c.json(ok(unifiedData));
    } catch (error: any) {
      console.error("Picsum provider error:", error);
      return c.json(fail(error.message), 500);
    }
  }
);
