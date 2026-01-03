import { CF, FileMetadata } from "../../utils/types";

// 修改文件名
export async function onRequest(context: any) {
    const { params, env } = context;

    // 获取元数据
    const value = await env[CF.KV_NAME].getWithMetadata(params.key);
    const metadata: FileMetadata = value.metadata;

    // 如果记录不存在
    if (!metadata) return new Response(`File metadata not found for key: ${params.key}`, { status: 404 });

    // 更新文件名
    metadata.fileName = params.name;
    await env[CF.KV_NAME].put(params.key, "", { metadata });

    console.log("Updated metadata:", metadata);

    return new Response(JSON.stringify({ success: true, fileName: metadata.fileName }), {
        headers: { 'Content-Type': 'application/json' },
    });
}