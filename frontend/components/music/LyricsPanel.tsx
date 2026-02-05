import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MusicTrack } from "@shared/types";
import { musicApi } from "@/lib/music-api";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "../ui/button";
import { Heart } from "lucide-react";

interface LyricsPanelProps {
  track: MusicTrack | null;
  currentTime: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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

export function LyricsPanel({ track, currentTime, isFavorite, onToggleFavorite }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

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

  // 移动端 UI - 多行歌词显示
  if (isMobile) {
    return (
      <div className="h-full flex flex-col p-4 gap-4">
        {/* 歌曲信息区域 */}
        <div className={cn(
          "flex flex-col gap-2",
          "pb-4 border-b border-border/40"
        )}>
          <h3 className={cn(
            "font-bold tracking-tight text-foreground/90 text-center",
            "text-xl"
          )}>
            {track.name}
          </h3>
          <p className={cn(
            "text-muted-foreground/80 text-center",
            "text-sm"
          )}>
            {track.artist.join(" / ")}
          </p>
          
          <div className="flex justify-center mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              onClick={onToggleFavorite}
              title="喜欢"
            >
              <Heart
                className={cn(
                  "h-5 w-5",
                  isFavorite && "fill-primary text-primary"
                )}
              />
            </Button>
          </div>
        </div>
        
        {/* 歌词显示区域 */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="py-[45%] space-y-4 text-center">
              {lyrics.map((line, i) => {
                const isActive = i === activeIndex;
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      lineRefs.current[i] = el;
                    }}
                    className={cn(
                      "px-4 transition-all duration-300 ease-out",
                      isActive
                        ? "text-white text-lg font-semibold scale-105"
                        : "text-muted-foreground/60 scale-100 blur-[0.5px]"
                    )}
                  >
                    <p className="text-lg leading-relaxed">
                      {line.text}
                    </p>
                    {line.ttext && (
                      <p className="mt-1 text-sm font-medium text-muted-foreground/90">
                        {line.ttext}
                      </p>
                    )}
                  </div>
                );
              })}
              
              {lyrics.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-center">纯音乐，请欣赏</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // PC 端 UI (保持不变)
  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* 歌曲信息 */}
      <div className="flex flex-col gap-3 pb-6 border-b border-border/40">
        <div className="space-y-1">
          <h3 className="text-2xl font-bold tracking-tight text-foreground/90">
            {track.name}
          </h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground/80">
          {track.album && (
            <div className="flex items-center gap-1.5 group cursor-default">
              <span className="hover:text-foreground transition-colors truncate max-w-[200px]">
                专辑：{track.album}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 group cursor-default">
            <span className="hover:text-foreground transition-colors">
              歌手：{track.artist.join(" / ")}
            </span>
          </div>
        </div>
      </div>

      {/* 歌词区 */}
      <div className="flex-1 min-h-0 relative lyrics-mask">
        <ScrollArea className="hidden md:block h-full">
          <div className="py-[40%] space-y-6 text-center">
            {lyrics.map((line, i) => {
              const isActive = i === activeIndex;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  className={cn(
                    "px-4 transition-all duration-300 ease-out",
                    isActive
                      ? "text-white text-lg font-semibold scale-105"
                      : "text-muted-foreground/60 scale-100 blur-[0.5px]"
                  )}
                >
                  <p className="text-lg md:text-xl leading-relaxed tracking-wide">
                    {line.text}
                  </p>
                  {line.ttext && (
                    <p className="mt-2 text-sm md:text-base font-medium opacity-90">
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
