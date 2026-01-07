import * as nsfwjs from "nsfwjs";
import * as tf from "@tensorflow/tfjs";
import { MAX_FILE_SIZE } from "./types";

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

class NSFWDetector {
  private model?: nsfwjs.NSFWJS;
  private loading?: Promise<nsfwjs.NSFWJS>;

  private async getModel() {
    if (this.model) return this.model;
    if (!this.loading) {
      this.loading = nsfwjs.load(MODEL_PATH).then((m) => (this.model = m));
    }
    return this.loading;
  }

  async detect(
    el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
  ): Promise<boolean> {
    try {
      const model = await this.getModel();
      const predictions = await model.classify(el);
      /*
        [
          ({ className: "Sexy", probability: 0.9975076913833618 },
          { className: "Neutral", probability: 0.0015533771365880966 },
          { className: "Porn", probability: 0.0009368911851197481 },
          { className: "Hentai", probability: 0.0000010140705626326962 },
          { className: "Drawing", probability: 9.612167559680529e-7 })
        ];
      */
      const prob = (cls: NSFWClass) =>
        predictions.find((p) => p.className === cls)?.probability ?? 0;

      const porn = prob(NSFWClass.Porn);
      const hentai = prob(NSFWClass.Hentai);
      const sexy = prob(NSFWClass.Sexy);
      const neutral = prob(NSFWClass.Neutral);
      const drawing = prob(NSFWClass.Drawing);

      // 核心评分
      const hardUnsafeScore = porn + hentai;
      const softUnsafeScore = sexy * (1 - neutral);

      const isUnsafe = hardUnsafeScore >= 0.4 || hardUnsafeScore + softUnsafeScore >= 1;

      // console.table({
      //   porn,
      //   hentai,
      //   sexy,
      //   neutral,
      //   drawing,
      //   hardUnsafeScore,
      //   softUnsafeScore,
      //   isUnsafe,
      // });

      return isUnsafe;
    } catch {
      return false;
    }
  }

  async isUnsafeImg(file: File): Promise<boolean> {
    if (file.type.indexOf("image") === -1 || file.size > MAX_FILE_SIZE) { // 只检测＜20MB的图片文件
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
      return await this.detect(img);
    } catch {
      return false;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export const nsfwDetector = new NSFWDetector();
