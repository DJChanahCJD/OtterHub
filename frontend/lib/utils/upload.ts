/**
 * 更新上传进度
 */
export function updateProgress(
  map: Record<string, number>,
  key: string,
  uploaded: number,
  total: number,
  setProgress: (v: Record<string, number>) => void,
) {
  map[key] = Math.round((uploaded / total) * 100)
  setProgress({ ...map })
}

/**
 * 计算需要上传的分片索引
 * @param totalChunks 总分片数
 * @param uploadedIndices 已上传的分片索引列表
 */
export function getMissingChunkIndices(
  totalChunks: number,
  uploadedIndices: number[] = [],
): number[] {
  const uploadedSet = new Set(uploadedIndices);
  const result: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    if (!uploadedSet.has(i)) result.push(i);
  }

  return result;
}