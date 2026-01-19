import { WallpaperSourceId } from "@/lib/types";

// https://pixabay.com/api/
export type PixabayConfig = {
  key: string;
  q?: string;
  category?: string; // nature, science, education, people, places, animals 等
  order?: "popular" | "latest";
  page?: number | string; //  指定或随机（1-20页）
};

// https://wallhaven.cc/help/api
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

export type BingConfig = {
  // Bing 每日壁纸目前不需要配置
};

export interface WallpaperProviderMeta {
  id: WallpaperSourceId;
  name: string;
}

export interface WallpaperProviderLogic<T> {
  defaultConfig: T;
  getApiKey(config: T): string;
  setApiKey(config: T, key: string): T;
  isNsfw(config: T): boolean;
}

export interface WallpaperProviderUI<T> {
  ConfigPanel: React.FC<{
    config: T;
    onChange: (c: T) => void;
  }>;
}

export type WallpaperProvider<T = any> = WallpaperProviderMeta &
  WallpaperProviderLogic<T> &
  WallpaperProviderUI<T>;
