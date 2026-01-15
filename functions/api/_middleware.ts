import { fail } from "../utils/common";
import { parseBasicAuth, BASIC_REALM } from "../utils/auth";

async function errorHandling(context: any) {
  try {
    return await context.next();
  } catch (err: any) {
    console.error("Unhandled error:", err);

    return fail(
      err.message,
      500
    );
  }
}

// Basic Authentication主逻辑
async function basicAuthentication(
  request: Request,
  env: any
): Promise<Response | null> {
  // 未设置环境变量时，认证功能自动禁用
  if (!env.BASIC_USER || !env.BASIC_PASS) {
    return null;
  }

  const cred = parseBasicAuth(request.headers.get("Authorization"));

  if (
    !cred ||
    cred.user !== env.BASIC_USER ||
    cred.pass !== env.BASIC_PASS
  ) {
    // 认证失败，返回401状态码，浏览器自动弹出登录对话框
    return fail("Unauthorized", 401, {
      "WWW-Authenticate": `Basic realm="${BASIC_REALM}", charset="UTF-8"`,
    });
  }
  // 认证成功
  return null;
}

export const onRequest = [
  errorHandling,
  async (context: any) => {
    const { request, env } = context;
    const auth = await basicAuthentication(request, env);
    if (auth) return auth;
    return context.next();
  },
];

