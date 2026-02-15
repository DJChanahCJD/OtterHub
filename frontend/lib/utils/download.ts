import { MusicTrack } from "@shared/types";
import { toast } from "sonner";
import { musicApi } from "../music-api";

export async function downloadMusicTrack(track: MusicTrack) {
  const toastId = toast.loading(`正在获取下载链接: ${track.name}`);
  try {
    const url = await musicApi.getUrl(track.id, track.source);
    if (!url) {
      toast.error("无法获取下载链接", { id: toastId });
      return;
    }
    
    const a = document.createElement('a');
    a.href = url;
    
    // 获取文件后缀名，默认为 mp3
    const extension = url.split('.').pop()?.split('?')[0] || 'mp3';
    // 移除文件名中的非法字符
    const sanitizedName = `${track.name} - ${track.artist.join(', ')}`.replace(/[\\/:*?"<>|]/g, '_');
    const fileName = `${sanitizedName}.${extension}`;
    
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    toast.success("开始下载", { id: toastId });
  } catch (error) {
    console.error("Download failed", error);
    toast.error("下载失败", { id: toastId });
  }
}
