export async function onRequest(context: any) {
  const { request, next } = context;

  // 预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  return next();

  // // 不重建 Response，只 clone headers
  // const headers = new Headers(response.headers);

  // headers.set("Access-Control-Allow-Origin", "*");
  // headers.set("Access-Control-Allow-Credentials", "true");

  // return new Response(response.body, {
  //   status: response.status,
  //   statusText: response.statusText,
  //   headers,
  // });
}
