import { API_URL } from './config';

export const neteaseApi = {
  loginCellphone: async (phone: string, password: string, countrycode: string = '86') => {
    const res = await fetch(`${API_URL}/music-api/netease/login`, {
      method: 'POST',
      body: JSON.stringify({ type: 'cellphone', account: phone, password, countrycode }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  loginEmail: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/music-api/netease/login`, {
      method: 'POST',
      body: JSON.stringify({ type: 'email', account: email, password }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  getUserPlaylists: async (userId: string, cookie: string) => {
    const res = await fetch(`${API_URL}/music-api/netease/user-playlists`, {
      method: 'POST',
      body: JSON.stringify({ userId, cookie }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fetch playlists failed');
    }
    return res.json();
  },

  getPlaylistDetail: async (playlistId: string, cookie: string) => {
    const res = await fetch(`${API_URL}/music-api/netease/playlist`, {
      method: 'POST',
      body: JSON.stringify({ playlistId, cookie }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fetch playlist detail failed');
    }
    return res.json();
  },

  getQrKey: async () => {
    const res = await fetch(`${API_URL}/music-api/netease/login/qr/key`);
    if (!res.ok) throw new Error('Failed to get QR key');
    return res.json();
  },

  checkQrStatus: async (key: string) => {
    const res = await fetch(`${API_URL}/music-api/netease/login/qr/check?key=${key}`);
    if (!res.ok) throw new Error('Failed to check status');
    return res.json();
  },

  getMyInfo: async (cookie: string) => {
    const res = await fetch(`${API_URL}/music-api/netease/my-info`, {
      method: 'POST',
      body: JSON.stringify({ cookie }),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to fetch user info');
    return res.json();
  }
};
