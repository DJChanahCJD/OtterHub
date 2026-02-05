import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMusicStore } from "@/stores/music-store";
import {
  ListMusic,
  Search,
  Heart,
  Music2,
  Trash2,
  SquarePlus,
  RefreshCw,
  CloudSync,
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
import { musicStoreApi } from "@/lib/api/settings";

interface MusicSidebarProps {
  currentView: "search" | "favorites" | "playlist";
  currentPlaylistId?: string;
  onViewChange: (
    view: "search" | "favorites" | "playlist",
    playlistId?: string,
  ) => void;
  className?: string;
}

export const MusicSidebar = memo(function MusicSidebar({
  currentView,
  currentPlaylistId,
  onViewChange,
  className,
}: MusicSidebarProps) {
  const { playlists, createPlaylist, deletePlaylist } =
    useMusicStore(
      useShallow((state) => ({
        playlists: state.playlists,
        createPlaylist: state.createPlaylist,
        deletePlaylist: state.deletePlaylist,
      })),
    );
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

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

  const handleSyncMerge = () => {
    setIsSyncConfirmOpen(true);
  };

  const executeSyncMerge = async () => {
    setIsSyncConfirmOpen(false);
    setIsSyncing(true);
    try {
      const result = await useMusicStore.getState().syncWithCloud();

      if (result === "uploaded")
        toast.success("本地数据已上传到云端");
      else
        toast.success("数据合并同步成功");

    } catch (error: any) {
      // 认证失败会自动跳转到登录页面
      if (error.message !== "Failed to fetch") {
        toast.error("同步失败: " + error.message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const NavItem = ({
    active,
    icon: Icon,
    label,
    onClick,
    action,
  }: {
    active: boolean;
    icon: any;
    label: string;
    onClick: () => void;
    action?: React.ReactNode;
  }) => (
    <div
      role="button"
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "w-full justify-start gap-2 cursor-pointer group pr-1",
        active && "bg-primary/80",
      )}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate flex-1 text-left">{label}</span>
      {action && (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          {action}
        </div>
      )}
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
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground px-2">
            我的歌单
          </h3>
          <div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:bg-transparent hover:text-primary"
              onClick={handleSyncMerge}
              disabled={isSyncing}
              title="同步合并音乐数据"
            >
              <CloudSync
                className={cn("h-4 w-4", isSyncing && "animate-spin")}
              />
            </Button>
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
                action={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除歌单"
                    onClick={() => {
                      if (confirm(`确定删除歌单「${playlist.name}」吗？`)) {
                        deletePlaylist(playlist.id);
                        if (currentPlaylistId === playlist.id) {
                          onViewChange("search");
                        }
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                }
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

      {/* 同步确认对话框 */}
      <Dialog open={isSyncConfirmOpen} onOpenChange={setIsSyncConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-500">
              <RefreshCw className="h-4 w-4" />
              确认同步合并
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm space-y-2">
            <p>将智能合并本地和云端音乐数据：</p>
            <ul className="list-disc list-inside text-xs text-muted-foreground">
              <li>去重合并喜欢歌曲</li>
              <li>按ID匹配合并歌单</li>
              <li>保留两边的新数据</li>
              <li>自动处理认证</li>
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSyncConfirmOpen(false)}
            >
              取消
            </Button>
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              onClick={executeSyncMerge}
              disabled={isSyncing}
            >
              确认同步
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
