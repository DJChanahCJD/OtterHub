import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2 } from "lucide-react";
import { MusicTrack, MusicSource, musicApi } from "@/lib/music-api";
import { toast } from "sonner";
import { MusicTrackList } from "./MusicTrackList";
import { useMusicStore } from "@/stores/music-store";
import { useShallow } from "zustand/react/shallow";

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
  // Store
  const { source, setSource } = useMusicStore(
    useShallow((state) => ({
      source: state.searchSource,
      setSource: state.setSearchSource,
    }))
  );

  // Search State
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
          </Button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 min-h-0">
        <MusicTrackList 
          tracks={results}
          onPlay={(track) => onPlay(track, results)}
          currentTrackId={currentTrackId}
          isPlaying={isPlaying}
          loading={isLoadingMore || loading}
          hasMore={hasMore}
          onLoadMore={() => handleSearch(false)}
          emptyMessage={loading ? "搜索中..." : "输入关键词开始搜索"}
        />
      </div>
    </div>
  );
}
