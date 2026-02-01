import { ok, fail } from "../../../utils/common";
import { UnifiedWallpaper } from "@shared/types";

const PEAPIX_COUNTRIES = ["au", "br", "ca", "cn", "de", "fr", "in", "it", "jp", "es", "gb", "us"];

/**
 * 安全 fetch：失败时返回 null
 */
function safeFetch<T = any>(url: string): Promise<T | null> {
  return fetch(url)
    .then(res => res.ok ? res.json() : null)
    .catch(() => null);
}

/**
 * Peapix / Spotlight 通用映射
 */
function mapPeapix(data: any[]): UnifiedWallpaper[] {
  return data.map(img => ({
    id: img.imageUrl.split("/").pop()?.split(".")[0] || img.imageUrl,
    previewUrl: img.thumbUrl,
    rawUrl: img.fullUrl,
    source: "bing"
  }));
}

export async function onRequestGet(context: any) {
  try {
    const randomCountry =
      PEAPIX_COUNTRIES[Math.floor(Math.random() * PEAPIX_COUNTRIES.length)];

    const [bingRes, peapixBingRes, spotlightRes] = await Promise.all([
      safeFetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8`),
      safeFetch(`https://peapix.com/bing/feed?country=${randomCountry}`),
      safeFetch(`https://peapix.com/spotlight/feed`)
    ]);

    const wallpapers: UnifiedWallpaper[] = [];

    // 官方 Bing
    if (bingRes?.images) {
      wallpapers.push(
        ...bingRes.images.map((img: any) => ({
          id: img.hsh,
          previewUrl: `https://cn.bing.com${img.url}`,
          rawUrl: `https://cn.bing.com${img.urlbase}_UHD.jpg`,
          source: "bing"
        }))
      );
    }

    // Peapix Bing
    if (Array.isArray(peapixBingRes)) {
      wallpapers.push(...mapPeapix(peapixBingRes));
    }

    // Peapix Spotlight
    if (Array.isArray(spotlightRes)) {
      wallpapers.push(...mapPeapix(spotlightRes));
    }

    if (wallpapers.length === 0) {
      return fail("获取壁纸失败：所有数据源均不可用");
    }

    // 根据 rawUrl 去重
    const uniqueWallpapers = Array.from(
      new Map(wallpapers.map(w => [w.rawUrl, w])).values()
    );

    return ok(uniqueWallpapers);
  } catch (err) {
    console.error("Fetch wallpaper error:", err);
    return fail("获取壁纸失败");
  }
}
