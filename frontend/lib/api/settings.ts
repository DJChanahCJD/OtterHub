import { GeneralSettings, MusicStoreData, NetEaseStoreData, SyncKeyItem, WallpaperConfigs } from "@shared/types";

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

export const musicStoreApi =
  createSettingsApi<MusicStoreData>('music');

export const neteaseStoreApi =
  createSettingsApi<NetEaseStoreData>('netease');

export const wallpaperConfigsApi =
  createSettingsApi<WallpaperConfigs>('wallpaper');

export const syncKeyApi = {
  async check(): Promise<number> {
    const res = await unwrap<{ lastSyncTime: number }>(client.sync.check.$get());
    return res.lastSyncTime;
  },

  async list(): Promise<SyncKeyItem[]> {
    const res = await unwrap<{ keys: SyncKeyItem[] }>(client.sync.keys.$get());
    return res.keys;
  },

  async create(prefix?: string): Promise<string> {
    const res = await unwrap<{ syncKey: string }>(
      client.sync['create-key'].$post({
        json: { prefix },
      })
    );
    return res.syncKey;
  },

  async delete(key: string): Promise<void> {
    await unwrap<null>(client.sync.keys[':key'].$delete({ param: { key } }));
  },
};
