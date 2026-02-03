import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { UnifiedWallpaper } from '@shared/types';
import type { Env } from '../../types/hono';
import { ok, fail } from '@utils/response';

export const unsplashRoutes = new Hono<{ Bindings: Env }>();

unsplashRoutes.get(
  '/unsplash',
  zValidator(
    'query',
    z.object({
      apiKey: z.string().optional(),
      q: z.string().optional(),
      query: z.string().optional(),
      page: z.string().optional().default('1'),
      per_page: z.string().optional().default('20'),
      orientation: z.enum(['landscape', 'portrait', 'squarish']).optional(),
      content_filter: z.enum(['low', 'high']).optional().default('low'),
    })
  ),
  async (c) => {
    const q = c.req.valid('query');
    const accessKey = q.apiKey;

    if (!accessKey) {
      return fail(c, "Unsplash Access Key is required", 400);
    }

    const searchTerm = q.q || q.query;
    const searchParams = new URLSearchParams({
      per_page: q.per_page,
      page: q.page,
    });

    let apiUrl = "https://api.unsplash.com/photos";
    if (searchTerm) {
      apiUrl = "https://api.unsplash.com/search/photos";
      searchParams.set("query", searchTerm);
      if (q.orientation) searchParams.set("orientation", q.orientation);
      searchParams.set("content_filter", q.content_filter);
    }

    try {
      const response = await fetch(`${apiUrl}?${searchParams}`, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
      });

      if (!response.ok) {
        const errorData: any = await response.json().catch(() => ({}));
        throw new Error(errorData.errors?.join(", ") || `Unsplash error: ${response.status}`);
      }

      const result: any = await response.json();
      const photos = searchTerm ? result.results : result;

      const unifiedData: UnifiedWallpaper[] = photos.map((photo: any) => ({
        id: photo.id,
        previewUrl: photo.urls.regular,
        rawUrl: `${photo.urls.regular}&q=85&fm=webp`,
        source: "unsplash",
      }));

      return ok(c, unifiedData);
    } catch (error: any) {
      console.error("Unsplash provider error:", error);
      return fail(c, error.message, 500);
    }
  }
);
