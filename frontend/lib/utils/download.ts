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
    const baseUrl = API_URL || '';
    const filename = `${track.name} - ${track.artist.join(',')}.mp3`;
    // const proxyUrl = `${baseUrl}/proxy/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    toast.loading(`正在下载: ${track.name}... 0%`, { id: toastId });

    // Use fetch + Blob for "Pure Frontend" download experience
    // This allows better progress tracking and custom filename support
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;

    const reader = response.body?.getReader();
    if (!reader) throw new Error('浏览器不支持流式下载');

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        loaded += value.length;
        if (total > 0) {
          const progress = Math.round((loaded / total) * 100);
          toast.loading(`正在下载: ${track.name}... ${progress}%`, { id: toastId });
        }
      }
    }

    const blob = new Blob(chunks, { type: response.headers.get('content-type') || 'audio/mpeg' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Trigger download
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up object URL
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    
    toast.success("下载完成", { id: toastId });
  } catch (error) {
    console.error("Download failed", error);
    toast.error("下载失败", { id: toastId });
  }
}
