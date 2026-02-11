import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, ListMusic } from "lucide-react";
import { useMusicStore } from "@/stores/music-store";
import { MusicTrack } from "@shared/types";
import { toast } from "sonner";

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track?: MusicTrack;
}

export function AddToPlaylistDialog({ open, onOpenChange, track }: AddToPlaylistDialogProps) {
  const { playlists, addToPlaylist, createPlaylist } = useMusicStore();

  if (!track) return null;

  const handleAddToPlaylist = (playlistId: string, playlistName: string) => {
    addToPlaylist(playlistId, track);
    toast.success(`已添加到歌单「${playlistName}」`);
    onOpenChange(false);
  };

  const handleCreatePlaylist = () => {
    const name = window.prompt("请输入新歌单名称");
    if (name) {
      createPlaylist(name);
      toast.success("已创建歌单");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>添加到歌单</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[50vh] max-h-[400px] p-2">
            {playlists.map((p) => (
              <div
                key={p.id}
                className="flex items-center px-4 py-3 text-sm rounded-md hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleAddToPlaylist(p.id, p.name)}
              >
                <ListMusic className="mr-3 h-5 w-5 text-muted-foreground" />
                <span className="truncate font-medium">{p.name}</span>
              </div>
            ))}
            {playlists.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                    暂无歌单
                </div>
            )}
        </ScrollArea>
        <div className="p-2 border-t bg-muted/20">
            <Button variant="ghost" className="w-full justify-start pl-4" onClick={handleCreatePlaylist}>
                <Plus className="mr-2 h-5 w-5" />
                新建歌单
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
