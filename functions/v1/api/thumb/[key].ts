import { getTgFilePath, buildTgFileUrl } from "@utils/db-adapter/tg-tools";
import { fail, ok } from "@utils/common";

/**
 * 获取视频缩略图
 * @param key Telegram thumbnail file_id
 */
export async function onRequestGet({ env, params }: any) {
  const thumbFileId = params.key;

  if (!thumbFileId) {
    return fail("Missing thumbnail file_id", 400);
  }

  try {
    // 从 Telegram 获取缩略图路径
    const filePath = await getTgFilePath(thumbFileId, env.TG_BOT_TOKEN);

    if (!filePath) {
      return fail("Thumbnail not found", 404);
    }

    // 构建缩略图 URL
    const thumbUrl = buildTgFileUrl(env.TG_BOT_TOKEN, filePath);

    // 从 Telegram 获取缩略图
    const response = await fetch(thumbUrl);

    if (!response.ok) {
      return fail("Failed to fetch thumbnail", 502);
    }

    // 返回图片，设置缓存
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400", // 缓存 24 小时
      },
    });
  } catch (error: any) {
    console.error("[Thumbnail API] Error:", error);
    return fail(`Error fetching thumbnail: ${error.message}`, 500);
  }
}
