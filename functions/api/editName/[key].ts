import { fail, ok } from "../../utils/common";
import { CF, FileMetadata } from "../../utils/types";

// 修改文件名
// PUT：全量覆盖
// PATCH：部分更新
export async function onRequestPatch(context: any) {
  const { request, params, env } = context;

  const url = new URL(request.url);
  const newFileName = url.searchParams.get("fileName");
  if (!newFileName) return fail("New file name is required");

  // 获取元数据
  const value = await env[CF.KV_NAME].getWithMetadata(params.key);
  const metadata: FileMetadata = value.metadata;

  // 如果记录不存在
  if (!metadata)
    return fail(`File metadata not found for key: ${params.key}`, 404);

  // 更新文件名
  metadata.fileName = newFileName;
  await env[CF.KV_NAME].put(params.key, "", { metadata });

  console.log("Updated metadata:", metadata);

  return ok(`File name updated to ${newFileName}`);
}
