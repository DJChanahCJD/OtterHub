import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { fail, ok } from '@utils/response';
import { DBAdapterFactory } from '@utils/db-adapter';
import type { Env, KVNamespace } from '../types/hono';
import { getFileTypeByName } from '@utils/file';
<<<<<<< HEAD
import { MAX_CHUNK_SIZE } from '@shared/types';
=======
import { MAX_CHUNK_SIZE } from 'types';
>>>>>>> 82d9b41c2fb72e68a5e1ac6cce44c606d3f22ea9
import { authMiddleware } from 'middleware/auth';

const app = new Hono<{ Bindings: Env }>();

const shareKeyPrefix = 'share:';

// --- Helpers ---

/**
 * 计算阅后即焚链接的保留时间 (TTL)
 * 考虑到大文件分段请求，给予一定的缓冲时间
 */
function calcBurnTTL(fileSize: number): number {
  if (fileSize <= MAX_CHUNK_SIZE) {
    return 0;
  }
  const MIN_TTL = 60; // Cloudflare 最小TTL: 60s
  const MAX_TTL = 300; // 最多保留 5 分钟

  // 基础 60s + 每 20MB (一个分片) 增加 3s
  const chunks = Math.ceil(fileSize / MAX_CHUNK_SIZE);
  const ttl = MIN_TTL + chunks * 3;

  return Math.min(Math.max(ttl, MIN_TTL), MAX_TTL);
}

/**
 * 标记阅后即焚链接已被消费
 */
async function burnShareLink(
  kv: KVNamespace,
  shareKey: string,
  shareData: ShareData
) {
  shareData.consumedAt = Date.now();
  const ttl = calcBurnTTL(shareData.fileSize);

  if (ttl <= 0) {
    await kv.delete(shareKey);
    return;
  }

  // 音视频文件等大文件需要 Range 支持或合并，设置短TTL
  await kv.put(shareKey, JSON.stringify(shareData), {
    expirationTtl: ttl,
  });
}

/**
 * 安全地从 KV 获取并解析 JSON 数据
 */
async function getKVData<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// --- Routes ---

// Schema for creating a share link
const createShareSchema = z.object({
  fileKey: z.string(),
  expireIn: z.number().optional(), // Seconds from now, undefined means forever (or max KV limit)
  oneTime: z.boolean().optional(),
});

interface ShareData {
  fileKey: string;
  oneTime?: boolean;
  createdAt: number;
  fileName: string;
  fileSize: number;
  expiresAt?: number;
  consumedAt?: number; // Timestamp of first access for one-time links
}

// 1. Create Share Link (Protected)
app.post(
  '/create',
  authMiddleware,
  zValidator('json', createShareSchema),
  async (c) => {
    const { fileKey, expireIn, oneTime } = c.req.valid('json');
    const kv = c.env.oh_file_url;
    
    // Verify file exists first
    const db = DBAdapterFactory.getAdapter(c.env);
    const meta = await db.getFileMetadataWithValue?.(fileKey);
    if (!meta) return fail(c, 'File not found', 404);

    const shareId = uuidv4();
    const shareKey = `${shareKeyPrefix}${shareId}`;
    
    const now = Date.now();
    const expiresAt = expireIn && expireIn > 0 ? now + expireIn * 1000 : undefined;

    const shareData: ShareData = {
      fileKey,
      oneTime,
      createdAt: now,
      fileName: meta.metadata.fileName,
      fileSize: meta.metadata.fileSize,
      expiresAt,
    };

    await kv.put(shareKey, JSON.stringify(shareData), {
      expirationTtl: expireIn && expireIn > 0 ? expireIn : undefined,
    });

    return ok(c, { token: shareId });
  }
);

// 2. List Shares (Protected)
app.get('/list', authMiddleware, async (c) => {
  const kv = c.env.oh_file_url;
  const list = await kv.list({ prefix: shareKeyPrefix });
  
  const shares: any[] = [];
  if (list && list.keys) {
    for (const key of list.keys) {
      const data = await getKVData<ShareData>(kv, key.name);
      if (data) {
        shares.push({
          token: key.name.replace(shareKeyPrefix, ''),
          ...data
        });
      }
    }
  }
  
  // Sort by createdAt desc
  shares.sort((a, b) => b.createdAt - a.createdAt);

  return ok(c, shares);
});

// 3. Revoke Share (Protected)
app.delete('/revoke/:token', authMiddleware, async (c) => {
  const shareToken = c.req.param('token');
  const kv = c.env.oh_file_url;
  await kv.delete(`${shareKeyPrefix}${shareToken}`);
  
  return ok(c, { success: true });
});

// 4. Get Share Metadata (Public)
app.get('/:token/meta', async (c) => {
  const token = c.req.param('token');
  const kv = c.env.oh_file_url;
  const shareKey = `${shareKeyPrefix}${token}`;
  
  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, 'Link expired or invalid', 404);
  
  const db = DBAdapterFactory.getAdapter(c.env);
  const file = await db.getFileMetadataWithValue?.(shareData.fileKey);
  const fileType = getFileTypeByName(file?.metadata.fileName || '');
  
  if (!file) return fail(c, 'File not found', 404);
  
  return ok(c, {
    fileName: file.metadata.fileName,
    fileSize: file.metadata.fileSize,
    mimeType: fileType,
    oneTime: shareData.oneTime,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt
  });
});

// 5. Get Raw File (Public)
app.get('/:token/raw', async (c) => {
  const token = c.req.param('token');
  const kv = c.env.oh_file_url;
  const shareKey = `${shareKeyPrefix}${token}`;
  
  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, 'Link expired or invalid', 404);
  
  const db = DBAdapterFactory.getAdapter(c.env);
  const resp = await db.get(shareData.fileKey, c.req.raw);
  
  // 阅后即焚：只在「第一次成功 GET」时触发
  if (
    resp.ok && 
    c.req.method === 'GET' && 
    shareData.oneTime && 
    !shareData.consumedAt
  ) {
    c.executionCtx.waitUntil(
      burnShareLink(kv, shareKey, shareData)
    );
  }
  
  return resp;
});

export const shareRoutes = app;
