// functions/api/list.ts
import { CF } from "../utils/types";
import { ok, fail } from "../utils/common";

// https://developers.cloudflare.com/kv/api/list-keys/
export async function onRequestGet(context: any) {
  try {
    const { request, env } = context;
    // 从URL查询参数中获取分页相关参数
    const url = new URL(request.url);
    const fileType = url.searchParams.get("fileType");
    const limit = url.searchParams.get("limit");
    const cursor = url.searchParams.get("cursor");
    
    const prefix = fileType ? `${fileType}:` : "";
    // 构建KV list参数
    //  TODO: 限制最大1000, 无法应付较大数据量时的搜索
    // TODO: 考虑用D1数据库？
    const options = {
      prefix,
      limit: limit === null ? "1000" : Math.min(Math.max(1, parseInt(limit)), 1000),
      cursor,
    };

    console.log("List options:", options);
    
    const value = await env[CF.KV_NAME].list(options);

    /*
    {
      keys: [
        { name: 'audio:1767359508183-etm647xv8.mp3', metadata: [Object] },
        { name: 'img:1767360224212-jdtcgze38.jpg', metadata: [Object] }
      ],
      list_complete: true,
      cursor: "next-cursor-value", // 分页游标
      cacheStatus: null
    }
    */
    console.log("List result:", value);

    // 返回完整的分页结果
    return ok({
      keys: value.keys,
      list_complete: value.list_complete,
      cursor: value.cursor,
    });
  } catch (error: any) {
    console.error("List files error:", error);
    return fail("Failed to fetch files", 500);
  }
}