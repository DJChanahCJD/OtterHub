// functions/v1/file/[key].ts
import { DBAdapterFactory } from "@utils/db-adapter";
import { failV1 } from "@utils/common";
import {
  getFromCache,
  putToCache,
} from "@utils/cache";
import { FileTag } from "@shared/types";
import { verifyJWT } from "@utils/auth";

export async function onRequestGet({ env, params, request }: any) {
  const db = DBAdapterFactory.getAdapter(env);
  const key = params.key;

  const item = await db.getFileMetadataWithValue?.(key);
  if (!item) return failV1("File not found", 404);

  // Check for private tag
  const isPrivate = item.metadata?.tags?.includes(FileTag.Private);

  if (isPrivate) {
    const cookie = request.headers.get("Cookie");
    const token = cookie?.match(/auth=([^;]+)/)?.[1];
    let authorized = false;

    if (token) {
      try {
        // Use JWT_SECRET if available, otherwise fallback to PASSWORD
        await verifyJWT(token, env.JWT_SECRET || env.PASSWORD);
        authorized = true;
      } catch (e) {
        // Token invalid
      }
    }

    if (!authorized) {
      return failV1("Unauthorized access to private file", 401);
    }
  }

  // Range 请求：明确不缓存
  if (request.headers.has("Range")) {
    return db.get(key, request);
  }

  // Only check cache for public files
  if (!isPrivate) {
    const cached = await getFromCache(request);
    if (cached) return cached;
  }

  const resp = await db.get(key, request);

  // Only cache public files
  if (!isPrivate) {
    await putToCache(request, resp, "file");
  } else {
    // Ensure private files are not cached by browser/proxies
    resp.headers.set("Cache-Control", "private, no-store, max-age=0");
  }

  return resp;
}
