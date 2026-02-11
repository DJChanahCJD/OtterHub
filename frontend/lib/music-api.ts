import { MusicTrack, MusicSource } from '@shared/types';
import { API_URL } from './api/config';
import { useNetEaseStore } from '@/stores/netease-store';

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

const API_BASE = `${API_URL}/music-api`;

// 定义支持聚合搜索的源，按优先级排序（Joox 和 网易云优先）
const AGGREGATE_SOURCES: MusicSource[] = ['joox', 'netease', 'kuwo', 'bilibili'];

// 处理网易云客户端 API 的 Cookie 参数
const getCookieParam = (source: MusicSource) => {
  if (source === '_netease') {
    const cookie = useNetEaseStore.getState().cookie;
    if (cookie) {
      return `&cookie=${encodeURIComponent(cookie)}`;
    }
  }
  return '';
};

export const musicApi = {
  /**
   * 搜索音乐
   */
  async search(query: string, source: MusicSource = 'netease', page: number = 1, count: number = 20): Promise<MusicTrack[]> {
    try {
      if (source === 'all') {
        return this.searchAll(query, page, count);
      }

      const cookieParam = getCookieParam(source);
      const res = await fetch(`${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(query)}&count=${count}&pages=${page}${cookieParam}`);
      const json = await res.json();
      // The API returns a JSON array directly for search results based on the doc example?
      // Doc says: "返回：id...name...artist..."
      // Usually these PHP APIs return a JSON array or object. Let's assume Array based on common MetingAPI behavior.
      if (Array.isArray(json)) {
        return json.map((track: any) => ({
          ...track,
          source: source, // Ensure source is attached
          // Ensure other required fields exist if API is inconsistent
          artist: Array.isArray(track.artist) ? track.artist : [track.artist]
        }));
      }
      return [];
    } catch (e) {
      console.error('Search failed', e);
      return [];
    }
  },

  /**
   * 全网聚合搜索
   */
  async searchAll(query: string, page: number = 1, count: number = 20): Promise<MusicTrack[]> {
    try {
      // 并行搜索所有优先源
      const promises = AGGREGATE_SOURCES.map(s => 
        this.search(query, s, page, count).catch(() => [])
      );
      const resultsArray = await Promise.all(promises);
      
      // 交替合并结果 (Interleaving)
      // 由于 resultsArray 是按优先级排序的，简单的轮询就能实现优先展示高优先级源
      const data: MusicTrack[] = [];
      const maxLength = Math.max(...resultsArray.map(arr => arr.length));
      
      for (let i = 0; i < maxLength; i++) {
        for (const list of resultsArray) {
          if (list[i]) data.push(list[i]);
        }
      }
      
      return data;
    } catch (e) {
      console.error('Search All failed', e);
      return [];
    }
  },

  /**
   * 获取音乐链接
   */
  async getUrl(id: string, source: MusicSource, br: number = 320): Promise<string | null> {
    try {
      const cookieParam = getCookieParam(source);
      const res = await fetch(`${API_BASE}?types=url&source=${source}&id=${id}&br=${br}${cookieParam}`);
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
  async getPic(id: string, source: MusicSource, size: 200 | 300 | 500 = 300): Promise<string | null> {
    try {
      // id param for pic is pic_id
      const cookieParam = getCookieParam(source);
      const res = await fetch(`${API_BASE}?types=pic&source=${source}&id=${id}&size=${size}${cookieParam}`);
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
      const cookieParam = getCookieParam(source);
      const res = await fetch(`${API_BASE}?types=lyric&source=${source}&id=${id}${cookieParam}`);
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
