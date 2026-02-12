import { MusicTrack, MusicSource } from '@shared/types';
import { API_URL } from './api/config';
import { useNetEaseStore } from '@/stores/netease-store';
import { MergedMusicTrack, SearchPageResult, SongLyric } from './types/music';
import { mergeAndSortTracks } from './utils/music-helpers';

const API_BASE = `${API_URL}/music-api`;

const isAbort = (e: unknown) => (e as any)?.name === 'AbortError';

const cookieOf = (source: MusicSource) =>
  source === '_netease' ? useNetEaseStore.getState().cookie : '';

const normalizeTrack = (t: any, source: MusicSource): MusicTrack => ({
  ...t,
  id: String(t.id),
  source,
  artist: Array.isArray(t.artist) ? t.artist : [t.artist],
});

const picCache = new Map<string, string>();

export const musicApi = {

  /* ---------------- 搜索 ---------------- */

  async search(
    query: string,
    source: MusicSource = 'kuwo',
    page = 1,
    count = 20,
    signal?: AbortSignal
  ): Promise<SearchPageResult<MusicTrack>> {

    if (source === 'all') return await this.searchAll(query, page, count, signal);

    try {
      const cookie = cookieOf(source);
      const res = await fetch(
        `${API_BASE}?types=search&source=${source}&name=${encodeURIComponent(query)}&count=${count}&pages=${page}${cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''}`,
        { signal }
      );

      if (!res.ok) return { items: [], hasMore: false };

      const json = await res.json();
      if (!Array.isArray(json)) return { items: [], hasMore: false };

      const items = json.map(t => normalizeTrack(t, source));
      return {
        items,
        hasMore: items.length >= count  //  当返回结果 < 请求数count时，则认为没有更多了
      };

    } catch (e) {
      if (!isAbort(e)) console.error('Search failed', e);
      return { items: [], hasMore: false };
    }
  },

  /* ---------------- 全网搜索 ---------------- */

  async searchAll(
    query: string,
    page = 1,
    count = 20,
    signal?: AbortSignal
  ): Promise<SearchPageResult<MergedMusicTrack>> {

    try {
      const sources: MusicSource[] = ['kuwo', 'joox', 'netease'];

      const results = await Promise.all(
        sources.map(s => this.search(query, s, page, count, signal))
      );

      if (signal?.aborted) return { items: [], hasMore: false };

      const flat = results.flatMap(r => r.items);
      const merged = mergeAndSortTracks(flat);

      return {
        items: merged,
        hasMore: results.some(r => r.hasMore)
      };

    } catch (e) {
      if (!isAbort(e)) console.error('Search All failed', e);
      return { items: [], hasMore: false };
    }
  },

  /* ---------------- URL ---------------- */

  async getUrl(id: string, source: MusicSource, br = 320): Promise<string | null> {
    try {
      const cookie = cookieOf(source);
      const res = await fetch(
        `${API_BASE}?types=url&source=${source}&id=${id}&br=${br}${cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''}`
      );

      if (!res.ok) return null;
      const json = await res.json();
      return json?.url ?? null;

    } catch (e) {
      if (!isAbort(e)) console.error('Get URL failed', e);
      return null;
    }
  },

  /* ---------------- 封面 ---------------- */

  async getPic(id: string, source: MusicSource, size: 200 | 300 | 500 = 300) {
    const cacheKey = `${source}:${id}`;
    if (picCache.has(cacheKey)) {
      return picCache.get(cacheKey)!;
    }

    try {
      const cookie = cookieOf(source);
      const res = await fetch(
        `${API_BASE}?types=pic&source=${source}&id=${encodeURIComponent(id)}&size=${size}${cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''}`
      );

      if (!res.ok) return null;
      const json = await res.json();
      const url = json?.url ?? null;
      
      if (url) {
        picCache.set(cacheKey, url);
      }
      return url;

    } catch (e) {
      if (!isAbort(e)) console.error('Get Pic failed', e);
      return null;
    }
  },

  /* ---------------- 歌词 ---------------- */

  async getLyric(id: string, source: MusicSource): Promise<SongLyric | null> {
    try {
      const cookie = cookieOf(source);
      const res = await fetch(
        `${API_BASE}?types=lyric&source=${source}&id=${id}${cookie ? `&cookie=${encodeURIComponent(cookie)}` : ''}`
      );

      if (!res.ok) return null;
      const json = await res.json();

      return {
        lyric: json?.lyric ?? '',
        tlyric: json?.tlyric ?? ''
      };

    } catch (e) {
      if (!isAbort(e)) console.error('Get Lyric failed', e);
      return null;
    }
  }
};
