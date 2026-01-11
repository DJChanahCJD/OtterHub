import { fail, ok } from "../../utils/common";
import { DBAdapterFactory } from "../../utils/db-adapter";

const NOT_ALLOWED_DELETE = [
    'img:AgACAgUAAyEGAASJIjr1AAIDbmljUd7-V2sXHaws4e5zy5BvfIfkAAKmDmsbsDcYV1OLkqQ2W1brAQADAgADdwADOAQ.jpg',
    'img:AgACAgUAAyEGAASJIjr1AAIDc2ljpsurhichlRQgki7V0vt6dmUzAALRDGsbbQ0hVzFBJqUCVNicAQADAgADdwADOAQ.png',
    'img:AgACAgUAAyEGAASJIjr1AAIDcGljpqoxvmyJWtdP_0cYotse0mRYAALODGsbbQ0hVz4Mtg7qAAEFfgEAAwIAA3cAAzgE.jpg',
    'img:AgACAgUAAyEGAASJIjr1AAIDcWljpsoZjApKWa5EU5Oq-nDoNFi4AALPDGsbbQ0hV0vj_hpPkAwiAQADAgADdwADOAQ.png',
    'img:AgACAgUAAyEGAASJIjr1AAIDcmljpso8vtU6Y6VnhfMjPt0IozORAALQDGsbbQ0hV3XOAAEy5a7v8wEAAwIAA3cAAzgE.png',
    'img:AgACAgUAAyEGAASJIjr1AAIDdWljptKZuTAgWbhVep1QQUmy9D4NAALSDGsbbQ0hV5a7kHWWJcosAQADAgADdwADOAQ.png',
    'audio:CQACAgUAAyEGAASJIjr1AAIDdmljp-4bBvSpVyGTtiUfmVAc_HWiAAK_GgACbQ0hV1DeTL5gVXfeOAQ.mp3',
    'doc:BQACAgUAAyEGAASJIjr1AAIDfGljqp01a52t51I5SE2-BSl9aBRCAALGGgACbQ0hV7AibOUqyepXOAQ.pdf',
    'video:chunk_BbA3NYDrtHQ1OC1i.mp4'
]

// 只支持 POST 请求进行删除
export async function onRequestPost({ env, params, request }: any) {
  try {
    if (NOT_ALLOWED_DELETE.includes(params.key)) {
      return fail('You can not delete default file', 403);
    }

    const db = DBAdapterFactory.getAdapter(env);
    const isDeleted = await db.delete(params.key);
    if (!isDeleted) {
      return fail('Failed to delete file', 404);
    }

    // 删除缓存
    const cache = caches.default;
    const cacheKey = new Request(request.url, { method: 'GET' });
    await cache.delete(cacheKey);

    return ok(params.key, 'File deleted successfully');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return fail(`Failed to delete file: ${error.message}`, 500);
  }
}

// 处理其他 HTTP 方法（GET, HEAD 等），返回 405 Method Not Allowed
export async function onRequest({ env, params, request }: any) {
  return fail('Method not allowed. Use POST to delete files.', 405);
}