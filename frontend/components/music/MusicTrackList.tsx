import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ListChecks,
  Plus,
  Heart,
  Download,
  Trash2,
  ListPlus,
  ListMusic,
  Loader2,
  Search,
  Check,
  MoreVertical,
} from "lucide-react";
import { MusicTrack } from "@shared/types";
import { processBatch } from "@/lib/utils/common";
import { useMusicStore } from "@/stores/music-store";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MusicTrackItem } from "./MusicTrackItem";
import { downloadMusicTrack } from "@/lib/utils/download";
import { List } from "react-window";
import { AutoSizer, Size } from "react-virtualized-auto-sizer";

interface MusicTrackListProps {
  tracks: MusicTrack[];
  onPlay: (track: MusicTrack) => void;
  currentTrackId?: string;
  isPlaying?: boolean;
  onRemove?: (track: MusicTrack) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

interface RowProps {
  tracks: MusicTrack[];
  currentTrackId?: string;
  isPlaying?: boolean;
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  onPlay: (track: MusicTrack) => void;
  onRemove?: (track: MusicTrack) => void;
  toggleSelect: (id: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}

const Row = ({
  index,
  style,
  tracks,
  currentTrackId,
  isPlaying,
  isSelectionMode,
  selectedIds,
  onPlay,
  onRemove,
  toggleSelect,
  onLoadMore,
  hasMore,
  loading,
}: RowProps & { index: number; style: React.CSSProperties }) => {
  if (index < tracks.length) {
    const track = tracks[index];
    return (
      <MusicTrackItem
        style={style}
        track={track}
        index={index}
        isCurrent={track.id === currentTrackId}
        isPlaying={isPlaying}
        onPlay={() => onPlay(track)}
        showCheckbox={isSelectionMode}
        isSelected={selectedIds.has(track.id)}
        onSelect={() => toggleSelect(track.id)}
        customActions={
          !isSelectionMode &&
          onRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`确定移除歌曲「${track.name}」吗？`)) {
                  onRemove(track);
                }
              }}
              title="移除"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )
        }
      />
    );
  } else {
    // Last item: Load More Button or Spacer
    return (
      <div style={style} className="px-4 pb-20 pt-2">
        {onLoadMore ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
            disabled={!hasMore || loading}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : hasMore ? (
              "加载更多"
            ) : (
              "没有更多了"
            )}
          </Button>
        ) : (
          <div className="h-full" />
        )}
      </div>
    );
  }
};

export function MusicTrackList({
  tracks,
  onPlay,
  currentTrackId,
  isPlaying,
  onRemove,
  onLoadMore,
  hasMore,
  loading,
  emptyMessage = "暂无歌曲",
}: MusicTrackListProps) {
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const {
    addToQueue,
    addToFavorites,
    playlists,
    addToPlaylist,
    createPlaylist,
  } = useMusicStore();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === tracks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tracks.map((t) => t.id)));
    }
  };

  const handleBatch = async (fn: (t: MusicTrack) => void, tip: string) => {
    const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
    
    const toastId = toast.loading(`正在处理 0/${selectedTracks.length}...`);
    
    await processBatch(
      selectedTracks,
      fn,
      (current, total) => {
        toast.loading(`正在处理 ${current}/${total}...`, { id: toastId });
      }
    );

    toast.success(`${tip} ${selectedTracks.length} 首`, { id: toastId });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchRemove = async () => {
    if (!onRemove) return;
    const count = selectedIds.size;
    if (confirm(`确定移除选中的 ${count} 首歌曲吗？`)) {
      const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
      
      const toastId = toast.loading(`正在移除 0/${count}...`);
      await processBatch(
        selectedTracks,
        onRemove,
        (current, total) => {
          toast.loading(`正在移除 ${current}/${total}...`, { id: toastId });
        }
      );

      toast.success(`已移除 ${count} 首歌曲`, { id: toastId });
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    }
  };

  const handleBatchDownload = async () => {
    const selectedTracks = tracks.filter((t) => selectedIds.has(t.id));
    const toastId = toast.loading(`准备下载 0/${selectedTracks.length}...`);

    await processBatch(
      selectedTracks,
      downloadMusicTrack,
      (current, total) => {
        toast.loading(`已开始下载 ${current}/${total}...`, { id: toastId });
      },
      1, // 一次下载一个
      1000 // 间隔1秒
    );
    
    toast.success(`下载任务已全部开始`, { id: toastId });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  if (tracks.length === 0 && !loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <Search className="h-10 w-10 mb-4 opacity-20" />
        <p>{emptyMessage}</p>
        <p className="text-sm text-muted-foreground/60">
          from GD音乐台(music.gdstudio.xyz)
        </p>
      </div>
    );
  }

  const rowProps: RowProps = {
    tracks,
    currentTrackId,
    isPlaying,
    isSelectionMode,
    selectedIds,
    onPlay,
    onRemove,
    toggleSelect,
    onLoadMore,
    hasMore,
    loading,
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 z-10">
        <div className="grid items-center gap-2 px-3 md:px-4 text-sm text-muted-foreground grid-cols-[3rem_1fr_auto] md:grid-cols-[3rem_1.5fr_1fr_auto]">
          {!isSelectionMode ? (
            <>
              <div className="text-center">#</div>
              <div>标题</div>
              <div className="hidden md:block">专辑</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-transparent hover:text-foreground"
                onClick={() => {
                  setIsSelectionMode(true);
                  setSelectedIds(new Set());
                }}
                title="批量操作"
              >
                <ListChecks className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex justify-center">
                <Checkbox
                  checked={
                    selectedIds.size > 0 && selectedIds.size === tracks.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </div>
              <div className="md:col-span-2 col-span-1 flex items-center">
                <span className="text-xs mr-2 text-foreground whitespace-nowrap">
                  已选 {selectedIds.size} 首
                </span>
                <div className="hidden md:flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-3 text-xs font-normal whitespace-nowrap"
                    onClick={() => handleBatch(addToQueue, "已添加")}
                    disabled={selectedIds.size === 0}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    加入播放列表
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleBatch(addToFavorites, "已喜欢")}
                    disabled={selectedIds.size === 0}
                    title="喜欢"
                  >
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleBatchDownload}
                    disabled={selectedIds.size === 0}
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </Button>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={selectedIds.size === 0}
                        title="加入歌单"
                      >
                        <ListPlus className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-48 p-1">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        添加到歌单
                      </div>
                      {playlists.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                          onClick={() =>
                            handleBatch(
                              (t) => addToPlaylist(p.id, t),
                              `已添加到歌单「${p.name}」`,
                            )
                          }
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

                  {onRemove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:text-destructive"
                      onClick={handleBatchRemove}
                      disabled={selectedIds.size === 0}
                      title="移除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="md:hidden flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 px-3 text-xs font-normal whitespace-nowrap"
                    onClick={() => handleBatch(addToQueue, "已添加")}
                    disabled={selectedIds.size === 0}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    加入播放列表
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        disabled={selectedIds.size === 0}
                        title="更多操作"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-48 p-1">
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        批量操作
                      </div>
                      <div
                        className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                        onClick={() => handleBatch(addToFavorites, "已喜欢")}
                      >
                        <Heart className="mr-2 h-4 w-4" /> 喜欢
                      </div>
                      <div
                        className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                        onClick={handleBatchDownload}
                      >
                        <Download className="mr-2 h-4 w-4" /> 下载
                      </div>
                      <div className="border-t my-1" />
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        添加到歌单
                      </div>
                      {playlists.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer"
                          onClick={() =>
                            handleBatch(
                              (t) => addToPlaylist(p.id, t),
                              `已添加到歌单「${p.name}」`,
                            )
                          }
                        >
                          <ListMusic className="mr-2 h-4 w-4 opacity-50" />
                          <span className="truncate">{p.name}</span>
                        </div>
                      ))}
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
                      {onRemove && (
                        <>
                          <div className="border-t my-1" />
                          <div
                            className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-accent cursor-pointer text-destructive"
                            onClick={handleBatchRemove}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> 移除
                          </div>
                        </>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-xs"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
                title="退出批量操作"
              >
                <Check className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 min-h-0">
        <AutoSizer
          renderProp={({ height, width }) => (
            <List<RowProps>
              style={{ width: width ?? 0, height: height ?? 0, scrollbarWidth: "thin" }}
              rowCount={tracks.length + 1}
              rowHeight={56}
              rowComponent={Row}
              rowProps={rowProps}
            />
          )}
        />
      </div>
    </div>
  );
}
