import * as forge from 'node-forge';
import { weapi, eapi } from './netease-crypto';

// 参考项目：https://github.com/listen1

const BASE_URL = 'https://music.163.com';
const EAPI_BASE_URL = 'https://interface3.music.163.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function request(url: string, data: any, cookie: string = '') {
  const encData = weapi(data);
  const params = new URLSearchParams(encData as any).toString();

  // Prepare cookie
  const baseCookies = 'os=pc; appver=2.9.7; mode=31;';
  let finalCookie = cookie.trim();
  if (!finalCookie.includes('=')) {
      finalCookie = `MUSIC_U=${finalCookie}`;
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
  
  const json = await response.json();
  return { data: json, cookie: setCookie };
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


export async function loginCellphone(phone: string, password: string, countrycode: string = '86') {
  const url = `${BASE_URL}/weapi/login/cellphone`;
  const md5Pass = forge.md5.create().update(password).digest().toHex();
  
  const data = {
    phone,
    countrycode,
    password: md5Pass,
    rememberLogin: 'true',
  };
  
  return request(url, data);
}

export async function loginEmail(email: string, password: string) {
    const url = `${BASE_URL}/weapi/login`;
    const md5Pass = forge.md5.create().update(password).digest().toHex();
    
    const data = {
      username: email,
      password: md5Pass,
      rememberLogin: 'true',
    };
    
    return request(url, data);
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
    // Note: api/user/playlist is not weapi? 1Listen uses api/user/playlist with URLSearchParams directly?
    // Wait, 1Listen's getUserPlaylist uses axios.post(target_url, new URLSearchParams(req_data)) but NOT weapi encrypted?
    // Let's check 1Listen source again.
    // Line 843: axios.post(target_url, new URLSearchParams(req_data))
    // req_data = { uid, limit, offset, includeVideo }
    // It does NOT call this.weapi(req_data).
    // So it's a plain POST? But wait, "api" usually means plain, "weapi" means encrypted.
    // However, 1Listen has headers modification.
    
    // Let's try plain POST first as per 1Listen code.
    // But we need headers.
    
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
    // 1Listen uses weapi for playlist detail
    // target_url = 'https://music.163.com/weapi/v3/playlist/detail';
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
    
    // Track IDs are just IDs. We need details.
    // 1Listen fetches details in batches.
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
    const data = {
        s: keyword,
        type: type, // 1 for song, 1000 for playlist
        offset: offset,
        limit: limit
    };
    return request(url, data, cookie);
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
    // However, getTracksDetail returns an array.
    const tracks = await getTracksDetail([parseInt(realId)], cookie);
    return tracks[0];
}
