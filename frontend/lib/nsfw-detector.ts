import * as nsfwjs from "nsfwjs";
import * as tf from "@tensorflow/tfjs";
import { MAX_CHUNK_SIZE } from "./types";

tf.enableProdMode();

export enum NSFWClass {
  Drawing = "Drawing",
  Hentai = "Hentai",
  Neutral = "Neutral",
  Porn = "Porn",
  Sexy = "Sexy",
}

export interface NSFWResult {
  isUnsafe: boolean;
  predictions: { className: NSFWClass; probability: number }[];
}

// https://nsfwjs.com/
const MODEL_PATH = "MobileNetV2Mid";

type ProbMap = Record<NSFWClass, number>;

// 将 predictions 转换为概率映射（一次遍历，O(n)）
function toProbMap(predictions: nsfwjs.PredictionType[]): ProbMap {
  const map: ProbMap = {
    Drawing: 0,
    Hentai: 0,
    Neutral: 0,
    Porn: 0,
    Sexy: 0,
  };

  for (const p of predictions) {
    map[p.className as NSFWClass] = p.probability;
  }
  return map;
}

function judgeUnsafe(p: ProbMap): boolean {
  const hard = p.Porn + p.Hentai; // 硬色情概率
  const soft = p.Sexy * (1 - p.Neutral); // 软色情概率

  return hard * 3 + soft >= 1;
}

// 模型 warm-up：提升首帧性能
async function warmupModel(model: nsfwjs.NSFWJS) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 224;
  try {
    await model.classify(canvas);
  } catch {
    // warm-up 失败不影响主流程
  }
}

// 图片尺寸缩放：提升检测性能
function resizeImage(img: HTMLImageElement, size = 224): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

class NSFWDetector {
  private model?: nsfwjs.NSFWJS;
  private loading?: Promise<nsfwjs.NSFWJS>;

  private async getModel() {
    if (this.model) return this.model;
    if (!this.loading) {
      this.loading = nsfwjs.load(MODEL_PATH).then(async (m) => {
        await warmupModel(m);
        return m;
      });
    }
    return this.loading;
  }

  async detect(
    el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<boolean> {
    try {
      const model = await this.getModel();
      const predictions = await model.classify(el);

      const prob = toProbMap(predictions);
      const isUnsafe = judgeUnsafe(prob);

      // 仅开发环境输出详细日志
      if (process.env.NODE_ENV === "development") {
        console.table({
          ...prob,
          isUnsafe,
        });
      }

      return isUnsafe;
    } catch (err) {
      console.warn("NSFW detect failed:", err);
      return false;
    }
  }

  async isUnsafeImg(file: File): Promise<boolean> {
    if (file.type.indexOf("image") === -1 || file.size > MAX_CHUNK_SIZE) { // 只检测＜20MB的图片文件
      return false;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);

    try {
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej();
        img.src = url;
      });
      // 使用缩放后的图片进行检测
      const canvas = resizeImage(img);
      return await this.detect(canvas);
    } catch {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export const nsfwDetector = new NSFWDetector();
