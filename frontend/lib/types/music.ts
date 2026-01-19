// === 音乐播放器相关类型 ===

import { FileItem } from "./file";

// 音乐来源
export enum MusicSource {
  Netease = "netease",     // 网易云音乐
  QQ = "tencent",          // QQ音乐
  Kugou = "kugou",         // 酷狗音乐
  Kuwo = "kuwo",           // 酷我音乐
  Migu = "migu",           // 咪咕音乐
}

// 播放器来源
export enum PlayerSource {
  Local = "local",         // 本地音频文件
  Online = "online",       // 在线搜索结果
}

// 音乐曲目信息
export interface MusicTrack {
  id: string;              // 音乐ID
  name: string;            // 歌曲名
  artist: string;          // 歌手
  album: string;           // 专辑
  duration?: number;       // 时长（秒）
  source: MusicSource;     // 来源
  url?: string;            // 播放URL（动态获取）
  coverUrl?: string;       // 封面图URL
  lyricId?: string;        // 歌词ID
  picId?: string;          // 图片ID
  isLocal?: boolean;       // 是否为本地文件
  fileItem?: FileItem;     // 本地文件项（如果是本地音频）
}

// 音乐搜索选项
export interface SearchOptions {
  source?: MusicSource;    // 指定来源（可选）
  count?: number;          // 返回数量（默认20）
  pages?: number;          // 页码（默认1）
}

// 歌词行（LRC格式）
export interface LyricLine {
  time: number;            // 时间戳（秒）
  text: string;            // 歌词文本
}

// 歌词响应
export interface LyricResponse {
  lyric: string;            // 原始歌词（LRC格式）
  tlyric?: string;         // 翻译歌词（可选）
}