export async function onRequest(context: any) {
  const { request, next } = context;

  const origin = request.headers.get("Origin");
  const allowOrigin = origin ?? "*";

  // 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const response = await next();

  // 克隆响应并添加 CORS 头
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("Access-Control-Allow-Origin", allowOrigin);
  newResponse.headers.set("Access-Control-Allow-Credentials", "true");

  return newResponse;
}