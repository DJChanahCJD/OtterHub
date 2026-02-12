import { MusicTrack, MusicSource } from '@shared/types';
import { MergedMusicTrack } from '../types/music';
import zhT2SMap from './zh-t2s-map.json';

/* ---------------- 繁简转换 ---------------- */

const tMap = new Map<string, string>(Object.entries(zhT2SMap));

/* ---------------- 常量 ---------------- */

const SOURCE_PRIORITY: MusicSource[] = ['kuwo', 'joox', 'netease'];
const SOURCE_RANK = new Map(SOURCE_PRIORITY.map((s, i) => [s, i]));

/* ---------------- 文本规范化 ---------------- */

export const normalizeText = (v: string): string => {
  if (!v) return '';

  let base = v.toLowerCase().normalize('NFKC');

  // 1. 去除括号及内容 (Live, Remix, feat. 等)
  // 支持: (), [], {}, 【】, （）
  base = base.replace(/[(\[\{【（].*?[)\]\}】）]/g, ' ');

  // 2. 繁简转换
  base = base.replace(/[\u4e00-\u9fa5]/g, c => tMap.get(c) ?? c);

  // 3. 去除特殊字符，只保留字母数字和汉字
  base = base.replace(/[^\w\u4e00-\u9fa5]/g, '');

  const result = base.trim();

  // 如果处理后为空（例如只有符号），则回退到仅去空格
  return result || v.toLowerCase().normalize('NFKC').replace(/\s+/g, '').trim();
};

export const normalizeArtists = (artists: string[]) =>
  artists.map(normalizeText).filter(Boolean).sort().join('/');

/* ---------------- Key 生成 ---------------- */

export const getExactKey = (t: MusicTrack) => `${normalizeText(t.name)}|${normalizeArtists(t.artist)}`;
const getNameKey = (t: MusicTrack) => normalizeText(t.name);

const rank = (s: MusicSource) => SOURCE_RANK.get(s) ?? 999;

/* ---------------- 辅助函数 ---------------- */

/**
 * 检查艺人是否有重叠
 * 只要有一个艺人相同，即视为重叠（满足用户需求：包含原版歌手即可堆叠）
 */
const hasArtistOverlap = (t1: MusicTrack, t2: MusicTrack): boolean => {
  const a1 = new Set(t1.artist.map(normalizeText));
  const a2 = t2.artist.map(normalizeText);
  return a2.some(a => a1.has(a));
};

const pickMainTrack = (t1: MusicTrack, t2: MusicTrack): MusicTrack => {
  // 1. 优先选名字短的（通常原版比 Live/Remix 版短）
  // 例如 "黑夜问白天" (5) vs "黑夜问白天 (Live)" (11) -> 选前者
  const len1 = t1.name.length;
  const len2 = t2.name.length;
  if (len1 < len2) return t1;
  if (len2 < len1) return t2;

  // 2. 名字长度一样，优先选 Source Rank 高的
  if (rank(t1.source) < rank(t2.source)) return t1;
  return t2;
};

/* ---------------- 主逻辑 ---------------- */

/**
 * 多源合并 + 去重 + 排序
 */
export const mergeAndSortTracks = (tracks: MusicTrack[]): MergedMusicTrack[] => {
  // 1. 精确去重 (Same Name + Same Artists)
  const exactMap = new Map<string, { main: MusicTrack; vars: MusicTrack[] }>();

  tracks.forEach(t => {
    const key = getExactKey(t);
    if (!exactMap.has(key)) {
        exactMap.set(key, { main: t, vars: [] });
    } else {
        const entry = exactMap.get(key)!;
        // 同 Key 下，Source Rank 高的优先
        if (rank(t.source) < rank(entry.main.source)) {
            entry.vars.push(entry.main);
            entry.main = t;
        } else {
            entry.vars.push(t);
        }
    }
  });

  // 2. 按标准化后的歌名分组
  // "黑夜问白天 (Live)" 和 "黑夜问白天" 标准化后都是 "黑夜问白天" -> 同一组
  const nameGroups = new Map<string, MergedMusicTrack[]>();

  for (const entry of exactMap.values()) {
    const nameKey = getNameKey(entry.main);
    if (!nameGroups.has(nameKey)) {
        nameGroups.set(nameKey, []);
    }
    
    const merged: MergedMusicTrack = {
        ...entry.main,
        variants: entry.vars
    };
    nameGroups.get(nameKey)!.push(merged);
  }

  const finalResults: MergedMusicTrack[] = [];

  // 3. 组内模糊合并 (Artist Overlap)
  for (const group of nameGroups.values()) {
     const clusters: MergedMusicTrack[] = [];

     for (const item of group) {
        let mergedTo = -1;
        
        // 尝试与现有的 cluster 合并
        for (let i = 0; i < clusters.length; i++) {
            if (hasArtistOverlap(item, clusters[i])) {
                mergedTo = i;
                break;
            }
        }

        if (mergedTo !== -1) {
            // 合并逻辑
            const target = clusters[mergedTo];
            const newMain = pickMainTrack(target, item);
            
            const allVariants = [
                ...(target.variants || []),
                ...(item.variants || [])
            ];
            
            // 将非 main 的那个加入 variants
            if (newMain === target) {
                allVariants.push(item);
            } else {
                allVariants.push(target);
            }
            
            clusters[mergedTo] = {
                ...newMain,
                variants: allVariants
            };

        } else {
            // 无法合并，作为新的 cluster
            clusters.push(item);
        }
     }
     
     finalResults.push(...clusters);
  }

  // 4. 最终排序
  return finalResults.sort((a, b) => rank(a.source) - rank(b.source));
};
