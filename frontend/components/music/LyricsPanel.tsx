import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MusicTrack, musicApi } from "@/lib/music-api";
import { cn } from "@/lib/utils";

interface LyricsPanelProps {
  track: MusicTrack | null;
  currentTime: number;
}

interface LyricLine {
  time: number;
  text: string;
  ttext?: string;
}

/** 解析 LRC（主歌词 + 翻译歌词） */
function parseLrc(lrc: string, tLrc?: string): LyricLine[] {
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})]/;

  // 翻译歌词：按秒粗匹配
  const tMap: Record<number, string> = {};
  if (tLrc) {
    for (const line of tLrc.split("\n")) {
      const m = timeExp.exec(line);
      if (!m) continue;
      const time =
        Number(m[1]) * 60 +
        Number(m[2]) +
        Number(m[3].padEnd(3, "0")) / 1000;
      const text = line.replace(timeExp, "").trim();
      if (text) tMap[Math.floor(time)] = text;
    }
  }

  const result: LyricLine[] = [];
  for (const line of lrc.split("\n")) {
    const m = timeExp.exec(line);
    if (!m) continue;

    const time =
      Number(m[1]) * 60 +
      Number(m[2]) +
      Number(m[3].padEnd(3, "0")) / 1000;
    const text = line.replace(timeExp, "").trim();
    if (!text) continue;

    result.push({
      time,
      text,
      ttext: tMap[Math.floor(time)],
    });
  }

  return result;
}

export function LyricsPanel({ track, currentTime }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);

  const activeIndexRef = useRef(0);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  /** 加载歌词 */
  useEffect(() => {
    if (!track) {
      setLyrics([]);
      return;
    }

    setLoading(true);
    musicApi
      .getLyric(track.lyric_id, track.source)
      .then((res) => {
        if (!res) {
          setLyrics([{ time: 0, text: "暂无歌词" }]);
          return;
        }
        setLyrics(parseLrc(res.lyric, res.tlyric));
      })
      .catch(() => {
        setLyrics([{ time: 0, text: "歌词加载失败" }]);
      })
      .finally(() => setLoading(false));
  }, [track]);

  /** 计算当前高亮行 */
  const activeIndex = useMemo(() => {
    if (!lyrics.length) return 0;
    const idx = lyrics.findIndex((l) => l.time > currentTime);
    return idx === -1 ? lyrics.length - 1 : Math.max(0, idx - 1);
  }, [currentTime, lyrics]);

  /** 自动滚动到中间 */
  useEffect(() => {
    if (activeIndex === activeIndexRef.current) return;
    activeIndexRef.current = activeIndex;

    const el = lineRefs.current[activeIndex];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  /* ---------- 状态兜底 ---------- */

  if (!track) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground/40">
        选择歌曲查看歌词
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground/40">
        加载歌词中...
      </div>
    );
  }

  /* ---------- 正式 UI ---------- */

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* 歌曲信息 */}
      <div className="space-y-1">
        <h3 className="text-lg font-bold">{track.name}</h3>
        <div className="text-sm text-muted-foreground">
          {track.album && <span>专辑：{track.album}</span>}
          <span>歌手：{track.artist.join(" / ")}</span>
        </div>
      </div>

      {/* 歌词区 */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full mask-linear-gradient">
          <div className="py-[50%] space-y-6 text-center">
            {lyrics.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={cn(
                    "px-4 transition-all duration-300",
                    isActive
                      ? "text-primary scale-110 font-bold"
                      : "text-muted-foreground/60 scale-95 blur-[0.5px]"
                  )}
                >
                  <p className="text-base md:text-lg">{line.text}</p>
                  {line.ttext && (
                    <p className="mt-1 text-xs md:text-sm opacity-80">
                      {line.ttext}
                    </p>
                  )}
                </div>
              );
            })}

            {lyrics.length === 0 && (
              <p className="text-muted-foreground">纯音乐，请欣赏</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
