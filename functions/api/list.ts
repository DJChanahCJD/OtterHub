// functions/api/list.ts
import { CF, FileType } from "../utils/types";
import { ok, fail } from "../utils/common";

const DEFAULT_LIMIT = 20; // 默认分页大小
const MAX_LIMIT = 1000;   // 最大分页大小

export async function onRequestGet({ request, env }: any) {
  try {
    const url = new URL(request.url);

    const fileType = url.searchParams.get("fileType") as FileType | null;
    const cursor = url.searchParams.get("cursor") || undefined;

    const rawLimit = url.searchParams.get("limit");
    const limit = rawLimit ? Number(rawLimit) : DEFAULT_LIMIT;

    if (!Number.isInteger(limit) || limit < 1) {
      return fail("Invalid limit parameter", 400);
    }

    const options = {
      prefix: fileType ? `${fileType}:` : undefined,
      limit: Math.min(limit, MAX_LIMIT),
      cursor,
    };

    console.log("[KV:list]", options);

    const { keys, list_complete, cursor: nextCursor } =
      await env[CF.KV_NAME].list(options);

    return ok({
      keys,
      list_complete,
      cursor: nextCursor,
    });
  } catch (err) {
    console.error("[KV:list] error:", err);
    return fail("Failed to fetch files", 500);
  }
}
