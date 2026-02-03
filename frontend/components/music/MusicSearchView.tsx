import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Plus, Heart, Play, Pause, ListPlus, ListMusic } from "lucide-react";
import { MusicTrack, MusicSource, musicApi } from "@/lib/music-api";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MusicSearchViewProps {
  onPlay: (track: MusicTrack, list: MusicTrack[]) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
}

const stableSources: Record<string, string> = {
  netease: "网易云音乐",
  kuwo: "酷我音乐",
  joox: "Joox",
  bilibili: "B站",
};

export function MusicSearchView({ onPlay, currentTrackId, isPlaying }: MusicSearchViewProps) {
  // Search State
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<MusicSource>("netease");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { addToQueue, addToFavorites, playlists, addToUserPlaylist, createPlaylist } = useMusicStore();

  const handleSearch = async (isNew = true) => {
    if (!query.trim()) return;
    
    if (isNew) {
      setLoading(true);
      setPage(1);
      setResults([]);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const p = isNew ? 1 : page + 1;
      const data = await musicApi.search(query, source, p);
      
      if (isNew) {
        setResults(data);
        setHasMore(data.length >= 20);
      } else {
        setResults(prev => [...prev, ...data]);
        setHasMore(data.length >= 20);
        setPage(p);
      }
    } catch (error) {
      toast.error("搜索失败，请重试");
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBatch = (fn: (t: MusicTrack) => void, tip: string) => {
    const tracks = results.filter(t => selectedIds.has(t.id));
    tracks.forEach(fn);
    toast.success(`${tip} ${tracks.length} 首`);
    setSelectedIds(new Set());
  };

  // Add all to queue (Play All)
  const handlePlayAll = () => {
    if (results.length > 0) {
      onPlay(results[0], results);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Search Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(true)}
              placeholder="搜索歌曲 / 歌手 / 专辑"
              className="pl-9"
            />
          </div>
          <Select value={source} onValueChange={(v) => setSource(v as MusicSource)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(stableSources).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleSearch(true)} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : "搜索"}
          </Button>
        </div>
      </div>

      {/* Toolbar / Stats */}
      {results.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/5 text-xs">
          <div className="flex items-center gap-2">
             <span className="text-muted-foreground">共 {results.length} 条结果</span>
             <Button variant="link" size="sm" className="h-auto p-0 text-primary" onClick={handlePlayAll}>
                播放全部
             </Button>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
              <span className="text-muted-foreground">已选 {selectedIds.size} 首</span>
              <Button size="sm" variant="secondary" onClick={() => handleBatch(addToQueue, "已添加")} title="添加到播放队列">
                <Plus className="w-3 h-3 mr-1" /> 加入队列
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleBatch(addToFavorites, "已收藏")} title="添加到收藏">
                <Heart className="w-3 h-3 mr-1" /> 收藏
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="secondary" title="添加到歌单">
                    <ListPlus className="w-3 h-3 mr-1" /> 加入歌单
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-48 p-1">
                   <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">添加到歌单</div>
                   {playlists.map(p => (
                     <div 
                        key={p.id} 
                        className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                        onClick={() => handleBatch((t) => addToUserPlaylist(p.id, t), `已添加到歌单"${p.name}"`)}
                     >
                        <ListMusic className="mr-2 h-4 w-4 opacity-50" />
                        <span className="truncate">{p.name}</span>
                     </div>
                   ))}
                   <div className="border-t my-1" />
                   <div 
                      className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-muted-foreground"
                      onClick={() => {
                        const name = window.prompt("请输入新歌单名称");
                        if (name) {
                          createPlaylist(name);
                          toast.success("已创建歌单");
                        }
                      }}
                   >
                      <Plus className="mr-2 h-4 w-4" /> 新建歌单
                   </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      )}

      {/* Results List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {results.map((track, i) => {
            const isSelected = selectedIds.has(track.id);
            const isCurrent = track.id === currentTrackId;

            return (
              <div
                key={`${track.id}-${i}`}
                onClick={() => toggleSelect(track.id)}
                className={cn(
                  "group flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all",
                  isSelected 
                    ? "bg-primary/10 border-primary/20" 
                    : "border-transparent hover:bg-muted",
                )}
              >
                <div className="w-8 flex justify-center text-muted-foreground">
                    {isCurrent && isPlaying ? (
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    ) : (
                        <span className="text-xs font-mono opacity-50">{i + 1}</span>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-medium truncate", isCurrent && "text-primary")}>
                    {track.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {track.artist.join(" / ")} · {track.album}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(track, results); // Play this track, replace context with results
                      }}
                      title="播放"
                    >
                      <Play className="h-4 w-4" />
                   </Button>
                   <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToFavorites(track);
                        toast.success("已收藏");
                      }}
                      title="收藏"
                    >
                      <Heart className="h-4 w-4" />
                   </Button>
                   <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToQueue(track); // Adds to queue (legacy name in store actions, but logic is append)
                        toast.success("已加入播放队列");
                      }}
                      title="添加到播放队列"
                    >
                      <Plus className="h-4 w-4" />
                   </Button>
                   <Popover>
                    <PopoverTrigger asChild>
                      <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          title="添加到歌单"
                        >
                          <ListPlus className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="left" align="center" className="w-48 p-1">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">添加到歌单</div>
                      {playlists.map(p => (
                        <div 
                            key={p.id} 
                            className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToUserPlaylist(p.id, track);
                              toast.success(`已添加到歌单"${p.name}"`);
                            }}
                        >
                            <ListMusic className="mr-2 h-4 w-4 opacity-50" />
                            <span className="truncate">{p.name}</span>
                        </div>
                      ))}
                      <div className="border-t my-1" />
                      <div 
                          className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            const name = window.prompt("请输入新歌单名称");
                            if (name) {
                              createPlaylist(name);
                              toast.success("已创建歌单");
                            }
                          }}
                      >
                          <Plus className="mr-2 h-4 w-4" /> 新建歌单
                      </div>
                    </PopoverContent>
                   </Popover>
                </div>
              </div>
            );
          })}
          
          {results.length > 0 && (
            <div className="p-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleSearch(false)}
                disabled={!hasMore || isLoadingMore}
              >
                {isLoadingMore ? <Loader2 className="animate-spin mr-2" /> : hasMore ? "加载更多" : "没有更多了"}
              </Button>
            </div>
          )}
          
          {results.length === 0 && !loading && (
            <div className="py-20 text-center text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-4 opacity-20" />
                <p>输入关键词开始搜索</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
