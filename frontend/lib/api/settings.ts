import { GeneralSettings, WallpaperConfigs } from "@shared/types";

import { client } from './client';
import { unwrap } from './config';

export function createSettingsApi<T>(key: string) {
  const api = (client.settings as any)[key];

  return {
    get(): Promise<T> {
      return unwrap<T>(api.$get());
    },

    update(data: T): Promise<T> {
      return unwrap<T>(
        api.$post({
          json: data,
        })
      );
    },
  };
}

export const generalSettingsApi =
  createSettingsApi<GeneralSettings>('general');

export const wallpaperConfigsApi =
  createSettingsApi<WallpaperConfigs>('wallpaper');
