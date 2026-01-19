/**
 * 壁纸 API 配置
 */

import { WallpaperSourceId } from "../../../utils/types";

// https://pixabay.com/api/
export type PixabayConfig = {
  key: string;
  q?: string;
  category?: string; // nature, science, education, people, places, animals 等
  order?: "popular" | "latest";
  page?: number | string; //  指定或随机（1-20页）
};

// https://wallhaven.cc/help/api#search
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

export type PicsumConfig = {
  page?: number | string;
  limit?: number | string;
  blur?: number | string;
  grayscale?: boolean | string;
};

export type LoliconConfig = {
  r18?: number | string;
  num?: number | string;
  tag?: string | string[];
  size?: string | string[];
  proxy?: string;
  excludeAI?: boolean | string;
  aspectRatio?: string;
};

export type UnsplashConfig = {
  accessKey: string;
  query?: string;
  orientation?: "landscape" | "portrait" | "squarish";
  content_filter?: "low" | "high";
  page?: number | string;
};


/**
 * 统一的壁纸数据格式
 */
export type UnifiedWallpaper = {
  id: string | number;
  previewUrl: string; //  前端直接使用的预览图 URL  TODO: 创建proxy 接口单独做代理
  rawUrl: string; //  原图 URL
  source: WallpaperSourceId;
};
