// functions/api/list.ts
import { CF } from "@utils/types";
import { ok, fail } from "@utils/common";
import { FileType } from "@shared/types";

const DEFAULT_LIMIT = 50; //  默认 list 返回数量
const MAX_LIMIT = 1000;   //  最大 list 返回数量

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
