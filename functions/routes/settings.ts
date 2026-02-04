import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { CF } from 'types';
import { GeneralSettings, MusicStoreData } from '@shared/types';

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

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.use('*', authMiddleware);

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
