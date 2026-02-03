import { MusicTrack, musicApi } from "@/lib/music-api";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Trash2, Music, ListChecks, Plus, Heart, Download, CheckSquare, Square } from "lucide-react";
import { MusicTrackItem } from "./MusicTrackItem";
import { useState } from "react";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";

interface MusicPlaylistViewProps {
  title: string;
  tracks: MusicTrack[];
  onPlay: (track: MusicTrack, index: number) => void;
  onRemove?: (track: MusicTrack) => void;
  description?: string;
  currentTrackId?: string;
  isPlaying?: boolean;
}

export function MusicPlaylistView({
  title,
  tracks,
  onPlay,
  onRemove,
  description,
  currentTrackId,
  isPlaying
}: MusicPlaylistViewProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { addToQueue, addToFavorites } = useMusicStore();

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map(t => t.id)));
    }
  };

  const handleBatch = (fn: (t: MusicTrack) => void, tip: string) => {
    const selectedTracks = tracks.filter(t => selectedIds.has(t.id));
    selectedTracks.forEach(fn);
    toast.success(`${tip} ${selectedTracks.length} 首`);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchRemove = () => {
    if (!onRemove) return;
    const count = selectedIds.size;
    if (confirm(`确定移除选中的 ${count} 首歌曲吗？`)) {
      const selectedTracks = tracks.filter(t => selectedIds.has(t.id));
      selectedTracks.forEach(onRemove);
      toast.success(`已移除 ${count} 首歌曲`);
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  };

  const handleBatchDownload = async () => {
    const selectedTracks = tracks.filter(t => selectedIds.has(t.id));
    toast.info(`开始准备下载 ${selectedTracks.length} 首歌曲...`);
    
    for (const track of selectedTracks) {
      try {
        const url = await musicApi.getUrl(track.id, track.source);
        if (url) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `${track.name} - ${track.artist.join(',')}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Small delay to prevent browser blocking
          await new Promise(r => setTimeout(r, 500));
        }
      } catch (e) {
        console.error(`Failed to download ${track.name}`, e);
      }
    }
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };
  
  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <Music className="h-12 w-12 mb-4 opacity-20" />
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm opacity-60">暂无歌曲</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b flex items-end gap-6 bg-muted/10">
        <div className="h-32 w-32 bg-primary/10 rounded-lg flex items-center justify-center shadow-sm border">
          <Music className="h-12 w-12 text-primary/40" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="text-sm font-medium text-primary uppercase tracking-wider">Playlist</div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>{tracks.length} 首歌曲</span>
            {description && (
              <>
                <span>•</span>
                <span>{description}</span>
              </>
            )}
          </div>
          <div className="pt-2 flex gap-2">
             <Button 
                onClick={() => onPlay(tracks[0], 0)} 
                className="rounded-full px-8"
                size="lg"
             >
                <Play className="mr-2 h-4 w-4 fill-current" /> 播放全部
             </Button>
             <Button
                variant={isSelectionMode ? "secondary" : "outline"}
                size="lg"
                className="rounded-full px-4"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedIds(new Set());
                }}
                title="批量操作"
             >
                <ListChecks className="h-4 w-4" />
             </Button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      {isSelectionMode && (
        <div className="flex items-center justify-between px-6 py-2 border-b bg-muted/20 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleSelectAll} title={selectedIds.size === tracks.length ? "取消全选" : "全选"}>
              {selectedIds.size === tracks.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </Button>
            <span className="text-xs text-muted-foreground">已选 {selectedIds.size} 首</span>
          </div>
          <div className="flex items-center gap-2">
             <Button size="sm" variant="secondary" onClick={() => handleBatch(addToQueue, "已添加")} disabled={selectedIds.size === 0}>
               <Plus className="w-3 h-3 mr-1" /> 加入队列
             </Button>
             <Button size="sm" variant="secondary" onClick={() => handleBatch(addToFavorites, "已收藏")} disabled={selectedIds.size === 0}>
               <Heart className="w-3 h-3 mr-1" /> 收藏
             </Button>
             <Button size="sm" variant="secondary" onClick={handleBatchDownload} disabled={selectedIds.size === 0}>
               <Download className="w-3 h-3 mr-1" /> 下载
             </Button>
             {onRemove && (
               <Button size="sm" variant="destructive" onClick={handleBatchRemove} disabled={selectedIds.size === 0}>
                 <Trash2 className="w-3 h-3 mr-1" /> 移除
               </Button>
             )}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 min-h-0 bg-background/50">
        <ScrollArea className="h-full">
          <div className="pb-20 p-2 space-y-1">
            {tracks.map((track, i) => (
              <MusicTrackItem
                key={`${track.id}-${i}`}
                track={track}
                index={i}
                isCurrent={track.id === currentTrackId}
                isPlaying={isPlaying}
                onPlay={() => onPlay(track, i)}
                showCheckbox={isSelectionMode}
                isSelected={selectedIds.has(track.id)}
                onSelect={() => toggleSelect(track.id)}
                customActions={!isSelectionMode && onRemove && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定从歌单「${title}」移除歌曲「${track.name}」吗？`)) {
                        onRemove(track);
                      }
                    }}
                    title="从歌单移除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
