import { processBatch } from "./common";

/**
 * 递归扫描 DataTransferItemList 中的所有文件
 * 支持文件夹拖拽上传，并保留文件路径结构
 * 
 * @param items DataTransferItemList 拖拽项列表
 * @param onProgress 进度回调 (仅针对顶层项目)
 */
export async function scanFiles(
  items: DataTransferItemList,
  onProgress?: (current: number, total: number) => void
): Promise<File[]> {
  const files: File[] = [];

  // 获取所有顶层条目
  const entries = Array.from(items)
    .map((item) => {
      // webkitGetAsEntry 是非标准 API，但在 Chrome/Firefox/Safari 中广泛支持
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      return entry;
    })
    .filter((entry): entry is FileSystemEntry => entry !== null);

  // 分批并发遍历所有顶层条目，避免主线程长时间阻塞
  await processBatch(entries, (entry) => traverse(entry), onProgress, 10);

  return files;

  /**
   * 递归遍历文件系统条目
   */
  async function traverse(entry: FileSystemEntry) {
    if (entry.isFile) {
      await processFile(entry as FileSystemFileEntry);
    } else if (entry.isDirectory) {
      await processDirectory(entry as FileSystemDirectoryEntry);
    }
  }

  /**
   * 处理单个文件
   * 将文件重命名为包含完整路径的名称
   */
  function processFile(entry: FileSystemFileEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      entry.file(
        (file) => {
          // entry.fullPath 通常以 / 开头，例如 "/folder/file.txt"
          // 我们去掉开头的 /，保留 "folder/file.txt"
          const path = entry.fullPath.replace(/^\//, "");
          
          // 创建新文件对象以保留路径信息
          // 注意：File 构造函数在部分旧浏览器可能不支持，但在现代浏览器中可用
          const fileWithPath = new File([file], path, {
            type: file.type,
            lastModified: file.lastModified,
          });
          
          files.push(fileWithPath);
          resolve();
        },
        (err) => {
          console.warn(`读取文件失败: ${entry.fullPath}`, err);
          // 忽略错误，继续处理其他文件
          resolve();
        }
      );
    });
  }

  /**
   * 处理目录
   * 使用 readEntries 分批读取目录内容
   */
  async function processDirectory(entry: FileSystemDirectoryEntry) {
    const reader = entry.createReader();
    
    // readEntries 可能不会一次返回所有文件，需要循环读取
    const readEntries = () =>
      new Promise<FileSystemEntry[]>((resolve, reject) => {
        reader.readEntries(resolve, (err) => {
          console.warn(`读取目录失败: ${entry.fullPath}`, err);
          resolve([]); // 忽略错误
        });
      });

    try {
      let batch = await readEntries();
      while (batch.length > 0) {
        // 使用 processBatch 分批处理子条目，避免一次性并发过多请求
        await processBatch(batch, (child) => traverse(child));
        batch = await readEntries();
      }
    } catch (err) {
      console.warn(`处理目录出错: ${entry.fullPath}`, err);
    }
  }
}
