import {
  WallpaperSourceId,
  PixabayConfig,
  WallhavenConfig,
  BingConfig,
  PicsumConfig,
  UnsplashConfig,
} from "@shared/types";

export type {
  PixabayConfig,
  WallhavenConfig,
  BingConfig,
  PicsumConfig,
  UnsplashConfig,
};
export const WP_API_KEY_PLACEHOLDER = "public"

export interface WallpaperProviderMeta {
  id: WallpaperSourceId;
  name: string;
  requiresApiKey?: boolean;
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
