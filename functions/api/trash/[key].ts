
import { fail, isDev } from "../../utils/common";
import { CF, trashPrefix, FileType } from "../../utils/types";
import { getFileIdFromKey, getContentTypeByExt } from "../../utils/file";
import { getTgFile } from "../../utils/db-adapter/tg-tools";

export async function onRequestGet({ env, params, request }: any) {
  try {
    const rawKey = params.key;
    const trashKey = rawKey.startsWith(trashPrefix) ? rawKey : `${trashPrefix}${rawKey}`;
    const realKey = rawKey.startsWith(trashPrefix) ? rawKey.slice(trashPrefix.length) : rawKey;

    const kv = env[CF.KV_NAME];

    // 1. 检查 Trash KV 是否存在
    const { value, metadata } = await kv.getWithMetadata(trashKey);
    
    if (!metadata) {
       return fail('File not found in trash', 404);
    }

    // 2. 鉴权 (Global Middleware handles this)

    // 3. 根据环境获取文件内容
    const isDevEnv = isDev(env);
    
    // A. Telegram Storage (Production or configured)
    if (!isDevEnv) {
        const { fileId } = getFileIdFromKey(realKey);
        const botToken = env.TG_BOT_TOKEN;
        return await getTgFile(fileId, botToken);
    }
    
    // B. R2 Storage (Dev)
    // R2 中文件名为 realKey
    const bucket = env[CF.R2_BUCKET];
    const object = await bucket.get(realKey);

    if (!object) {
        return fail('File content not found in storage', 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    
    // 覆盖 Content-Type
    const ext = realKey.substring(realKey.lastIndexOf(".") + 1);
    headers.set("Content-Type", getContentTypeByExt(ext));
    
    return new Response(object.body, {
        headers,
    });

  } catch (error: any) {
    console.error('Fetch trash file error:', error);
    return fail(`Failed to fetch trash file: ${error.message}`, 500);
  }
}
