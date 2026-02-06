import { Hono } from 'hono';
import type { Env } from '../types/hono';
import {
  getUserPlaylists,
  getPlaylistDetail,
  getQrKey,
  checkQrStatus,
  getMyInfo,
  getRecommendPlaylists,
} from '../utils/music/netease-api';
import { handleNeteaseRequest } from '@utils/music/netease-handler';

export const musicRoutes = new Hono<{ Bindings: Env }>();

const API_BASE = 'https://music-api.gdstudio.xyz/api.php';

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


musicRoutes.get('/netease/login/qr/key', async (c) => {
  try {
    const res = await getQrKey();
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.get('/netease/login/qr/check', async (c) => {
  const key = c.req.query('key');
  if (!key) return c.json({ error: 'Key required' }, 400);

  try {
    const res = await checkQrStatus(key);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.post('/netease/my-info', async (c) => {
  const { cookie } = await c.req.json();
  try {
    const res = await getMyInfo(cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.post('/netease/user-playlists', async (c) => {
  const { userId, cookie } = await c.req.json();
  try {
    const res = await getUserPlaylists(userId, cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.post('/netease/playlist', async (c) => {
  const { playlistId, cookie } = await c.req.json();
  try {
    const res = await getPlaylistDetail(playlistId, cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

musicRoutes.post('/netease/recommend', async (c) => {
  const { cookie } = await c.req.json();
  try {
    const res = await getRecommendPlaylists(cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
