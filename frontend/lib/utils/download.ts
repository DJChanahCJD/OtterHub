import { musicApi } from "@/lib/music-api";
import { toast } from "sonner";
import { API_URL } from "@/lib/api/config";
import { MusicTrack } from "@shared/types";

export async function downloadMusicTrack(track: MusicTrack) {
  const toastId = toast.loading(`正在获取下载链接: ${track.name}`);
  try {
    const url = await musicApi.getUrl(track.id, track.source);
    if (!url) {
      toast.error("无法获取下载链接", { id: toastId });
      return;
    }
    
    // Construct Proxy URL
    // If API_URL is empty (relative), use current origin? Or just path.
    // The app.ts mounts proxy at /proxy.
    const baseUrl = API_URL || '';
    const filename = `${track.name} - ${track.artist.join(',')}.mp3`;
    const proxyUrl = `${baseUrl}/proxy/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    // Trigger download
    const a = document.createElement('a');
    a.href = proxyUrl;
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
