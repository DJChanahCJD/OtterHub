import { GeneralSettings, MusicStoreData } from "@shared/types";

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

export const musicSettingsApi =
  createSettingsApi<MusicStoreData>('music');

/**
 * wallpaper 没有强类型也可以这样
 */
export const wallpaperSettingsApi =
  createSettingsApi<Record<string, any>>('wallpaper');

// Wrappers for SyncTab compatibility
export const getMusicStoreData = () => musicSettingsApi.get();
export const syncMusicStoreData = (data: MusicStoreData) => musicSettingsApi.update(data);
