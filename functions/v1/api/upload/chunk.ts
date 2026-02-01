import { FileType, chunkPrefix, FileMetadata } from "@shared/types";
import { fail, ok } from "@utils/common";
import { DBAdapterFactory } from "@utils/db-adapter";
import { getUniqueFileId, buildKeyId, getFileExt } from "@utils/file";
import { CF, MAX_CHUNK_NUM, MAX_FILE_SIZE, TEMP_CHUNK_TTL } from "@utils/types";

// 分片上传流程：
// 1. 前端发起分片上传初始化请求，获取chunks对应的唯一key，然后前端自行分片上传
// 2. 后端接收分片后，逐个上传，并维护chunkInfo.uploadedIndices数组，当数组长度等于chunkInfo.total时即上传完成

// 初始化分片上传, 返回唯一文件key
export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const params = url.searchParams;
  const fileType = params.get("fileType") as FileType;
  const fileName = params.get("fileName").substring(0, 100);  //  不超过100个字符 
  const fileSize = parseInt(params.get("fileSize"), 10);
  const totalChunks = parseInt(params.get("totalChunks"), 10);

  if (fileSize > MAX_FILE_SIZE || totalChunks > MAX_CHUNK_NUM) {
    return fail("File size exceeds the limit", 400);
  }

  const fileId = getUniqueFileId();
  const key = buildKeyId(fileType, `${chunkPrefix}${fileId}`, getFileExt(fileName));

  const metadata: FileMetadata = {
    fileName,
    fileSize,
    uploadedAt: Date.now(), // 第一次 put 时设置
    liked: false,
    chunkInfo: {
      total: totalChunks,
      uploadedIndices: [],
    },
  };

  await env[CF.KV_NAME].put(key, "", { metadata, expirationTtl: TEMP_CHUNK_TTL });

  return ok(key);
}

// 上传分片
export async function onRequestPost(context: any): Promise<Response> {
  const { request, env, waitUntil } = context;

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  const key = formData.get("key");
  const chunkIndex = parseInt(formData.get("chunkIndex") as string, 10);
  const chunk = formData.get("chunkFile") as File;

  console.log(`Upload chunk ${chunkIndex} for key ${key}`);

  try {
    const db = DBAdapterFactory.getAdapter(env);
    const { chunkIndex: uploadedChunkIndex } = await db.uploadChunk(key, chunkIndex, chunk, waitUntil);
    return ok(uploadedChunkIndex);
  } catch (error: any) {
    console.error(`Upload chunk error: ${error.message}`);
    return fail(error.message, 400);
  }
}
