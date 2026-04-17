import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { v4 as uuidv4 } from 'uuid';
import { fail, ok } from '@utils/response';
import { DBAdapterFactory } from '@utils/db-adapter';
import type { Env, KVNamespace } from '../types/hono';
import { getFileTypeByName } from '@utils/file';
import { MAX_CHUNK_SIZE, BundleFileInfo, MAX_FILES_IN_BUNDLE } from '@shared/types';
import { authMiddleware } from 'middleware/auth';
import { ZipWriter, BlobReader, configure } from '@zip.js/zip.js';

// Cloudflare Worker 兼容性配置：禁用 CompressionStream 避免运行时 bug
// 参考：https://github.com/gildas-lormeau/zip.js/discussions/514
configure({
  useCompressionStream: false,
});

const app = new Hono<{ Bindings: Env }>();

const shareKeyPrefix = 'share:';

// --- Types ---

interface SingleShareData {
  type: 'single';
  fileKey: string;
  oneTime?: boolean;
  createdAt: number;
  fileName: string;
  fileSize: number;
  expiresAt?: number;
  consumedAt?: number;
}

interface BundleShareData {
  type: 'bundle';
  fileKeys: string[];
  files: BundleFileInfo[];
  oneTime?: boolean;
  createdAt: number;
  expiresAt?: number;
  consumedAt?: number;
}

type ShareData = SingleShareData | BundleShareData;

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
 * 计算打包分享的总文件大小
 */
function calcBundleTotalSize(files: BundleFileInfo[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
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

  // 计算总大小用于 TTL
  const totalSize = shareData.type === 'single'
    ? shareData.fileSize
    : calcBundleTotalSize(shareData.files);
  const ttl = calcBurnTTL(totalSize);

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
  type: z.enum(['single', 'bundle']).default('single'),
  fileKey: z.string().optional(),       // single 模式
  fileKeys: z.array(z.string()).optional(), // bundle 模式
  expireIn: z.number().optional(), // Seconds from now, undefined means forever (or max KV limit)
  oneTime: z.boolean().optional(),
});

// 1. Create Share Link (Protected)
app.post(
  '/create',
  authMiddleware,
  zValidator('json', createShareSchema),
  async (c) => {
    const { type, fileKey, fileKeys, expireIn, oneTime } = c.req.valid('json');
    const kv = c.env.oh_file_url;
    const db = DBAdapterFactory.getAdapter(c.env);

    const shareId = uuidv4();
    const shareKey = `${shareKeyPrefix}${shareId}`;
    const now = Date.now();
    const expiresAt = expireIn && expireIn > 0 ? now + expireIn * 1000 : undefined;

    // 单文件分享
    if (type === 'single') {
      if (!fileKey) {
        return fail(c, 'fileKey is required for single share', 400);
      }

      const file = await db.getFileMetadataWithValue?.(fileKey);
      if (!file?.metadata) return fail(c, 'File not found', 404);

      const shareData: SingleShareData = {
        type: 'single',
        fileKey,
        oneTime,
        createdAt: now,
        fileName: file.metadata.fileName,
        fileSize: file.metadata.fileSize,
        expiresAt,
      };

      await kv.put(shareKey, JSON.stringify(shareData), {
        expirationTtl: expireIn && expireIn > 0 ? expireIn : undefined,
      });

      return ok(c, { token: shareId });
    }

    // 打包分享
    if (!fileKeys || fileKeys.length === 0) {
      return fail(c, 'fileKeys is required for bundle share', 400);
    }

    const files: BundleFileInfo[] = [];
    for (const key of fileKeys) {
      const file = await db.getFileMetadataWithValue?.(key);
      if (file?.metadata) {
        files.push({
          key,
          name: file.metadata.fileName,
          size: file.metadata.fileSize,
          mimeType: getFileTypeByName(file.metadata.fileName),
        });
      }
    }

    if (files.length === 0) {
      return fail(c, 'No valid files found', 404);
    }

    const shareData: BundleShareData = {
      type: 'bundle',
      fileKeys: files.map(f => f.key),
      files,
      oneTime,
      createdAt: now,
      expiresAt,
    };

    await kv.put(shareKey, JSON.stringify(shareData), {
      expirationTtl: expireIn && expireIn > 0 ? expireIn : undefined,
    });

    return ok(c, { token: shareId, fileCount: files.length });
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
        const token = key.name.replace(shareKeyPrefix, '');
        if (data.type === 'bundle') {
          shares.push({
            token,
            type: 'bundle',
            files: data.files,
            oneTime: data.oneTime,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
          });
        } else {
          shares.push({
            token,
            type: 'single',
            fileKey: data.fileKey,
            fileName: data.fileName,
            fileSize: data.fileSize,
            oneTime: data.oneTime,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
          });
        }
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

  // 打包分享
  if (shareData.type === 'bundle') {
    return ok(c, {
      type: 'bundle',
      files: shareData.files,
      oneTime: shareData.oneTime,
      createdAt: shareData.createdAt,
      expiresAt: shareData.expiresAt,
    });
  }

  // 单文件分享
  const db = DBAdapterFactory.getAdapter(c.env);
  const file = await db.getFileMetadataWithValue?.(shareData.fileKey);
  const fileType = getFileTypeByName(file?.metadata.fileName || '');

  if (!file) return fail(c, 'File not found', 404);

  return ok(c, {
    type: 'single',
    fileName: file.metadata.fileName,
    fileSize: file.metadata.fileSize,
    mimeType: fileType,
    oneTime: shareData.oneTime,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt
  });
});

// 5. Get Raw File (Public)
// 支持 ?file={fileKey} 参数用于打包分享下载单个文件
app.get('/:token/raw', async (c) => {
  const token = c.req.param('token');
  const fileKey = c.req.query('file'); // 打包分享时指定文件
  const kv = c.env.oh_file_url;
  const shareKey = `${shareKeyPrefix}${token}`;

  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, 'Link expired or invalid', 404);

  const db = DBAdapterFactory.getAdapter(c.env);

  // 打包分享
  if (shareData.type === 'bundle') {
    if (!fileKey) {
      return fail(c, 'file parameter is required for bundle share', 400);
    }

    // 验证文件是否在分享列表中
    const fileInfo = shareData.files.find(f => f.key === fileKey);
    if (!fileInfo) {
      return fail(c, 'File not in this share', 404);
    }

    const resp = await db.get(fileKey, c.req.raw);

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
  }

  // 单文件分享
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

// 6. Download All Files as ZIP (Public)
app.get('/:token/download-all', async (c) => {
  const token = c.req.param('token');
  const kv = c.env.oh_file_url;
  const shareKey = `${shareKeyPrefix}${token}`;

  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, 'Link expired or invalid', 404);

  // 只支持打包分享
  if (shareData.type !== 'bundle') {
    return fail(c, 'This endpoint only supports bundle share', 400);
  }

  // 文件数量限制检查
  if (shareData.files.length > MAX_FILES_IN_BUNDLE) {
    return fail(c, `Too many files (${shareData.files.length}). Maximum allowed: ${MAX_FILES_IN_BUNDLE}. Please download files individually.`, 413);
  }

  const db = DBAdapterFactory.getAdapter(c.env);

  // 创建流式 ZIP 压缩
  const { readable, writable } = new TransformStream();
  const zipWriter = new ZipWriter(writable);

  // 存储所有添加文件的 Promise，用于错误处理
  const addPromises: Promise<void>[] = [];

  // 逐个添加文件到 ZIP（流式处理，低内存占用）
  for (const fileInfo of shareData.files) {
    const addFilePromise = (async () => {
      try {
        const resp = await db.get(fileInfo.key, new Request(c.req.url));
        if (resp.ok) {
          const blob = await resp.blob();
          await zipWriter.add(fileInfo.name, new BlobReader(blob));
        }
      } catch (e) {
        console.error(`Failed to fetch file ${fileInfo.name}:`, e);
      }
    })();
    addPromises.push(addFilePromise);
  }

  // 等待所有文件添加完成，然后关闭 ZIP
  const closePromise = Promise.all(addPromises).then(() => zipWriter.close());

  // 处理可能的错误（不阻塞响应）
  closePromise.catch((err) => {
    console.error('ZIP creation error:', err);
  });

  // 阅后即焚：标记已消费（不等待完成）
  if (shareData.oneTime && !shareData.consumedAt) {
    c.executionCtx.waitUntil(
      burnShareLink(kv, shareKey, shareData)
    );
  }

  // 返回流式响应
  return new Response(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="share-${token.slice(0, 8)}.zip"`,
    },
  });
});

export const shareRoutes = app;
