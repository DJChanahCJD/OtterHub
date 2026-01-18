import { verifyJWT } from "./utils/auth";

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/login/,
  /^\/api\/login/,
  /^\/api\/logout/,
  /^\/_next\//,
  /\.(ico|png|svg|jpg|jpeg|css|js|webmanifest|json|woff|woff2|ttf|eot)$/,
];

export async function onRequest(context: any) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const origin = request.headers.get("Origin");
  const allowOrigin = origin ?? "*";

  // 1. CORS Pre-flight
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

  // Helper to add CORS to any response
  const withCORS = (res: Response) => {
    const newRes = new Response(res.body, res);
    newRes.headers.set("Access-Control-Allow-Origin", allowOrigin);
    newRes.headers.set("Access-Control-Allow-Credentials", "true");
    return newRes;
  };

  // 2. Authentication
  const isPublic = PUBLIC_PATHS.some(p => p.test(path));
  
  if (!isPublic) {
    const cookie = request.headers.get("Cookie");
    const authCookie = cookie?.match(/auth=([^;]+)/)?.[1];
    
    let authenticated = false;
    if (authCookie) {
      try {
        await verifyJWT(authCookie, env.JWT_SECRET || env.PASSWORD);
        authenticated = true;
      } catch (e) {
        // Token invalid or expired
      }
    }

    if (!authenticated) {
      return withCORS(new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      }));
    }
  }

  const response = await next();
  return withCORS(response);
}