import { MusicTrack } from "@shared/types";
import { toast } from "sonner";
import { musicApi } from "../music-api";
import { API_URL } from "../api/config";

/**
 * 下载音乐（智能模式）
 * 1. 直接下载（快）
 * 2. 失败自动代理（稳）
 */
export async function downloadMusicTrack(track: MusicTrack) {
  const toastId = toast.loading(`准备下载: ${track.name}`);

  try {
    const url = await musicApi.getUrl(track.id, track.source);
    if (!url) throw new Error("无法获取下载链接");

    const filename = sanitizeFilename(
      `${track.artist?.join(",") || "Unknown"} - ${track.name}.mp3`
    );

    // ---------- 尝试前端直连 ----------
    try {
      await directDownload(url, filename, toastId);
      return;
    } catch {
      // 直连失败进入代理
      console.warn("Direct download failed → fallback proxy");
    }

    // ---------- 代理下载（稳定） ----------
    proxyDownload(url, filename);

    toast.success("已使用稳定下载通道", { id: toastId });

  } catch (error) {
    console.error(error);
    toast.error("下载失败", { id: toastId });
  }
}

/* ================= 工具函数 ================= */

/** 直接浏览器下载（最快） */
async function directDownload(url: string, filename: string, toastId: string | number) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok || !res.body) throw new Error("CORS blocked");

  // ⚠ 不缓存 chunks，直接 blob() 最省内存
  const blob = await res.blob();

  const blobUrl = URL.createObjectURL(blob);
  triggerDownload(blobUrl, filename);
  URL.revokeObjectURL(blobUrl);

  toast.success("下载完成", { id: toastId });
}

/** 代理下载（最稳定） */
function proxyDownload(url: string, filename: string) {
  const proxy = `${API_URL}/proxy/download?url=${encodeURIComponent(
    url
  )}&filename=${encodeURIComponent(filename)}`;

  triggerDownload(proxy, filename);
}

/** 触发下载 */
function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 清理非法文件名 */
function sanitizeFilename(name: string) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}
