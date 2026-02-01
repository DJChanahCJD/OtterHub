import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { signJWT } from '../../utils/auth';
import type { Env } from '../types/hono';

export const authRoutes = new Hono<{ Bindings: Env }>();

authRoutes.post(
  '/login',
  zValidator(
    'json',
    z.object({
      password: z.string(),
    })
  ),
  async (c) => {
    const { password } = c.req.valid('json');
    const env = c.env;

    if (!password || password !== env.PASSWORD) {
      return c.json({ success: false, message: 'Unauthorized' }, 401);
    }

    const secret = env.JWT_SECRET || env.PASSWORD || 'secret';
    const token = await signJWT(secret);

    // Set Cookie
    const cookie = [
      `auth=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=86400",
      "Secure"
    ].join("; ");

    c.header('Set-Cookie', cookie);

    return c.json({ 
        success: true, 
        message: 'Login successful',
        data: { token }
    });
  }
);

authRoutes.post('/logout', (c) => {
  const cookie = [
    "auth=",
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Secure"
  ].join("; ");
  
  c.header('Set-Cookie', cookie);
  return c.json({ success: true, message: 'Logout successful' });
});
