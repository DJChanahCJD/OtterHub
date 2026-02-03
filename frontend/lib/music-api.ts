export type MusicSource =
  | 'netease' //  🌟
  | 'tencent'
  | 'kugou'
  | 'kuwo' //  🌟
  | 'bilibili'
  | 'migu'
  | 'qq'
  | 'fivesing'
  | 'tk'
  | 'wy'
  | 'kg'
  | 'kw'
  | 'mg'
  | 'qi'
  | 'lizhi'
  | 'qingting'
  | 'ximalaya'
  | 'kg'
  // Common sources mentioned in doc: netease, tencent, tidal, spotify, ytmusic, qobuz, joox, deezer, migu, kugou, kuwo, ximalaya, apple
  | 'tidal' | 'spotify' | 'ytmusic' | 'qobuz' | 'joox' | 'deezer' | 'apple';

export interface MusicTrack {
  id: string;
  name: string;
  artist: string[];
  album: string;
  pic_id: string;
  url_id: string;
  lyric_id: string;
  source: MusicSource;
}

export interface SearchResult {
  code: number;
  data: MusicTrack[];
  error?: string;
}

export interface SongUrl {
  url: string;
  br: number;
  size: number;
}

export interface SongPic {
  url: string;
}

export interface SongLyric {
  lyric: string;
  tlyric?: string;
}

const API_BASE = 'https://music-api.gdstudio.xyz/api.php';

export const musicApi = {
  /**
   * 搜索音乐
   */
  async search(query: string, source: MusicSource = 'netease', page: number = 1, count: number = 20): Promise<MusicTrack[]> {
    try {
      const res = await fetch(`${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(query)}&count=${count}&pages=${page}`);
      const json = await res.json();
      // The API returns a JSON array directly for search results based on the doc example?
      // Doc says: "返回：id...name...artist..."
      // Usually these PHP APIs return a JSON array or object. Let's assume Array based on common MetingAPI behavior.
      return Array.isArray(json) ? json : [];
    } catch (e) {
      console.error('Search failed', e);
      return [];
    }
  },

  /**
   * 获取音乐链接
   */
  async getUrl(id: string, source: MusicSource, br: number = 320): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}?types=url&source=${source}&id=${id}&br=${br}`);
      const json = await res.json();
      return json.url || null;
    } catch (e) {
      console.error('Get URL failed', e);
      return null;
    }
  },

  /**
   * 获取封面图
   */
  async getPic(id: string, source: MusicSource, size: 300 | 500 = 300): Promise<string | null> {
    try {
      // id param for pic is pic_id
      const res = await fetch(`${API_BASE}?types=pic&source=${source}&id=${id}&size=${size}`);
      const json = await res.json();
      return json.url || null;
    } catch (e) {
      console.error('Get Pic failed', e);
      return null;
    }
  },

  /**
   * 获取歌词
   */
  async getLyric(id: string, source: MusicSource): Promise<SongLyric | null> {
    try {
      // id param for lyric is lyric_id
      const res = await fetch(`${API_BASE}?types=lyric&source=${source}&id=${id}`);
      const json = await res.json();
      return {
        lyric: json.lyric || '',
        tlyric: json.tlyric || ''
      };
    } catch (e) {
      console.error('Get Lyric failed', e);
      return null;
    }
  }
};
