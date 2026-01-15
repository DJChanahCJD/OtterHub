import { fail } from "./common";
import { FileTag } from "./types";

export const BASIC_REALM = "OtterHub";

/**
 * 是否需要认证（private 文件）
 */
export function isPrivate(tags?: readonly string[]): boolean {
  return Array.isArray(tags) && tags.includes(FileTag.Private);
}

/**
 * 解析 Basic Auth
 */
export function parseBasicAuth(
  header: string | null
): { user: string; pass: string } | null {
  if (!header?.startsWith("Basic ")) return null;

  try {
    const decoded = atob(header.slice(6));
    const idx = decoded.indexOf(":");
    if (idx < 0) return null;

    return {
      user: decoded.slice(0, idx),
      pass: decoded.slice(idx + 1),
    };
  } catch {
    return null;
  }
}

/**
 * private 文件认证检查
 * @returns 未通过时返回 Response，通过返回 null
 */
export function checkAuthOrFail(
  tags: readonly string[] | undefined,
  request: Request,
  env: any
): Response | null {
  // 公开文件
  if (!isPrivate(tags)) return null;

  // 未配置 BASIC，直接放行（本地/个人部署友好）
  if (!env.BASIC_USER || !env.BASIC_PASS) {
    return null;
  }

  const cred = parseBasicAuth(request.headers.get("Authorization"));

  if (
    !cred ||
    cred.user !== env.BASIC_USER ||
    cred.pass !== env.BASIC_PASS
  ) {
    return fail("Unauthorized", 401, {
      "WWW-Authenticate": `Basic realm="${BASIC_REALM}", charset="UTF-8"`,
      "Cache-Control": "no-store",
    });
  }

  console.log(`[Auth] Private file accessed by ${cred.user}`);
  return null;
}
