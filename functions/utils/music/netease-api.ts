import { weapi, eapi } from './netease-crypto';

// 参考项目：https://github.com/listen1

const BASE_URL = 'https://music.163.com';
const EAPI_BASE_URL = 'https://interface3.music.163.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cleanCookie(cookieStr: string | null): string {
    if (!cookieStr) return '';
    
    // Split by comma or semicolon to handle multiple cookies and merged headers
    const parts = cookieStr.split(/[,;]\s*/);
    const cookieMap = new Map<string, string>();
    const ignoredKeys = new Set([
        'expires', 'max-age', 'domain', 'path', 'httponly', 'secure', 'samesite', 'priority'
    ]);

    for (const part of parts) {
        const match = part.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (key && !ignoredKeys.has(key.toLowerCase())) {
                cookieMap.set(key, value);
            }
        }
    }
    
    return Array.from(cookieMap.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function request(url: string, data: any, cookie: string = '') {
  const encData = weapi(data);
  const params = new URLSearchParams(encData as any).toString();

  // Prepare cookie
  const baseCookies = 'os=pc; appver=2.9.7; mode=31;';
  let finalCookie = cookie.trim();
  
  if (finalCookie && !finalCookie.includes('=')) {
      finalCookie = `MUSIC_U=${finalCookie}`;
  } else {
      finalCookie = cleanCookie(finalCookie);
  }
  
  finalCookie = `${baseCookies} ${finalCookie}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': USER_AGENT,
    'Referer': BASE_URL,
    'Origin': BASE_URL,
    'Cookie': finalCookie
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: params,
  });

  if (!response.ok) {
    throw new Error(`NetEase API Error: ${response.status} ${response.statusText}`);
  }
  
  // Extract Set-Cookie
  const setCookie = response.headers.get('set-cookie');
  const cleanedCookie = cleanCookie(setCookie);
  
  const json = await response.json();
  return { data: json, cookie: cleanedCookie };
}

async function requestEapi(url: string, path: string, data: any, cookie: string = '') {
    const encData = eapi(path, data);
    const params = new URLSearchParams(encData as any).toString();

    // Prepare cookie - eapi needs specific cookies sometimes? 
    // 1Listen sets os=pc in cookie for eapi too.
    const baseCookies = 'os=pc; appver=2.9.7; mode=31;';
    let finalCookie = cookie.trim();
    
    if (finalCookie && !finalCookie.includes('=')) {
        finalCookie = `MUSIC_U=${finalCookie}`;
    } else {
        finalCookie = cleanCookie(finalCookie);
    }
    
    finalCookie = `${baseCookies} ${finalCookie}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        'Referer': BASE_URL,
        'Origin': BASE_URL,
        'Cookie': finalCookie
    };

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: params,
    });

    if (!response.ok) {
        throw new Error(`NetEase EAPI Error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return { data: json };
}

export async function getQrKey() {
    const url = `${BASE_URL}/weapi/login/qrcode/unikey`;
    const data = { type: 1 };
    return request(url, data);
}

export async function checkQrStatus(key: string) {
    const url = `${BASE_URL}/weapi/login/qrcode/client/login`;
    const data = { key, type: 1 };
    return request(url, data);
}
export async function getMyInfo(cookie: string) {
    const url = `${BASE_URL}/api/nuser/account/get`;
    const data = {};
    return request(url, data, cookie);
}

export async function getUserPlaylists(userId: string, cookie: string) {
    const url = `${BASE_URL}/api/user/playlist`;
    
    const params = new URLSearchParams({
        uid: userId,
        limit: '1000',
        offset: '0',
        includeVideo: 'true'
    });
    
    // Prepare cookie
    const baseCookies = 'os=pc; appver=2.9.7; mode=31;';
    let finalCookie = cookie.trim();
    if (!finalCookie.includes('=')) {
        finalCookie = `MUSIC_U=${finalCookie}`;
    }
    finalCookie = `${baseCookies} ${finalCookie}`;

    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        'Referer': BASE_URL,
        'Origin': BASE_URL,
        'Cookie': finalCookie
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: params.toString()
    });
    
    return response.json();
}

export async function getPlaylistDetail(playlistId: string, cookie: string) {
    const url = `${BASE_URL}/weapi/v3/playlist/detail`;
    const data = {
        id: playlistId,
        offset: 0,
        total: true,
        limit: 1000,
        n: 1000,
        csrf_token: ''
    };
    
    const res = await request(url, data, cookie);
    const playlist = res.data.playlist;
    
    const trackIds = playlist.trackIds.map((t: any) => t.id);
    
    // Batch fetch details
    const tracks = await getTracksDetail(trackIds, cookie);
    
    return {
        ...playlist,
        tracks
    };
}

async function getTracksDetail(trackIds: number[], cookie: string) {
    const url = `${BASE_URL}/weapi/v3/song/detail`;
    const BATCH_SIZE = 500;
    const result = [];
    
    for (let i = 0; i < trackIds.length; i += BATCH_SIZE) {
        const batch = trackIds.slice(i, i + BATCH_SIZE);
        const c = '[' + batch.map(id => `{"id":${id}}`).join(',') + ']';
        const ids = '[' + batch.join(',') + ']';
        
        const data = { c, ids };
        const res = await request(url, data, cookie);
        if (res.data.songs) {
            result.push(...res.data.songs);
        }
    }
    
    return result;
}

export async function search(keyword: string, type: number = 1, page: number = 1, limit: number = 20, cookie: string = '') {
    const url = `${BASE_URL}/api/search/pc`;
    const offset = (page - 1) * limit;
    
    const baseCookies = 'os=pc; appver=2.9.7; mode=31;';
    let finalCookie = cookie.trim();
    if (finalCookie && !finalCookie.includes('=')) {
        finalCookie = `MUSIC_U=${finalCookie}`;
    } else {
        finalCookie = cleanCookie(finalCookie);
    }
    finalCookie = `${baseCookies} ${finalCookie}`;

    const headers: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
        'Referer': BASE_URL,
        'Origin': BASE_URL,
        'Cookie': finalCookie
    };

    const params = new URLSearchParams({
        s: keyword,
        type: String(type),
        offset: String(offset),
        limit: String(limit)
    });

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: params.toString()
    });

    if (!response.ok) {
        throw new Error(`NetEase Search API Error: ${response.status}`);
    }

    const json = await response.json();
    return { data: json };
}

export async function getSongUrl(id: string, br: number = 999000, cookie: string = '') {
    const url = `${EAPI_BASE_URL}/eapi/song/enhance/player/url`;
    const path = '/api/song/enhance/player/url';
    
    // id might be 'netrack_123' or 'ne_track_123', need to strip prefix
    const realId = id.replace(/^(netrack_|ne_track_)/, '');
    
    const data = {
        ids: `[${realId}]`,
        br: br
    };
    
    return requestEapi(url, path, data, cookie);
}

export async function getLyric(id: string, cookie: string = '') {
    const url = `${BASE_URL}/weapi/song/lyric`;
    const realId = id.replace(/^(netrack_|ne_track_)/, '');
    
    const data = {
        id: realId,
        lv: -1,
        tv: -1
    };
    
    return request(url, data, cookie);
}

export async function getSongDetail(id: string, cookie: string = '') {
    const realId = id.replace(/^(netrack_|ne_track_)/, '');
    // Reuse existing getTracksDetail but for single ID
    const tracks = await getTracksDetail([parseInt(realId)], cookie);
    return tracks[0];
}

export async function getRecommendPlaylists(cookie: string) {
    const url = `${BASE_URL}/weapi/personalized/playlist`;
    const data = {
        limit: 20,
        total: true,
        n: 1000
    };
    return request(url, data, cookie);
}
