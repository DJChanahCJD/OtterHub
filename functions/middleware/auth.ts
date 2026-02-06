import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '@utils/auth';
import type { Env } from '../types/hono';
import { fail } from '@utils/response';

const PUBLIC_PATHS = [
  /^\/$/,
  /^\/auth\/login/,
  /^\/_next\//,
  /\.(ico|png|svg|jpg|jpeg|css|js|webmanifest|json|woff|woff2|ttf|eot)$/,
];

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const path = c.req.path;
  if (PUBLIC_PATHS.some(pattern => pattern.test(path))) {
    await next();
    return;
  }

  const env = c.env;

  // 1. 优先检查 API Token (Authorization Header)
  const authHeader = c.req.header('Authorization');
  if (authHeader && env.API_TOKEN) {
    const token = authHeader.replace(/Bearer\s+/i, '');
    if (token === env.API_TOKEN) {
      await next();
      return;
    }
  }

  // 2. 检查 Cookie
  const cookie = c.req.header('Cookie');
  const authCookie = cookie?.match(/(?:^|;\s*)auth=([^;]+)/)?.[1];

  if (!authCookie) {
    return fail(c, `Unauthorized, cookie: ${cookie}`, 401);
  }

  try {
    const secret = env.JWT_SECRET || env.PASSWORD || 'secret';
    await verifyJWT(authCookie, secret);
    await next();
  } catch (e) {
    return fail(c, 'Unauthorized', 401);
  }
});
