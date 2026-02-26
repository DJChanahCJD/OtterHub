import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { CF } from 'types';
<<<<<<< HEAD
import { GeneralSettings, MusicStoreData, NetEaseStoreData } from '@shared/types';

import { ok, fail } from '@utils/response';
import { kvGetJSON } from '@utils/kv';
import { Env } from 'types/hono';

function createSettingsRoutes<T>(
  app: Hono<{ Bindings: Env }>,
  path: string,
  key: string,
  options?: {
    getMessage?: string;
    postMessage?: string;
  }
) {
  const getMsg = options?.getMessage ?? "获取配置失败";
  const postMsg = options?.postMessage ?? "配置已更新";

  app.get(path, async c => {
    try {
      const kv = c.env.oh_file_url;
      const data = await kvGetJSON<T>(kv, key, {} as T);
      return ok(c, data);
    } catch (e: any) {
      return fail(c, `${getMsg}: ${e.message}`, 500);
    }
  });

  app.post(path, async c => {
    try {
      const kv = c.env.oh_file_url;
      const body = await c.req.json<T>();
      await kv.put(key, JSON.stringify(body));
      return ok(c, body, postMsg);
    } catch (e: any) {
      return fail(c, `${postMsg}失败: ${e.message}`, 500);
    }
  });
}
=======
import type { Env } from '../types/hono';

import { ok, fail } from '@utils/response';
>>>>>>> 82d9b41c2fb72e68a5e1ac6cce44c606d3f22ea9

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.use('*', authMiddleware);

<<<<<<< HEAD
/* ========= Settings ========= */

createSettingsRoutes<GeneralSettings>(
  settingsRoutes,
  '/general',
  CF.SETTINGS_KEY,
  {
    getMessage: '获取常规设置失败',
    postMessage: '常规设置已更新',
  }
);

createSettingsRoutes(
  settingsRoutes,
  '/wallpaper',
  CF.WALLPAPER_CONFIG_KEY,
  {
    getMessage: '获取壁纸配置失败',
    postMessage: '壁纸配置已更新',
  }
);

createSettingsRoutes<MusicStoreData>(
  settingsRoutes,
  '/music',
  CF.MUSIC_STORE_KEY,
  {
    getMessage: '获取音乐数据失败',
    postMessage: '音乐数据已同步',
  }
);

createSettingsRoutes<NetEaseStoreData>(
  settingsRoutes,
  '/netease',
  CF.NETEASE_STORE_KEY,
  {
    getMessage: '获取网易云账号失败',
    postMessage: '网易云账号已同步',
=======
settingsRoutes.get('/', async (c) => {
  try {
    const kv = c.env.oh_file_url;
    const settingsStr = await kv.get(CF.SETTINGS_KEY);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    return ok(c, settings);
  } catch (error: any) {
    return fail(c, "获取设置失败: " + error.message, 500);
  }
});

settingsRoutes.post(
  '/',
  async (c) => {
    try {
      const kv = c.env.oh_file_url;
      const newSettings = await c.req.json();
      
      const oldSettingsStr = await kv.get(CF.SETTINGS_KEY);
      const oldSettings = oldSettingsStr ? JSON.parse(oldSettingsStr) : {};
      
      const mergedSettings = {
        ...oldSettings,
        ...newSettings
      };
      
      await kv.put(CF.SETTINGS_KEY, JSON.stringify(mergedSettings));
      return ok(c, mergedSettings, "设置已更新");
    } catch (error: any) {
      return fail(c, "保存设置失败: " + error.message, 500);
    }
>>>>>>> 82d9b41c2fb72e68a5e1ac6cce44c606d3f22ea9
  }
);
