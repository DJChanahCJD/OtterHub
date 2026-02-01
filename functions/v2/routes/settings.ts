import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { CF } from '@utils/types';
import type { Env } from '../types/hono';

export const settingsRoutes = new Hono<{ Bindings: Env }>();

settingsRoutes.use('*', authMiddleware);

settingsRoutes.get('/', async (c) => {
  try {
    const kv = c.env.oh_file_url;
    const settingsStr = await kv.get(CF.SETTINGS_KEY);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    return c.json({ success: true, data: settings });
  } catch (error: any) {
    return c.json({ success: false, message: "获取设置失败: " + error.message }, 500);
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
      return c.json({ success: true, data: mergedSettings, message: "设置已更新" });
    } catch (error: any) {
      return c.json({ success: false, message: "保存设置失败: " + error.message }, 500);
    }
  }
);
