export type PixabaySearchParams = {
    q?: string;
    lang?: string;
    category?: string;
    order?: 'popular' | 'latest';
    page?: number | string;
}

export type WallhavenSearchParams = {
    q?: string;
    categories?: string;
    purity?: string;
    sorting?: 'date_added' | 'relevance' | 'random' | 'views' | 'favorites' | 'toplist';
    topRange?: '1d' | '3d' | '1w' | '1M' | '3M' | '6M' | '1y';
    page?: number | string;
}

export type WallpaperSourceId = "pixabay" | "wallhaven" | "bing";

export type UnifiedWallpaper = {
    id: string | number;
    previewUrl: string;
    rawUrl: string;
    source: WallpaperSourceId;
}

// === 全局设置相关类型 ===

export interface WallpaperCloudConfig {
  apiKey: string;
}

export interface AppSettings {
  wallpaper?: Record<WallpaperSourceId, WallpaperCloudConfig>;
  // 待补充...
}