import { DBAdapterFactory } from "../../utils/db-adapter";
import { success, error } from "../../utils/common";

export async function onRequest(context: any) {
  try {
    const { env, params } = context;
    
    const dbAdapter = DBAdapterFactory.getAdapter(env);
    
    // 删除文件
    const isDeleted = await dbAdapter.delete(params.key);
    if (!isDeleted) {
      return error('Failed to delete file', 404);
    }
    
    return success(params.key, 'File deleted successfully');
  } catch (error: any) {
    console.error('Delete file error:', error);
    return error(`Failed to delete file: ${error.message}`, 500);
  }
}
