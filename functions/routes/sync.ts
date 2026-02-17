import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../types/hono";
import { ok, fail } from "@utils/response";
import { authMiddleware } from "middleware/auth";
import { SYNC_KEY_PREFIX, SyncKeyMetadata } from "@shared/types";

/** ===============================
 *  Otter Music Sync (API-Key Model)
 *  一个 key = 一个同步空间
 *  =============================== */


export const syncRoutes = new Hono<{ Bindings: Env }>();

/* ---------------- 工具函数 ---------------- */

/** 拼接 KV key */
function getSyncKey(syncKey: string): string {
  return `${SYNC_KEY_PREFIX}${syncKey}`;
}

/** 严格解析 Bearer */
function getBearer(c: any): string | null {
  const auth = c.req.header("Authorization");
  if (!auth) return null;

  const match = auth.match(/^Bearer ([A-Za-z0-9_-]+)$/);
  return match?.[1] ?? null;
}

/** 易读字符集（排除 0O1Il 避免混淆） */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** 生成指定长度的随机码 */
function randomCode(length = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

/** 生成同步 key，支持可选前缀 */
function generateKey(prefix?: string): string {
  const code = randomCode(16);
  return prefix ? `${prefix}_${code}` : code;
}

/** prefix 校验 schema */
const prefixSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[a-z0-9_-]+$/i);

/* ===============================
 * GET /sync/check  检查同步状态
 * =============================== */
syncRoutes.get("/check", async (c) => {
  const syncKey = getBearer(c);
  if (!syncKey) return fail(c, "Invalid Authorization", 401);

  const kv = c.env.oh_file_url;
  const kvKey = getSyncKey(syncKey);

  const { metadata } = await kv.getWithMetadata<SyncKeyMetadata>(kvKey);

  if (metadata === null) {
    return fail(c, "Sync key not found", 404);
  }

  return ok(c, {
    lastSyncTime: metadata?.lastSyncTime ?? 0,
  });
});

/* ===============================
 * GET /sync  拉取数据
 * =============================== */
syncRoutes.get("/", async (c) => {
  const syncKey = getBearer(c);
  if (!syncKey) return fail(c, "Invalid Authorization", 401);

  const kv = c.env.oh_file_url;
  const kvKey = getSyncKey(syncKey);

  const { value, metadata } = await kv.getWithMetadata<SyncKeyMetadata>(kvKey);

  if (value === null) {
    return fail(c, "Sync key not found", 404);
  }

  let data: any = null;
  try {
    data = value ? JSON.parse(value) : null;
  } catch {
    // 防止历史损坏数据导致服务崩溃
    data = null;
  }

  return ok(c, {
    data,
    lastSyncTime: metadata?.lastSyncTime ?? 0,
  });
});

/* ===============================
 * POST /sync  推送数据
 * 乐观锁避免覆盖
 * =============================== */
syncRoutes.post(
  "/",
  zValidator(
    "json",
    z.object({
      data: z.any(),
      lastSyncTime: z.number().optional(),
    }),
  ),
  async (c) => {
    const syncKey = getBearer(c);
    if (!syncKey) return fail(c, "Invalid Authorization", 401);

    const kv = c.env.oh_file_url;
    const kvKey = getSyncKey(syncKey);

    const body = c.req.valid("json");

    const existing = await kv.getWithMetadata<SyncKeyMetadata>(kvKey);

    if (existing.value === null) {
      return fail(c, "Sync key not found", 404);
    }

    const serverTime = existing.metadata?.lastSyncTime ?? 0;
    const clientTime = body.lastSyncTime ?? 0;

    /** 乐观锁：客户端比服务器旧 → 拒绝 */
    if (clientTime < serverTime) {
      return fail(c, "Conflict: data outdated", 409);
    }

    const newTime = Date.now();

    await kv.put(kvKey, JSON.stringify(body.data), {
      metadata: { lastSyncTime: newTime } satisfies SyncKeyMetadata,
    });

    return ok(c, { lastSyncTime: newTime }, "Sync successful");
  },
);

/* ===============================
 * POST /create-key  管理员创建同步空间
 * =============================== */
syncRoutes.post(
  "/create-key",
  authMiddleware,
  zValidator(
    "json",
    z.object({
      prefix: prefixSchema.optional(),
    }),
  ),
  async (c) => {
    const { prefix } = c.req.valid("json");
    const kv = c.env.oh_file_url;

    for (let i = 0; i < 5; i++) {
      const syncKey = generateKey(prefix);
      const kvKey = getSyncKey(syncKey);

      const exists = await kv.get(kvKey);
      if (!exists) {
        await kv.put(kvKey, "", {
          metadata: { lastSyncTime: 0 },
        });
        return ok(c, { syncKey }, "Sync key created");
      }
    }

    return fail(c, "Failed to generate unique key", 500);
  },
);

/* ===============================
 * GET /sync/keys  列出所有 SyncKey
 * =============================== */
syncRoutes.get("/keys", authMiddleware, async (c) => {
  const kv = c.env.oh_file_url;
  const keys: Array<{ key: string; lastSyncTime: number }> = [];

  let cursor: string | undefined;
  do {
    const result = await kv.list({ prefix: SYNC_KEY_PREFIX, cursor });
    for (const key of result.keys) {
      const metadata = key.metadata as SyncKeyMetadata | undefined;
      keys.push({
        key: key.name.replace(SYNC_KEY_PREFIX, ""),
        lastSyncTime: metadata?.lastSyncTime ?? 0,
      });
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return ok(c, { keys });
});

/* ===============================
 * DELETE /sync/keys/:key  删除 SyncKey
 * =============================== */
syncRoutes.delete("/keys/:key", authMiddleware, async (c) => {
  const syncKey = c.req.param("key");
  if (!syncKey) {
    return fail(c, "Key is required", 400);
  }

  const kv = c.env.oh_file_url;
  const kvKey = getSyncKey(syncKey);

  const exists = await kv.get(kvKey);
  if (!exists && exists !== "") {
    return fail(c, "Sync key not found", 404);
  }

  await kv.delete(kvKey);
  return ok(c, null, "Sync key deleted");
});
