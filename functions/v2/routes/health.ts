import { Hono } from 'hono';
import type { Env } from '../types/hono';
import { ok } from '@utils/response';

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get('/', (c) => {
  const hasKV = !!c.env.oh_file_url;
  const hasR2 = !!c.env.oh_file_r2;
  const hasTg = !!c.env.TG_BOT_TOKEN && !!c.env.TG_CHAT_ID;
  
  return ok(c, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      kv: hasKV,
      r2: hasR2,
      tg: hasTg
    }
  });
});
