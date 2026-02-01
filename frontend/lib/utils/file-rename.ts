import { FileItem } from "@shared/types";

export type BatchRenameMode = "none" | "prefix" | "suffix" | "basename";

export interface BatchRenamePayload {
  mode: BatchRenameMode;
  value: string;
}

/**
 * 核心重命名逻辑 - 20行纯函数
 * @param original 原始文件名
 * @param payload 重命名参数
 * @returns 新文件名
 */
export function renameFileName(
  original: string,
  payload: BatchRenamePayload,
): string {
  if (payload.mode === "none" || !payload.value) {
    return original;
  }

  const dot = original.lastIndexOf(".");
  const hasExt = dot > 0;

  const name = hasExt ? original.slice(0, dot) : original;
  const ext = hasExt ? original.slice(dot) : "";

  switch (payload.mode) {
    case "prefix":
      return payload.value + original;

    case "suffix":
      return name + payload.value + ext;

    case "basename":
      return payload.value + ext;

    default:
      return original;
  }
}

/**
 * 检查是否有重命名变更
 * @param files 文件列表
 * @param payload 重命名参数
 * @returns 是否有变更
 */
export function hasRenameChange(
  files: FileItem[],
  payload: BatchRenamePayload,
): boolean {
  if (payload.mode === "none" || !payload.value) return false;

  return files.some((f) => {
    const next = renameFileName(f.metadata.fileName, payload);
    return next !== f.metadata.fileName;
  });
}

/**
 * 预览重命名结果（只返回前N个）
 * @param files 文件列表
 * @param payload 重命名参数
 * @param limit 最大预览数量
 * @returns 预览数组
 */
export function previewRename(
  files: FileItem[],
  payload: BatchRenamePayload,
  limit = 5,
): Array<{ original: string; renamed: string }> {
  return files.slice(0, limit).map((f) => ({
    original: f.metadata.fileName,
    renamed: renameFileName(f.metadata.fileName, payload),
  }));
}
