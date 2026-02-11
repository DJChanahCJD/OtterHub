import { PDFDocument } from 'pdf-lib';

interface NormalizedImage {
  bytes: ArrayBuffer;
  type: 'png' | 'jpg';
  width: number;
  height: number;
}

/**
 * 将多张图片合并为一个 PDF 文件
 * 
 * 优化策略：
 * 1. 预处理管线：File -> ImageBitmap -> Normalized Buffer (PNG/JPG)
 * 2. 并发控制：分批预处理 (CPU密集)，串行嵌入 (内存密集)
 * 3. 内存安全：及时释放 Buffer，定期 GC/Idle
 * 4. 避免重复解码：直接获取 ImageBitmap 尺寸，只在必要时转码
 */
export async function createPdfFromImages(
  files: File[], 
  progressCallback?: (current: number, total: number) => void,
  sort: boolean = true
): Promise<File> {
  const pdfDoc = await PDFDocument.create();
  const processedFiles = sort ? sortFilesByName(files) : files;
  const total = processedFiles.length;
  
  // 批处理大小：既要利用并发加速解码，又要防止内存爆炸
  const BATCH_SIZE = 5;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batchFiles = processedFiles.slice(i, i + BATCH_SIZE);
    
    // 阶段 1: 并发预处理 (解码/转码)
    // 这一步利用 createImageBitmap 的并行能力
    const normalizedBatch = await Promise.all(
      batchFiles.map(file => normalizeImage(file).catch(err => {
        console.error(`Failed to normalize ${file.name}:`, err);
        return null;
      }))
    );

    // 阶段 2: 串行嵌入 (Embed + AddPage)
    // 必须串行以保持页面顺序，且 pdf-lib 的 embed 操作是内存密集的
    for (let j = 0; j < normalizedBatch.length; j++) {
      const img = normalizedBatch[j];
      const originalIndex = i + j;

      if (!img) {
        // 失败处理：如果预处理失败，跳过该页或插入错误占位？
        // 目前策略是跳过，并记录日志
        continue;
      }

      try {
        let embeddedImage;
        if (img.type === 'jpg') {
          embeddedImage = await pdfDoc.embedJpg(img.bytes);
        } else {
          embeddedImage = await pdfDoc.embedPng(img.bytes);
        }

        // 这里的 width/height 已经是我们预处理时获取的准确尺寸
        // 不需要再调用 embeddedImage.scale(1) (它会触发 pdf-lib 内部解码)
        const page = pdfDoc.addPage([img.width, img.height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        });

      } catch (e) {
        console.error(`Failed to embed image index ${originalIndex}`, e);
      }
      
      // 报告进度
      if (progressCallback) {
        progressCallback(originalIndex + 1, total);
      }
    }

    // 阶段 3: 内存安全与防卡顿
    // 每处理完一批，让出主线程，允许 UI 更新和 GC 介入
    await requestIdle();
  }

  // 额外优化：设置元数据
  pdfDoc.setTitle(getBaseName(processedFiles));
  pdfDoc.setProducer('Browser Image2PDF');
  pdfDoc.setCreator('OtterHub');

  const pdfBytes = await pdfDoc.save();
  
  const baseName = getBaseName(processedFiles);
  const fileName = `${baseName}.pdf`;

  return new File([pdfBytes], fileName, { type: 'application/pdf' });
}

/**
 * 图片标准化管线
 * 目标：输出可直接嵌入 PDF 的 Buffer (JPG/PNG) 和尺寸信息
 */
async function normalizeImage(file: File): Promise<NormalizedImage> {
  // 路径 A: 原生支持格式 (JPG/PNG)
  // 直接读取 Buffer，只用 createImageBitmap 获取尺寸 (极快)
  if (file.type === 'image/jpeg' || file.type === 'image/jpg' || file.type === 'image/png') {
    // 并行执行：读文件 + 解码头部信息
    const [bytes, bitmap] = await Promise.all([
      file.arrayBuffer(),
      createImageBitmap(file) // 仅解码 metadata，比 Image.src 快得多
    ]);
    
    const width = bitmap.width;
    const height = bitmap.height;
    
    // 立即关闭 bitmap 释放内存
    bitmap.close();

    return {
      bytes,
      type: file.type === 'image/png' ? 'png' : 'jpg',
      width,
      height
    };
  }

  // 路径 B: 需要转码格式 (WebP, GIF, BMP 等)
  // 转码为 JPEG 以节省体积和内存
  return convertWebpToJpeg(file);
}

/**
 * WebP → JPEG (保持有损压缩，避免PNG膨胀)
 * 自动质量控制，目标 ≤ 原大小 1.5x
 */
async function convertWebpToJpeg(file: File): Promise<NormalizedImage> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  let ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas context null');
  }

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  // 原始大小
  const originalSize = file.size;

  // 辅助函数：将 canvas 转换为 Blob
  const getBlob = async (quality: number): Promise<Blob> => {
    if (canvas instanceof OffscreenCanvas) {
      return canvas.convertToBlob({
        type: 'image/jpeg',
        quality
      });
    } else {
      return new Promise<Blob>((resolve, reject) => {
        (canvas as HTMLCanvasElement).toBlob(
          blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          },
          'image/jpeg',
          quality
        );
      });
    }
  };

  // 二分搜索最佳质量
  let qMin = 0.6;
  let qMax = 0.95;
  let bestBlob: Blob | null = null;

  // 尝试最多 6 次
  for (let i = 0; i < 6; i++) {
    const q = (qMin + qMax) / 2;
    const blob = await getBlob(q);

    if (blob.size <= originalSize * 1.5) {
      bestBlob = blob;
      qMin = q; // 尝试更高质量
    } else {
      qMax = q; // 质量太高导致体积过大，降低质量
    }
  }

  const finalBlob = bestBlob ?? await getBlob(0.75);
  const bytes = await finalBlob.arrayBuffer();

  return {
    bytes,
    type: 'jpg',
    width,
    height
  };
}

function sortFilesByName(files: File[]): File[] {
  return [...files].sort((a, b) => {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

function getBaseName(files: File[]): string {
  if (files.length === 0) return 'merged';
  const name = files[0].name;
  const lastDot = name.lastIndexOf('.');
  return lastDot > 0 ? name.substring(0, lastDot) : name;
}

/**
 * 智能空闲等待
 * 优先使用 requestIdleCallback，回退到 setTimeout
 */
async function requestIdle(): Promise<void> {
  if (typeof window.requestIdleCallback !== 'undefined') {
    return new Promise(resolve => window.requestIdleCallback(() => resolve()));
  }
  return new Promise(resolve => setTimeout(resolve, 1)); // 稍微给多一点时间 1ms
}
