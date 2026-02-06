import { Hono } from 'hono';
import { UnifiedWallpaper, WallpaperSourceId } from '@shared/types';
import type { Env } from '../../types/hono';
import { fail, ok } from '@utils/response';

export const bingRoutes = new Hono<{ Bindings: Env }>();

const PEAPIX_COUNTRIES = ["au", "br", "ca", "cn", "de", "fr", "in", "it", "jp", "es", "gb", "us"];

async function safeFetch<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function mapPeapix(data: any[]): UnifiedWallpaper[] {
  return data.map(img => ({
    id: img.imageUrl.split("/").pop()?.split(".")[0] || img.imageUrl,
    previewUrl: img.thumbUrl,
    rawUrl: img.fullUrl,
    source: WallpaperSourceId.Bing
  }));
}

bingRoutes.get('/bing', async (c) => {
  try {
    const randomCountry = PEAPIX_COUNTRIES[Math.floor(Math.random() * PEAPIX_COUNTRIES.length)];

    const [bingRes, peapixBingRes, spotlightRes] = await Promise.all([
      safeFetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8`),
      safeFetch(`https://peapix.com/bing/feed?country=${randomCountry}`),
      safeFetch(`https://peapix.com/spotlight/feed`)
    ]);

    const wallpapers: UnifiedWallpaper[] = [];

    if (bingRes?.images) {
      wallpapers.push(
        ...bingRes.images.map((img: any) => ({
          id: img.hsh,
          previewUrl: `https://cn.bing.com${img.url}`,
          rawUrl: `https://cn.bing.com${img.urlbase}_UHD.jpg`,
          source: WallpaperSourceId.Bing
        }))
      );
    }

    if (Array.isArray(peapixBingRes)) {
      wallpapers.push(...mapPeapix(peapixBingRes));
    }

    if (Array.isArray(spotlightRes)) {
      wallpapers.push(...mapPeapix(spotlightRes));
    }

    if (wallpapers.length === 0) {
      return fail(c, "获取壁纸失败：所有数据源均不可用", 500);
    }

    const uniqueWallpapers = Array.from(
      new Map(wallpapers.map(w => [w.rawUrl, w])).values()
    );

    return ok(c, uniqueWallpapers);
  } catch (err) {
    console.error("Fetch bing wallpaper error:", err);
    return fail(c, "获取壁纸失败", 500);
  }
});
