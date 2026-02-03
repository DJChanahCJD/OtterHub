import { useEffect, useRef, useState } from "react";
import { Search, Download, Heart, Play, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MusicTrack, MusicSource, musicApi } from "@/lib/music-api";
import { useMusicStore } from "@/stores/music-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MusicHeaderProps {
  onSearch: (query: string, source: MusicSource) => void;
  loading?: boolean;
  searchResults: MusicTrack[];
  onPlay: (track: MusicTrack, list: MusicTrack[]) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

const stableSources: Record<string, string> = {
  netease: "网易云音乐",
  kuwo: "酷我音乐",
  joox: "Joox",
  bilibili: "B站",
};

export function MusicHeader({
  onSearch,
  loading,
  searchResults,
  onPlay,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: MusicHeaderProps) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<MusicSource>("netease");
  const [showResults, setShowResults] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const containerRef = useRef<HTMLDivElement>(null);
  const { addToPlaylist, addToFavorites } = useMusicStore();

  /** 点击外部关闭 */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (searchResults.length) setShowResults(true);
  }, [searchResults]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBatch = (fn: (t: MusicTrack) => void, tip: string) => {
    const tracks = searchResults.filter(t => selectedIds.has(t.id));
    tracks.forEach(fn);
    toast.success(`${tip} ${tracks.length} 首`);
    setSelectedIds(new Set());
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col md:flex-row gap-4 p-4 border-b bg-background/95 backdrop-blur sticky top-0 z-10"
    >
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch(query, source)}
          onFocus={() => searchResults.length && setShowResults(true)}
          placeholder="搜索歌曲 / 歌手 / 专辑"
          className="pl-9 h-10"
        />

        {showResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-lg z-50 flex flex-col h-[60vh] overflow-hidden">
            {/* 批量操作栏 */}
            <div className="flex items-center justify-between gap-2 px-3 h-9 border-b text-xs">
              <span className="text-muted-foreground">
                共 {searchResults.length} 条结果
              </span>
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground mr-1">
                    已选 {selectedIds.size} 首
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="加入播放列表"
                    onClick={() => handleBatch(addToPlaylist, "已加入列表")}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    title="收藏"
                    onClick={() => handleBatch(addToFavorites, "已收藏")}
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-1 w-full">
                {searchResults.map((track, i) => {
                  const selected = selectedIds.has(track.id);

                  return (
                    <div
                      key={`${track.id}-${i}`}
                      onClick={() => toggleSelect(track.id)}
                      className={cn(
                        "group flex items-center gap-3 p-2 rounded cursor-pointer w-full border transition-colors",
                        selected
                          ? "bg-primary/10 border-primary/20"
                          : "border-transparent hover:bg-accent/50"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {track.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {track.artist.join(" / ")} · {track.album}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlay(track, searchResults);
                          }}
                        >
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onLoadMore}
                      disabled={isLoadingMore}
                      className="w-full text-xs"
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        "加载更多"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Select value={source} onValueChange={(v) => setSource(v as MusicSource)}>
          <SelectTrigger className="w-[140px] h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(stableSources).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => onSearch(query, source)} disabled={loading}>
          {loading ? "搜索中..." : "搜索"}
        </Button>
      </div>
    </div>
  );
}
