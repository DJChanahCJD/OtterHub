import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { fail, ok } from "@utils/response";
import { DBAdapterFactory } from "@utils/db-adapter";
import type { Env, KVNamespace } from "../types/hono";
import { getFileTypeByName } from "@utils/file";
import {
  BundleFileInfo,
  DEMO_FILE_TTL,
  MAX_FILES_IN_BUNDLE,
  ShareData,
  SingleShareData,
  BundleShareData,
  ShareListItem,
} from "@shared/types";
import { authMiddleware } from "middleware/auth";
import {
  createZipDownloadResponse,
  sanitizeArchiveName,
} from "@utils/zip-download";

const app = new Hono<{ Bindings: Env }>();

const shareKeyPrefix = "share:";

// --- Helpers ---

/**
 * 计算打包分享的总文件大小
 */
function calcBundleTotalSize(files: BundleFileInfo[]): number {
  return files.reduce((sum, f) => sum + f.size, 0);
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
  type: z.enum(["single", "bundle"]).default("single"),
  fileKey: z.string().optional(), // single 模式
  fileKeys: z.array(z.string()).optional(), // bundle 模式
  bundleName: z.string().optional(), // bundle 模式下用户自定义名称
  expireIn: z.number().optional(), // Seconds from now, undefined means forever (or max KV limit)
});

// 1. Create Share Link (Protected)
app.post(
  "/create",
  authMiddleware,
  zValidator("json", createShareSchema),
  async (c) => {
    const { type, fileKey, fileKeys, bundleName, expireIn } =
      c.req.valid("json");
    const kv = c.env.oh_file_url_demo;
    const db = DBAdapterFactory.getAdapter(c.env);

    const shareId = crypto.randomUUID();
    const shareKey = `${shareKeyPrefix}${shareId}`;
    const now = Date.now();
    const expiresAt = now + DEMO_FILE_TTL * 1000;

    // 单文件分享
    if (type === "single") {
      if (!fileKey) {
        return fail(c, "fileKey is required for single share", 400);
      }

      const file = await db.getFileMetadataWithValue?.(fileKey);
      if (!file?.metadata) return fail(c, "File not found", 404);

      const shareData: SingleShareData = {
        type: "single",
        fileKey,
        createdAt: now,
        fileName: file.metadata.fileName,
        fileSize: file.metadata.fileSize,
        expiresAt,
      };

      await kv.put(shareKey, JSON.stringify(shareData), {
        expirationTtl: DEMO_FILE_TTL,
      });

      return ok(c, { token: shareId });
    }

    // 打包分享
    if (!fileKeys || fileKeys.length === 0) {
      return fail(c, "fileKeys is required for bundle share", 400);
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
      return fail(c, "No valid files found", 404);
    }

    // 计算总大小（bundleName 由用户输入，未输入时为 undefined）
    const totalSize = calcBundleTotalSize(files);

    const shareData: BundleShareData = {
      type: "bundle",
      fileKeys: files.map((f) => f.key),
      files,
      bundleName,
      totalSize,
      createdAt: now,
      expiresAt,
    };

    await kv.put(shareKey, JSON.stringify(shareData), {
      expirationTtl: DEMO_FILE_TTL,
    });

    return ok(c, { token: shareId, fileCount: files.length });
  }
);

// 2. List Shares (Protected)
app.get("/list", authMiddleware, async (c) => {
  const kv = c.env.oh_file_url_demo;
  const list = await kv.list({ prefix: shareKeyPrefix });

  const shares: ShareListItem[] = [];
  if (list && list.keys) {
    for (const key of list.keys) {
      const data = await getKVData<ShareData>(kv, key.name);
      if (data) {
        const token = key.name.replace(shareKeyPrefix, "");
        if (data.type === "bundle") {
          shares.push({
            token,
            type: "bundle",
            files: data.files,
            bundleName: data.bundleName,
            totalSize: data.totalSize,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
          });
        } else {
          shares.push({
            token,
            type: "single",
            fileKey: data.fileKey,
            fileName: data.fileName,
            fileSize: data.fileSize,
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
app.delete("/revoke/:token", authMiddleware, async (c) => {
  const shareToken = c.req.param("token");
  const kv = c.env.oh_file_url_demo;
  await kv.delete(`${shareKeyPrefix}${shareToken}`);

  return ok(c, { success: true });
});

// 4. Get Share Metadata (Public)
app.get("/:token/meta", async (c) => {
  const token = c.req.param("token");
  const kv = c.env.oh_file_url_demo;
  const shareKey = `${shareKeyPrefix}${token}`;

  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, "Link expired or invalid", 404);

  // 打包分享
  if (shareData.type === "bundle") {
    return ok(c, {
      type: "bundle",
      files: shareData.files,
      bundleName: shareData.bundleName,
      totalSize: shareData.totalSize,
      createdAt: shareData.createdAt,
      expiresAt: shareData.expiresAt,
    });
  }

  // 单文件分享
  const db = DBAdapterFactory.getAdapter(c.env);
  const file = await db.getFileMetadataWithValue?.(shareData.fileKey);
  const fileType = getFileTypeByName(file?.metadata.fileName || "");

  if (!file) return fail(c, "File not found", 404);

  return ok(c, {
    type: "single",
    fileName: file.metadata.fileName,
    fileSize: file.metadata.fileSize,
    mimeType: fileType,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt,
  });
});

// 5. Get Raw File (Public)
// 支持 ?file={fileKey} 参数用于打包分享下载单个文件
app.get("/:token/raw", async (c) => {
  const token = c.req.param("token");
  const fileKey = c.req.query("file"); // 打包分享时指定文件
  const kv = c.env.oh_file_url_demo;
  const shareKey = `${shareKeyPrefix}${token}`;

  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, "Link expired or invalid", 404);

  const db = DBAdapterFactory.getAdapter(c.env);

  // 打包分享
  if (shareData.type === "bundle") {
    if (!fileKey) {
      return fail(c, "file parameter is required for bundle share", 400);
    }

    // 验证文件是否在分享列表中
    const fileInfo = shareData.files.find((f) => f.key === fileKey);
    if (!fileInfo) {
      return fail(c, "File not in this share", 404);
    }

    const resp = await db.get(fileKey, c.req.raw);

    return resp;
  }

  // 单文件分享
  const resp = await db.get(shareData.fileKey, c.req.raw);

  return resp;
});

// 6. Download All Files as ZIP (Public)
app.get("/:token/download-all", async (c) => {
  const token = c.req.param("token");
  const kv = c.env.oh_file_url_demo;
  const shareKey = `${shareKeyPrefix}${token}`;

  const shareData = await getKVData<ShareData>(kv, shareKey);
  if (!shareData) return fail(c, "Link expired or invalid", 404);

  // 只支持打包分享
  if (shareData.type !== "bundle") {
    return fail(c, "This endpoint only supports bundle share", 400);
  }

  // 文件数量限制检查
  if (shareData.files.length > MAX_FILES_IN_BUNDLE) {
    return fail(
      c,
      `Too many files (${shareData.files.length}). Maximum allowed: ${MAX_FILES_IN_BUNDLE}. Please download files individually.`,
      413
    );
  }

  const db = DBAdapterFactory.getAdapter(c.env);

  // 使用用户自定义名称或默认名称
  const zipName = shareData.bundleName || `share-${token.slice(0, 8)}`;
  return createZipDownloadResponse(
    shareData.files,
    db,
    c.req.url,
    sanitizeArchiveName(zipName)
  );
});

export const shareRoutes = app;
