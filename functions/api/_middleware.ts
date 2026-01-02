// 解析Basic Authentication请求头
function parseBasicAuth(authHeader: string | null): { username: string; password: string } | null {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return null;
  }

  try {
    const credentials = atob(authHeader.slice(6));  // 去掉 "Basic " 前缀并做Base64 解码
    const separatorIndex = credentials.indexOf(":");
    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: credentials.slice(0, separatorIndex),
      password: credentials.slice(separatorIndex + 1)
    };
  } catch (error) {
    return null;
  }
}

// Basic Authentication主逻辑
async function basicAuthentication(request: Request, env: any): Promise<Response | null> {
  // 未设置环境变量时，认证功能自动禁用
  if (typeof env.BASIC_USER !== "string" || typeof env.BASIC_PASS !== "string") {
    return null;
  }

  const authHeader = request.headers.get("Authorization");
  const credentials = parseBasicAuth(authHeader);

  if (!credentials || credentials.username !== env.BASIC_USER || credentials.password !== env.BASIC_PASS) {
    // 认证失败，返回401状态码，浏览器自动弹出登录对话框
    return new Response("Unauthorized", {
      status: 401,
      headers: {
        "WWW-Authenticate": "Basic realm=\"OtterHub Admin\", charset=\"UTF-8\""
      }
    });
  }

  // 认证成功
  return null;
}

export async function onRequest(context: any) {
  const { request, env } = context;
  
  // 执行Basic Authentication
  const authResponse = await basicAuthentication(request, env);
  if (authResponse) {
    return authResponse;
  }
  
  // 认证通过或未启用认证，继续处理请求
  return context.next();
}
