import { Hono } from 'hono';
import type { Env } from '../types/hono';
import { 
  loginCellphone, 
  loginEmail, 
  getUserPlaylists, 
  getPlaylistDetail, 
  getQrKey, 
  checkQrStatus, 
  getMyInfo,
  search,
  getSongUrl,
  getLyric,
  getSongDetail
} from '../utils/music/netease-api';

export const musicRoutes = new Hono<{ Bindings: Env }>();

const API_BASE = 'https://music-api.gdstudio.xyz/api.php';

musicRoutes.get('/', async (c) => {
  const query = c.req.query();
  
  // Backend Adapter: Intercept NetEase requests
  if (query.source === 'netease') {
    try {
      const type = query.types;
      // Use 'cookie' from query if available (passed by frontend)
      // or default to empty (guest mode)
      const cookie = query.cookie || ''; 

      if (type === 'search') {
        const name = query.name || '';
        const page = parseInt(query.pages || '1');
        const count = parseInt(query.count || '20');
        
        const res = await search(name, 1, page, count, cookie);
        
        // Map to Meting-like format expected by frontend
        if (res.data.result && res.data.result.songs) {
           const list = res.data.result.songs.map((s: any) => ({
              id: s.id,
              name: s.name,
              artist: s.artists.map((a: any) => a.name),
              album: s.album.name,
              pic: s.album.picUrl, // Direct URL
              source: 'netease',
              url_id: s.id,
              pic_id: s.id,
              lyric_id: s.id
           }));
           return c.json(list);
        }
        return c.json([]);
      }

      if (type === 'url') {
        const id = query.id || '';
        const br = parseInt(query.br || '320000');
        const res = await getSongUrl(id, 999000, cookie);
        
        if (res.data.data && res.data.data[0]) {
            return c.json({
                url: res.data.data[0].url,
                br: res.data.data[0].br,
                size: res.data.data[0].size
            });
        }
        return c.json({ url: '' });
      }

      if (type === 'pic') {
        const id = query.id || '';
        // Fix: frontend passes URL as ID for imported tracks
        if (id.startsWith('http')) {
            return c.json({ url: id });
        }
        
        const res = await getSongDetail(id, cookie);
        if (res && res.al) {
             return c.json({
                url: res.al.picUrl
             });
        }
        return c.json({ url: '' });
      }

      if (type === 'lyric') {
        const id = query.id || '';
        const res = await getLyric(id, cookie);
        return c.json({
            lyric: res.data.lrc?.lyric || '',
            tlyric: res.data.tlyric?.lyric || ''
        });
      }

    } catch (e: any) {
      console.error('Local NetEase Handler Error:', e);
      return c.json({ error: e.message }, 500);
    }
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

musicRoutes.post('/netease/login', async (c) => {
  const { type, account, password, countrycode } = await c.req.json();
  try {
    let res;
    if (type === 'email') {
      res = await loginEmail(account, password);
    } else {
      res = await loginCellphone(account, password, countrycode);
    }
    return c.json(res);
  } catch (e: any) {
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
