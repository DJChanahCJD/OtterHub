/**
 * 计算需要上传的分片索引
 */
export function getMissingChunkIndices(
  totalChunks: number,
  uploadedIndices: number[] = [],
): number[] {
  const uploadedSet = new Set(uploadedIndices)
  const result: number[] = []

  for (let i = 0; i < totalChunks; i++) {
    if (!uploadedSet.has(i)) result.push(i)
  }

  return result
}

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
 * 并发分批执行任务
 */
export async function runBatches(
  indices: number[],
  batchSize: number,
  task: (idx: number) => Promise<void>,
) {
  for (let i = 0; i < indices.length; i += batchSize) {
    const batch = indices.slice(i, i + batchSize)
    await Promise.all(batch.map(task))
  }
}