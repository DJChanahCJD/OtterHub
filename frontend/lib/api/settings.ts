import { client } from "./client";

/**
 * 获取云端同步设置
 */
export async function getSettings(): Promise<any> {
  const res = await client.settings.$get();

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}

/**
 * 获取云端音乐数据
 */
export async function getMusicStoreData(): Promise<any> {
  const res = await client.settings.music.$get();

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}

/**
 * 同步音乐数据到云端
 * @param musicData 音乐数据
 */
export async function syncMusicStoreData(musicData: any): Promise<any> {
  const res = await client.settings.music.$post({
    json: musicData,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}

/**
 * 更新云端同步设置
 * @param settings 部分或全部设置项
 */
export async function updateSettings(settings: any): Promise<any> {
  const res = await client.settings.$post({
    json: settings,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
}
