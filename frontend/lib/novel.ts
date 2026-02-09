/**
 * 小说模式工具类
 * 用于将多个 .txt 或 .md 文件合并为一个 Markdown 文件
 */

/**
 * 将多个文本文件合并为一个 Markdown 文件
 * 
 * @param files 要合并的文件列表
 * @param progressCallback 进度回调
 * @returns 合并后的新 File 对象
 */
export async function createNovelFromTexts(
  files: File[],
  progressCallback?: (current: number, total: number) => void,
  sort: boolean = true
): Promise<File> {
  const processedFiles = sort ? sortFilesByName(files) : files;
  const total = processedFiles.length;
  const contents: string[] = [];

  for (let i = 0; i < total; i++) {
    const file = processedFiles[i];
    try {
      const text = await file.text();
      const fileNameWithoutExt = getFileNameWithoutExt(file.name);
      
      // 添加章节标题和内容
      // 使用 Markdown 格式，方便预览和阅读
      contents.push(`# ${fileNameWithoutExt}\n\n${text}\n\n---\n`);
      
      if (progressCallback) {
        progressCallback(i + 1, total);
      }
    } catch (err) {
      console.error(`Failed to read text file ${file.name}:`, err);
    }
  }

  const mergedContent = contents.join('\n');
  const baseName = getBaseName(processedFiles);
  const fileName = `${baseName}.md`;

  return new File([mergedContent], fileName, { type: 'text/markdown' });
}

/**
 * 自然排序：处理带有数字的文件名，确保 "Chapter 2" 在 "Chapter 10" 之前
 */
function sortFilesByName(files: File[]): File[] {
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return [...files].sort((a, b) => collator.compare(a.name, b.name));
}

function getFileNameWithoutExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
}

function getBaseName(files: File[]): string {
  if (files.length === 0) return 'novel';
  const name = files[0].name;
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(0, lastDot) : name;
}
