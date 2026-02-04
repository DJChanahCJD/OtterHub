

export enum WallpaperSourceId {
  Pixabay = "pixabay",
  Wallhaven = "wallhaven",
  Bing = "bing",
  Picsum = "picsum",
  Unsplash = "unsplash",
}

export type UnifiedWallpaper = {
    id: string | number;
    previewUrl: string;
    rawUrl: string;
    source: WallpaperSourceId;
}

// 具体源配置类型
export type PixabayConfig = {
  apiKey: string;
  q?: string;
  category?: string; // nature, science, education, people, places, animals 等
  order?: "popular" | "latest";
  page?: number | string; //  指定或随机（1-20页）
};

export type WallhavenConfig = {
  apiKey: string;
  q?: string;
  categories?: string; // 100/101/111 (General/Anime/People)
  purity?: string; // 100/110/111 (SFW/Sketchy/NSFW)
  sorting?:
    | "date_added"
    | "relevance"
    | "random"
    | "views"
    | "favorites"
    | "toplist";
  topRange?: "1d" | "3d" | "1w" | "1M" | "3M" | "6M" | "1y";
  page?: number | string; // 指定或随机项(1-20)
};

export type BingConfig = {};

export type PicsumConfig = {
  page?: number;
  limit?: number;
  grayscale?: boolean;
};

export type UnsplashConfig = {
  apiKey: string;
  query?: string;
  orientation?: "landscape" | "portrait" | "squarish";
  content_filter?: "low" | "high";
};

export type WallpaperConfigValue = PixabayConfig | WallhavenConfig | BingConfig | PicsumConfig | UnsplashConfig | BingConfig;

export type WallpaperConfigMap = {
  pixabay: PixabayConfig;
  wallhaven: WallhavenConfig;
  bing: BingConfig;
  picsum: PicsumConfig;
  unsplash: UnsplashConfig;
};

export type WallpaperConfigs = Partial<{
  pixabay: PixabayConfig;
  wallhaven: WallhavenConfig;
  bing: BingConfig;
  picsum: PicsumConfig;
  unsplash: UnsplashConfig;
}>;

// 图片加载模式
export enum ImageLoadMode {
  Default = "default",      // 默认模式：正常显示所有内容
  DataSaver = "data-saver",   // 省流模式：不加载 >5MB 的图片
  NoImage = "no-image", // 无图模式：不加载任何图片
}