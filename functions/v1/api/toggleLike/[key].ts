import { failV1, okV1 } from "@utils/common";
import { CF } from "@utils/types";
import { FileMetadata } from "@shared/types";

// 修改文件名
export async function onRequestPost(context: any) {
  const { params, env } = context;

  try {
     // 获取元数据
    const value = await env[CF.KV_NAME].getWithMetadata(params.key);
    const metadata: FileMetadata = value.metadata;

    // 如果记录不存在
    if (!metadata)
      return failV1(`File metadata not found for key: ${params.key}`, 404);

    // 切换 liked 状态
    metadata.liked = !metadata.liked;
    await env[CF.KV_NAME].put(params.key, "", { metadata });

    console.log("Updated metadata:", metadata);
    return okV1({ liked: metadata.liked });
  } catch (e: any) {
    return failV1(`Failed to toggle like: ${e.message}`, 500);
  }
}
