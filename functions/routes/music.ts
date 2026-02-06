import { Hono } from 'hono';
import type { Env } from '../types/hono';
import { handleNeteaseRequest } from '@utils/music/netease-handler';
import { neteaseRoutes } from './music/netease';

export const musicRoutes = new Hono<{ Bindings: Env }>();

const API_BASE = 'https://music-api.gdstudio.xyz/api.php';

/**
 * 音乐主路由，支持网易云适配器拦截和上游代理
 */
musicRoutes.get('/', async (c) => {
  const query = c.req.query();

  // Backend Adapter: Intercept NetEase requests
  if (query.source === 'netease') {
    return handleNeteaseRequest(c, query);
  }

  // Fallback to Upstream Proxy
  const searchParams = new URLSearchParams(query);
  const targetUrl = `${API_BASE}?${searchParams.toString()}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!res.ok) {
      return c.json(
        { error: 'Upstream request failed', status: res.status },
        res.status as any
      );
    }

    const data = await res.json();
    return c.json(data);
  } catch (e: any) {
    console.error('Music proxy error:', e);
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.route('/netease', neteaseRoutes);
