import { getFileIdFromKey, error } from "../utils/common";
import { DBAdapterFactory } from "../utils/db-adapter";
import { CF } from "../utils/types";

export async function onRequest({ env, params }: any) {
  const key = params.key;
  const db = DBAdapterFactory.getAdapter(env);

  const file = await db.get(key);
  if (file) return file;

  return getTgFile(env, key);
}

// Telegram Bot API 文件处理逻辑
// 原Telegraph API: 'https://telegra.ph/' + url.pathname + url.search;
async function getTgFile(env: any, key: string) {
  const fileId = getFileIdFromKey(key);
  const filePath = await getTgFilePath(env, fileId);

  if (!filePath) {
    return error(`File not found: ${key}`, 404);
  }

  const url = `https://api.telegram.org/file/bot${env.TG_Bot_Token}/${filePath}`;
  return fetch(url);
}

async function getTgFilePath(env: any, fileId: string): Promise<string | null> {
  // TODO: 考虑缓存url
  const url = `https://api.telegram.org/bot${env.TG_Bot_Token}/getFile?file_id=${fileId}`;
  const res = await fetch(url);

  if (!res.ok) return null;

  const data = await res.json();
  return data?.ok ? data.result.file_path : null;
}
