import { WallpaperSourceId } from "@/lib/types";
import { WallpaperProvider } from "../types";
import { PixabaySource } from "./pixabay";
import { WallhavenSource } from "./wallhaven";
import { BingSource } from "./bing";

export const WALLPAPER_SOURCES = {
  wallhaven: WallhavenSource,
  pixabay: PixabaySource,
  bing: BingSource,
} satisfies Record<WallpaperSourceId, WallpaperProvider<any>>;

export const getSourceById = (id: WallpaperSourceId) => WALLPAPER_SOURCES[id];

export const WALLPAPER_SOURCE_LIST = Object.values(WALLPAPER_SOURCES);
