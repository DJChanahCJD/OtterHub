import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { UnifiedWallpaper } from '@shared/types';
import { ok, fail } from '@utils/common';
import { getWallpaperProxyUrl } from '@utils/proxy';
import type { Env } from '../../types/hono';

export const wallhavenRoutes = new Hono<{ Bindings: Env }>();

wallhavenRoutes.get(
  '/wallhaven',
  zValidator(
    'query',
    z.object({
      apiKey: z.string().optional(),
      q: z.string().optional().default(''),
      categories: z.string().optional().default('111'),
      purity: z.string().optional().default('100'),
      sorting: z.string().optional().default('random'),
      page: z.string().optional().default('1'),
      topRange: z.string().optional(),
    })
  ),
  async (c) => {
    const q = c.req.valid('query');
    const apiKey = q.apiKey;

    const params = new URLSearchParams({
      q: q.q,
      categories: q.categories,
      purity: q.purity,
      sorting: q.sorting,
      page: q.page,
    });

    if (q.topRange && q.sorting === "toplist") {
      params.set("topRange", q.topRange);
    }
    if (apiKey) params.set("apikey", apiKey);
    if (q.sorting === "random") {
      params.set("seed", Date.now().toString().slice(-6));
    }

    try {
      const response = await fetch(`https://wallhaven.cc/api/v1/search?${params}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 OtterHub/1.0",
        },
      });

      if (!response.ok) throw new Error(`Wallhaven error: ${response.status}`);

      const data: any = await response.json();
      const origin = new URL(c.req.url).origin;

      const unifiedData: UnifiedWallpaper[] = data.data.map((item: any) => ({
        id: item.id,
        previewUrl: getWallpaperProxyUrl(origin, item.thumbs.original || item.thumbs.large || item.thumbs.small),
        rawUrl: item.path,
        source: "wallhaven",
      }));

      return c.json(ok(unifiedData));
    } catch (error: any) {
      console.error("Wallhaven provider error:", error);
      return c.json(fail(error.message), 500);
    }
  }
);
