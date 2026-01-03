import { fail } from "../utils/common";

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

// 解析Basic Authentication请求头
function parseBasicAuth(
  authHeader: string | null
): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  const credentials = atob(authHeader.slice(6)); // 去掉 "Basic " 前缀并做Base64 解码
  const separatorIndex = credentials.indexOf(":");
  if (separatorIndex === -1) {
    return null;
  }

  return {
    username: credentials.slice(0, separatorIndex),
    password: credentials.slice(separatorIndex + 1),
  };
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

  const credentials = parseBasicAuth(request.headers.get("Authorization"));

  if (
    !credentials ||
    credentials.username !== env.BASIC_USER ||
    credentials.password !== env.BASIC_PASS
  ) {
    // 认证失败，返回401状态码，浏览器自动弹出登录对话框
    return fail("Unauthorized", 401, {
      "WWW-Authenticate": 'Basic realm="OtterHub Admin", charset="UTF-8"',
    });
  }
  // 认证成功
  return null;
}

export const onRequest = [
  errorHandling,
  async (context: any) => {
    const { request, env } = context;
    // const auth = await basicAuthentication(request, env);
    // if (auth) return auth;
    return context.next();
  },
];

