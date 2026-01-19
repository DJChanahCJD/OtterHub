import { WallpaperSourceId } from "@/lib/types";
import { WallpaperProvider } from "../types";
import { PixabaySource } from "./pixabay";
import { WallhavenSource } from "./wallhaven";

export const WALLPAPER_SOURCES = {
  pixabay: PixabaySource,
  wallhaven: WallhavenSource,
} satisfies Record<WallpaperSourceId, WallpaperProvider<any>>;

export const getSourceById = (id: WallpaperSourceId) => WALLPAPER_SOURCES[id];

export const WALLPAPER_SOURCE_LIST = Object.values(WALLPAPER_SOURCES);
