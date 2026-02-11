import { Hono } from 'hono';
import type { Env } from '../../types/hono';
import {
  getUserPlaylists,
  getPlaylistDetail,
  getQrKey,
  checkQrStatus,
  getMyInfo,
  getRecommendPlaylists,
} from '../../utils/music/netease-api';

export const neteaseRoutes = new Hono<{ Bindings: Env }>();

/**
 * 获取二维码登录所需的 key
 */
neteaseRoutes.get('/login/qr/key', async (c) => {
  try {
    const res = await getQrKey();
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 检查二维码登录状态
 */
neteaseRoutes.get('/login/qr/check', async (c) => {
  const key = c.req.query('key');
  if (!key) return c.json({ error: 'Key required' }, 400);

  try {
    const res = await checkQrStatus(key);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 获取我的用户信息
 */
neteaseRoutes.post('/my-info', async (c) => {
  const { cookie } = await c.req.json();
  try {
    const res = await getMyInfo(cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 获取用户歌单
 */
neteaseRoutes.post('/user-playlists', async (c) => {
  const { userId, cookie } = await c.req.json();
  try {
    const res = await getUserPlaylists(userId, cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 获取歌单详情
 */
neteaseRoutes.post('/playlist', async (c) => {
  const { playlistId, cookie } = await c.req.json();
  try {
    const res = await getPlaylistDetail(playlistId, cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

/**
 * 获取每日推荐歌单
 */
neteaseRoutes.post('/recommend', async (c) => {
  const { cookie } = await c.req.json();
  try {
    const res = await getRecommendPlaylists(cookie);
    return c.json(res);
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});
