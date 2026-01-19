import { WallpaperProvider } from "../types";
import { PixabaySource } from "./pixabay";
import { WallhavenSource } from "./wallhaven";

export const WALLPAPER_SOURCES: WallpaperProvider[] = [
  WallhavenSource,
  PixabaySource,
];

export const getSourceById = (id: string) => WALLPAPER_SOURCES.find(s => s.id === id);
