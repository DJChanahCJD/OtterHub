import { ok, fail } from "@utils/common";
import { CF } from "@utils/types";

/**
 * 获取或更新全局设置
 */

export async function onRequestGet({ env }: any) {
  try {
    const kv = env[CF.KV_NAME];
    const settingsStr = await kv.get(CF.SETTINGS_KEY);
    const settings = settingsStr ? JSON.parse(settingsStr) : {};
    return ok(settings);
  } catch (error: any) {
    return fail("获取设置失败: " + error.message);
  }
}

export async function onRequestPost({ request, env }: any) {
  try {
    const kv = env[CF.KV_NAME];
    const newSettings = await request.json();
    
    // 获取现有设置并合并
    const oldSettingsStr = await kv.get(CF.SETTINGS_KEY);
    const oldSettings = oldSettingsStr ? JSON.parse(oldSettingsStr) : {};
    
    const mergedSettings = {
      ...oldSettings,
      ...newSettings
    };
    
    await kv.put(CF.SETTINGS_KEY, JSON.stringify(mergedSettings));
    return ok(mergedSettings, "设置已更新");
  } catch (error: any) {
    return fail("保存设置失败: " + error.message);
  }
}
