import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/music-store";
import {
  ListMusic,
  Search,
  Heart,
  Music2,
  SquarePlus,
  ListVideo,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, memo } from "react";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

interface MusicSidebarProps {
  currentView: "search" | "favorites" | "playlist" | "queue" | "netease";
  currentPlaylistId?: string;
  onViewChange: (
    view: "search" | "favorites" | "playlist" | "queue" | "netease",
    playlistId?: string,
  ) => void;
  onItemClick?: () => void;
  className?: string;
}

export const MusicSidebar = memo(function MusicSidebar({
  currentView,
  currentPlaylistId,
  onViewChange,
  onItemClick,
  className,
}: MusicSidebarProps) {
  const { playlists, createPlaylist, queue } = useMusicStore(
    useShallow((state) => ({
      playlists: state.playlists,
      createPlaylist: state.createPlaylist,
      queue: state.queue,
    })),
  );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) {
      toast.error("请输入歌单名称");
      return;
    }
    createPlaylist(newPlaylistName);
    setNewPlaylistName("");
    setIsCreateOpen(false);
    toast.success("歌单创建成功");
  };

  const NavItem = ({
    active,
    icon: Icon,
    label,
    onClick,
  }: {
    active: boolean;
    icon: any;
    label: string;
    onClick: () => void;
  }) => (
    <div
      role="button"
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start gap-2 cursor-pointer group pr-1",
        active && "bg-primary/80",
      )}
      title={label}
      onClick={() => {
        onClick();
        onItemClick?.();
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate flex-1 text-left">{label}</span>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background/30 backdrop-blur-lg border-r border-border/40",
        className,
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold tracking-tight px-2 flex items-center gap-2">
            <Music2 className="h-5 w-5" />
            Otter Music
          </h2>
        </div>
        <div className="space-y-1">
          <NavItem
            active={currentView === "search"}
            icon={Search}
            label="搜索发现"
            onClick={() => onViewChange("search")}
          />
          <NavItem
            active={currentView === "favorites"}
            icon={Heart}
            label="我的喜欢"
            onClick={() => onViewChange("favorites")}
          />
          <NavItem
            active={currentView === "queue"}
            icon={ListVideo}
            label={`播放队列 (${queue.length})`}
            onClick={() => onViewChange("queue")}
          />
          <NavItem
            active={currentView === "netease"}
            icon={Cloud}
            label="网易云音乐"
            onClick={() => onViewChange("netease")}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground px-2">
            我的歌单
          </h3>
          <div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                {/* 图标按钮模板 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:bg-transparent hover:text-primary"
                  title="新建歌单"
                >
                  <SquarePlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新建歌单</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="歌单名称"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCreatePlaylist()
                    }
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreatePlaylist}>创建</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="px-2 space-y-1 pb-4">
            {playlists.map((playlist) => (
              <NavItem
                key={playlist.id}
                active={
                  currentView === "playlist" &&
                  currentPlaylistId === playlist.id
                }
                icon={ListMusic}
                label={playlist.name}
                onClick={() => onViewChange("playlist", playlist.id)}
              />
            ))}
            {playlists.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground border-dashed border rounded-md mx-2">
                暂无歌单
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});
