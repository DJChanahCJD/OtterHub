import { DBAdapterFactory } from "../../utils/db-adapter";

export async function onRequest(context: any) {
  // Contents of context object
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;

  const dbAdapter = DBAdapterFactory.getAdapter(env);
  
  // 删除文件
  const isDeleted = await dbAdapter.delete(params.key);
  if (!isDeleted) {
    throw new Error('Failed to delete file');
  }
  
  return new Response(JSON.stringify(params.key));
}
