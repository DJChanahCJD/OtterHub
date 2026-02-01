import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { UnifiedWallpaper } from '@shared/types';
import { fail, ok } from '@utils/response';
import type { Env } from '../../types/hono';

export const pixabayRoutes = new Hono<{ Bindings: Env }>();

pixabayRoutes.get(
  '/pixabay',
  zValidator(
    'query',
    z.object({
      apiKey: z.string().optional(),
      q: z.string().optional().default(''),
      category: z.string().optional().default(''),
      order: z.enum(['popular', 'latest']).optional().default('popular'),
      page: z.string().optional(),
    })
  ),
  async (c) => {
    const query = c.req.valid('query');
    const apiKey = query.apiKey;

    if (!apiKey) {
      return fail(c, "Pixabay API Key is required", 400);
    }

    const page = query.page || Math.floor(Math.random() * 20 + 1).toString();

    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: query.q,
        category: query.category,
        order: query.order,
        page: page,
        per_page: "20",
      });

      const response = await fetch(`https://pixabay.com/api/?${params}`);
      if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);

      const data: any = await response.json();
      const unifiedData: UnifiedWallpaper[] = data.hits.map((item: any) => ({
        id: item.id.toString(),
        previewUrl: item.webformatURL,
        rawUrl: item.largeImageURL || item.imageURL,
        source: "pixabay",
      }));

      return ok(c, unifiedData);
    } catch (error: any) {
      console.error("Pixabay provider error:", error);
      return fail(c, error.message, 500);
    }
  }
);
