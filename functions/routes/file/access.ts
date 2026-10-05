import { FileMetadata, FileTag } from "@shared/types";
import { verifyJWT } from "@utils/auth";
import { DBAdapterFactory } from "@utils/db-adapter";
import { failResponse } from "@utils/response";
import type { Env } from "../../types/hono";

type FileAccessResult = {
  db: ReturnType<typeof DBAdapterFactory.getAdapter>;
  item: {
    metadata: FileMetadata;
    value: string | null;
  };
  isPrivate: boolean;
};

function getAuthCookie(request: Request): string | null {
  const cookie = request.headers.get("Cookie");
  const match = cookie?.match(/(?:^|;\s*)auth=([^;]+)/);
  return match?.[1] ?? null;
}

export async function getAuthorizedFileAccess(
  env: Env,
  request: Request,
  key: string
): Promise<FileAccessResult | Response> {
  const db = DBAdapterFactory.getAdapter(env);
  const item = await db.getFileMetadataWithValue?.(key);

  if (!item?.metadata) {
    return failResponse("File not found", 404);
  }

  const isPrivate = item.metadata.tags?.includes(FileTag.Private) ?? false;
  if (!isPrivate) {
    return { db, item, isPrivate };
  }

  let authorized = false;

  const authHeader = request.headers.get("Authorization");
  if (authHeader && env.API_TOKEN) {
    const apiToken = authHeader.replace(/Bearer\s+/i, "");
    if (apiToken === env.API_TOKEN) {
      authorized = true;
    }
  }

  if (!authorized) {
    const token = getAuthCookie(request);
    // 未配置 JWT_SECRET 时不做 cookie 鉴权，禁止回退到密码作为签名密钥
    if (token && env.JWT_SECRET) {
      try {
        await verifyJWT(token, env.JWT_SECRET);
        authorized = true;
      } catch {
        // Ignore invalid token and return unauthorized below.
      }
    }
  }

  if (!authorized) {
    return failResponse("Unauthorized access to private file", 401);
  }

  return { db, item, isPrivate };
}
