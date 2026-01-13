import { MusicSource, MusicTrack, SearchOptions, LyricResponse } from "./types";

const API_BASE_URL = "https://music-api.gdstudio.xyz/api.php";

// GD Studio 音乐 API 集成类
export class MusicApi {
  // 搜索音乐
  static async search(keyword: string, options?: SearchOptions): Promise<MusicTrack[]> {
    try {
      const params = new URLSearchParams({
        types: "search",
        source: options?.source || MusicSource.Netease,
        name: keyword,
        count: String(options?.count || 20),
        pages: String(options?.pages || 1),
      });

      const response = await fetch(`${API_BASE_URL}?${params}`);
      const data = await response.json();

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: Array.isArray(item.artist) ? item.artist.join(", ") : item.artist || "",
        album: item.album || "",
        duration: undefined,
        source: item.source || MusicSource.Netease,
        coverUrl: undefined,
        lyricId: item.lyric_id,
        picId: item.pic_id,
        isLocal: false,
      }));
    } catch (error) {
      console.error("搜索音乐失败:", error);
      return [];
    }
  }

  // 获取歌曲播放 URL
  static async getTrackUrl(id: string, source: MusicSource = MusicSource.Netease, bitrate: number = 320): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        types: "url",
        source,
        id,
        br: String(bitrate),
      });

      const response = await fetch(`${API_BASE_URL}?${params}`);
      const data = await response.json();

      return data?.url || null;
    } catch (error) {
      console.error("获取歌曲 URL 失败:", error);
      return null;
    }
  }

  // 获取专辑封面
  static async getCoverUrl(picId: string, source: MusicSource = MusicSource.Netease, size: number = 500): Promise<string | null> {
    try {
      const params = new URLSearchParams({
        types: "pic",
        source,
        id: picId,
        size: String(size),
      });

      const response = await fetch(`${API_BASE_URL}?${params}`);
      const data = await response.json();

      return data?.url || null;
    } catch (error) {
      console.error("获取专辑封面失败:", error);
      return null;
    }
  }

  // 获取歌词
  static async getLyric(lyricId: string, source: MusicSource = MusicSource.Netease): Promise<LyricResponse | null> {
    try {
      const params = new URLSearchParams({
        types: "lyric",
        source,
        id: lyricId,
      });

      const response = await fetch(`${API_BASE_URL}?${params}`);
      const data = await response.json();

      return {
        lyric: data?.lyric || "",
        tlyric: data?.tlyric,
      };
    } catch (error) {
      console.error("获取歌词失败:", error);
      return null;
    }
  }

  // 下载音乐文件（返回 Blob）
  static async downloadTrack(url: string): Promise<Blob | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error("下载音乐失败:", error);
      return null;
    }
  }

  // 解析 LRC 格式歌词
  static parseLRC(lrc: string): Array<{ time: number; text: string }> {
    const lines = lrc.split("\n");
    const result: Array<{ time: number; text: string }> = [];

    for (const line of lines) {
      const match = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)/);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const milliseconds = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) : 0;
        const text = match[4].trim();
        const time = minutes * 60 + seconds + milliseconds / 1000;
        result.push({ time, text });
      }
    }

    return result.sort((a, b) => a.time - b.time);
  }
}
