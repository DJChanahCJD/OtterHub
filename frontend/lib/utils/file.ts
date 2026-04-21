import { FileMetadata, FileType } from "@shared/types";
import {
  getFileTypeByMimeOrName,
  getMimeTypeByExt,
} from "@shared/utils/file";
import { DIRECT_DOWNLOAD_LIMIT } from "../types";

export type { FileCategory } from "@shared/utils/file";
export { getFileCategoryByName } from "@shared/utils/file";

export const getFileType = (mimeType: string, fileName?: string): FileType => {
  return getFileTypeByMimeOrName(mimeType, fileName || "");
};

export const getFileTypeFromKey = (key: string): FileType => {
  const fileType = key.split(":")[0];
  return fileType as FileType;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function resizeImageToCanvas(
  img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  size = 224
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
  return canvas;
}

export function compressImageFromUrl(
  url: string,
  size = 224,
  quality = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = resizeImageToCanvas(img, size);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

const supportsFileSystemAccess = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      "showSaveFilePicker" in window &&
      window.self === window.top
    );
  } catch {
    return false;
  }
};

const supportsDirectoryPicker = (): boolean => {
  try {
    return (
      typeof window !== "undefined" &&
      "showDirectoryPicker" in window &&
      window.self === window.top
    );
  } catch {
    return false;
  }
};

const triggerAnchorDownload = (url: string, fileName: string): void => {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener,noreferrer";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 100);
};

const FS_CACHE_DB_NAME = "otterhub-fs-cache";
const FS_CACHE_STORE_NAME = "directory-handles";
const FS_CACHE_DIR_KEY = "download-dir";
const DIR_PICKER_ID = "otterhub-download-dir";

function openFsCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(FS_CACHE_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(FS_CACHE_STORE_NAME);
    };
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openFsCacheDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_CACHE_STORE_NAME, "readwrite");
    const store = tx.objectStore(FS_CACHE_STORE_NAME);
    const request = store.put(handle, FS_CACHE_DIR_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    db.close();
  });
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openFsCacheDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_CACHE_STORE_NAME, "readonly");
    const store = tx.objectStore(FS_CACHE_STORE_NAME);
    const request = store.get(FS_CACHE_DIR_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
    db.close();
  });
}

export async function clearDirectoryHandleCache(): Promise<void> {
  const db = await openFsCacheDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FS_CACHE_STORE_NAME, "readwrite");
    const store = tx.objectStore(FS_CACHE_STORE_NAME);
    const request = store.delete(FS_CACHE_DIR_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    db.close();
  });
}

async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  const options = readWrite ? { mode: "readwrite" as const } : {};
  const fsHandle = handle as unknown as {
    queryPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
    requestPermission(options?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  };

  if ((await fsHandle.queryPermission(options)) === "granted") {
    return true;
  }

  if ((await fsHandle.requestPermission(options)) === "granted") {
    return true;
  }

  return false;
}

async function pickDirectory(): Promise<DirectoryHandleResult | null> {
  try {
    const handle = await window.showDirectoryPicker!({
      id: DIR_PICKER_ID,
      mode: "readwrite",
      startIn: "downloads",
    });

    return {
      handle,
      reused: false,
      dirName: handle.name,
    };
  } catch {
    return null;
  }
}

export interface DirectoryHandleResult {
  handle: FileSystemDirectoryHandle;
  reused: boolean;
  dirName: string;
}

export async function getOrPickDirectory(): Promise<DirectoryHandleResult | null> {
  const saved = await loadDirectoryHandle();

  if (saved) {
    const ok = await verifyPermission(saved, true);
    if (ok) {
      return { handle: saved, reused: true, dirName: saved.name };
    }
  }

  return null;
}

export async function pickDownloadDirectoryForFirstTime(): Promise<DirectoryHandleResult | null> {
  try {
    const picked = await pickDirectory();
    if (!picked) return null;

    await saveDirectoryHandle(picked.handle);
    return picked;
  } catch {
    return null;
  }
}

export async function getOrRequestDirectory(): Promise<DirectoryHandleResult | null> {
  const cached = await getOrPickDirectory();
  if (cached) {
    return cached;
  }

  return pickDownloadDirectoryForFirstTime();
}

async function streamToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  url: string,
  fileName: string,
  onProgress?: (downloaded: number, total: number) => void,
): Promise<void> {
  const safeFileName = sanitizeFileName(fileName);
  const fileHandle = await dirHandle.getFileHandle(safeFileName, { create: true });
  const writable = await fileHandle.createWritable();

  const response = await fetch(url, { credentials: "include" });

  if (!response.ok || !response.body) {
    await writable.abort();
    throw new Error(`Download failed: ${response.status}`);
  }

  const total = Number(response.headers.get("Content-Length") || 0);

  if (!onProgress || !total) {
    await response.body.pipeTo(writable);
    return;
  }

  const reader = response.body.getReader();
  let downloaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await writable.write(value);
    downloaded += value.byteLength;
    onProgress(downloaded, total);
  }

  await writable.close();
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
}

export interface DownloadResult {
  status: "success" | "cancelled";
}

const CANCELLED_DOWNLOAD_RESULT: DownloadResult = { status: "cancelled" };
const SUCCESS_DOWNLOAD_RESULT: DownloadResult = { status: "success" };

const isDownloadCancelledError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return error instanceof Error && /abort|cancel/i.test(error.name);
};

export const downloadFile = async (
  url: string,
  metadata: FileMetadata,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<DownloadResult> => {
  if (!url) return SUCCESS_DOWNLOAD_RESULT;

  const { fileSize, fileName } = metadata;

  if (fileSize <= DIRECT_DOWNLOAD_LIMIT) {
    triggerAnchorDownload(url, fileName);
    return SUCCESS_DOWNLOAD_RESULT;
  }

  if (supportsDirectoryPicker()) {
    try {
      const result = await getOrRequestDirectory();
      if (!result) {
        return CANCELLED_DOWNLOAD_RESULT;
      }

      await streamToDirectory(result.handle, url, fileName, (downloaded, total) => {
        onProgress?.({
          downloaded,
          total,
          percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0,
        });
      });

      return SUCCESS_DOWNLOAD_RESULT;
    } catch (error) {
      if (isDownloadCancelledError(error)) {
        return CANCELLED_DOWNLOAD_RESULT;
      }
      throw error;
    }
  }

  if (supportsFileSystemAccess()) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const mimeType = ext ? getMimeTypeByExt(ext) : "";
    const acceptedMimeType =
      mimeType && mimeType !== "application/octet-stream" ? mimeType : undefined;
    try {
      const handle = await window.showSaveFilePicker!({
        suggestedName: fileName,
        types: acceptedMimeType
          ? [{
              description: "File",
              accept: { [acceptedMimeType]: [`.${ext}`] },
            }]
          : undefined,
      });

      const writable = await handle.createWritable();
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok || !response.body) {
        await writable.abort();
        throw new Error(`Download failed: ${response.status}`);
      }

      const total = Number(response.headers.get("Content-Length") || 0);

      if (!onProgress || !total) {
        await response.body.pipeTo(writable);
        return SUCCESS_DOWNLOAD_RESULT;
      }

      const reader = response.body.getReader();
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await writable.write(value);
        downloaded += value.byteLength;
        onProgress({
          downloaded,
          total,
          percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0,
        });
      }

      await writable.close();
      return SUCCESS_DOWNLOAD_RESULT;
    } catch (error) {
      if (isDownloadCancelledError(error)) {
        return CANCELLED_DOWNLOAD_RESULT;
      }
      throw error;
    }
  }

  triggerAnchorDownload(url, fileName);
  return SUCCESS_DOWNLOAD_RESULT;
};

export interface BatchDownloadOptions {
  files: Array<{ key: string; metadata: FileMetadata }>;
  getUrl: (key: string) => string;
  concurrency?: number;
  onProgress?: (fileIndex: number, fileName: string, progress: DownloadProgress) => void;
  onFileStart?: (fileIndex: number, fileName: string) => void;
  onFileComplete?: (fileIndex: number, fileName: string, success: boolean) => void;
  onDirectorySelected?: (dirName: string) => void;
  onDirectoryReused?: (dirName: string) => void;
}

export interface BatchDownloadResult {
  success: number;
  failed: number;
  cancelled: number;
}

const DEFAULT_CONCURRENCY = 3;
const DELAY_BETWEEN_DOWNLOADS = 100;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, "_")
    .replace(/[<>:"|?*\x00-\x1F]/g, "")
    .slice(0, 128);
}

async function downloadFilesToDirectory(
  files: Array<{ key: string; metadata: FileMetadata }>,
  getUrl: (key: string) => string,
  options: BatchDownloadOptions,
  dirHandleResult: DirectoryHandleResult,
): Promise<BatchDownloadResult> {
  const { onProgress, onFileStart, onFileComplete, onDirectorySelected, onDirectoryReused } = options;
  const result: BatchDownloadResult = { success: 0, failed: 0, cancelled: 0 };

  const { handle: dirHandle, reused, dirName } = dirHandleResult;

  if (reused) {
    onDirectoryReused?.(dirName);
  } else {
    onDirectorySelected?.(dirName);
  }

  for (let i = 0; i < files.length; i++) {
    const { key, metadata } = files[i];
    const { fileName } = metadata;

    onFileStart?.(i, fileName);

    try {
      const url = getUrl(key);
      await streamToDirectory(dirHandle, url, fileName, (downloaded, total) => {
        onProgress?.(i, fileName, {
          downloaded,
          total,
          percentage: total > 0 ? Math.round((downloaded / total) * 100) : 0,
        });
      });

      onFileComplete?.(i, fileName, true);
      result.success++;
    } catch (error) {
      if (isDownloadCancelledError(error)) {
        result.cancelled++;
      } else {
        result.failed++;
      }
      onFileComplete?.(i, fileName, false);
    }
  }

  return result;
}

async function downloadFilesWithAnchor(
  files: Array<{ key: string; metadata: FileMetadata }>,
  getUrl: (key: string) => string,
  options: BatchDownloadOptions,
): Promise<BatchDownloadResult> {
  const { concurrency = DEFAULT_CONCURRENCY, onProgress, onFileStart, onFileComplete } = options;
  const result: BatchDownloadResult = { success: 0, failed: 0, cancelled: 0 };

  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(async (file, batchIndex) => {
        const fileIndex = i + batchIndex;
        const { key, metadata } = file;
        const { fileName } = metadata;

        onFileStart?.(fileIndex, fileName);

        try {
          const url = getUrl(key);
          const downloadResult = await downloadFile(url, metadata, (progress) => {
            onProgress?.(fileIndex, fileName, progress);
          });

          const success = downloadResult.status === "success";
          onFileComplete?.(fileIndex, fileName, success);

          return success ? "success" : "cancelled";
        } catch (_error) {
          onFileComplete?.(fileIndex, fileName, false);
          return "failed";
        }
      })
    );

    for (const batchResult of batchResults) {
      if (batchResult.status === "fulfilled") {
        const status = batchResult.value;
        if (status === "success") result.success++;
        else if (status === "cancelled") result.cancelled++;
        else result.failed++;
      } else {
        result.failed++;
      }
    }

    if (i + concurrency < files.length) {
      await delay(DELAY_BETWEEN_DOWNLOADS);
    }
  }

  return result;
}

export interface DownloadFilesWithDirectoryOptions extends BatchDownloadOptions {
  dirHandleResult: DirectoryHandleResult;
}

export async function downloadFiles(
  options: BatchDownloadOptions | DownloadFilesWithDirectoryOptions
): Promise<BatchDownloadResult> {
  const { files, getUrl } = options;

  if (files.length === 0) {
    return { success: 0, failed: 0, cancelled: 0 };
  }

  if (supportsDirectoryPicker()) {
    // Check if dirHandleResult is provided
    if ('dirHandleResult' in options) {
      return downloadFilesToDirectory(files, getUrl, options, options.dirHandleResult);
    }
    
    // Try to get cached directory
    const cachedResult = await getOrPickDirectory();
    if (!cachedResult) {
      // No cached directory, caller should show guide
      throw new Error('NO_DIRECTORY_HANDLE');
    }
    
    return downloadFilesToDirectory(files, getUrl, options, cachedResult);
  }

  return downloadFilesWithAnchor(files, getUrl, options);
}
