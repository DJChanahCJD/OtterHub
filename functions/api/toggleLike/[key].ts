import { success } from "../../utils/common";
import { CF, FileMetadata } from "../../utils/types";

// 修改文件名
export async function onRequest(context: any) {
  const { params, env } = context;

  // 获取元数据
  const value = await env[CF.KV_NAME].getWithMetadata(params.key);
  const metadata: FileMetadata = value.metadata;

  // 如果记录不存在
  if (!metadata)
    return new Response(`File metadata not found for key: ${params.key}`, {
      status: 404,
    });

  // 切换 liked 状态
  metadata.liked = !metadata.liked;
  await env[CF.KV_NAME].put(params.key, "", { metadata });

  console.log("Updated metadata:", metadata);

  return success(metadata.liked);
}
