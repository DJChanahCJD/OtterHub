import { fail, ok } from "../../utils/common";
import { CF, FileMetadata } from "../../utils/types";

// 更新文件元数据
// 支持更新 fileName、tags 等字段
export async function onRequestPatch(context: any) {
  const { request, params, env } = context;

  const url = new URL(request.url);

  try {
    const body = await request.json();
    const { fileName, tags } = body;

    // 获取现有元数据
    const value = await env[CF.KV_NAME].getWithMetadata(params.key);
    const metadata: FileMetadata = value.metadata;

    // 如果记录不存在
    if (!metadata)
      return fail(`File metadata not found for key: ${params.key}`, 404);

    // 更新 fileName
    if (fileName !== undefined) {
      metadata.fileName = fileName;
    }

    // 更新 tags
    if (tags !== undefined) {
      metadata.tags = tags;
    }

    // 保存更新后的元数据
    await env[CF.KV_NAME].put(params.key, "", { metadata });

    console.log("Updated metadata:", metadata);

    return ok({ metadata });
  } catch (error) {
    console.error("Error updating metadata:", error);
    return fail("Invalid request body", 400);
  }
}
