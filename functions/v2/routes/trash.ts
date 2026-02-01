import { Hono } from 'hono';
import { okV1, failV1 } from '@utils/common';
import { DBAdapterFactory } from '@utils/db-adapter';
import { deleteCache, deleteFileCache } from '@utils/cache';
import type { Env } from '../types/hono';
import { authMiddleware } from '../middleware/auth';
import { API_VERSION } from '@utils/types';
import { fail, ok } from '@utils/response';

export const trashRoutes = new Hono<{ Bindings: Env }>();

// 所有回收站接口都需要认证
trashRoutes.use('*', authMiddleware);

// 获取回收站文件内容
trashRoutes.get('/:key', async (c) => {
  const trashKey = c.req.param('key');
  try {
    const db = DBAdapterFactory.getAdapter(c.env);
    return await db.get(trashKey, c.req.raw);
  } catch (error: any) {
    console.error('Fetch trash file error:', error);
    return fail(c, `Failed to fetch trash file: ${error.message}`, 500);
  }
});

// 移入回收站
trashRoutes.post('/:key/move', async (c) => {
  const key = c.req.param('key');
  try {
    const db = DBAdapterFactory.getAdapter(c.env);
    await db.moveToTrash(key);

    // 删除缓存
    const url = new URL(c.req.url);
    await deleteCache(c.req.raw);
    await deleteFileCache(url.origin, key, API_VERSION.V2);

    return ok(c, key, 'File moved to trash');
  } catch (error: any) {
    console.error('Move to trash error:', error);
    return fail(c, `Failed to move file to trash: ${error.message}`, 500);
  }
});

// 从回收站还原
trashRoutes.post('/:key/restore', async (c) => {
  const trashKey = c.req.param('key');
  try {
    const db = DBAdapterFactory.getAdapter(c.env);
    await db.restoreFromTrash(trashKey);

    return ok(c, trashKey, 'File restored successfully');
  } catch (error: any) {
    console.error('Restore file error:', error);
    return fail(c, `Failed to restore file: ${error.message}`, 500);
  }
});
