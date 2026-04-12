import { FileMetadata } from "@shared/types";
import { buildTgApiUrl } from "@utils/db-adapter/tg-tools";

type WorkersAI = {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
};

type AIEnv = {
  AI?: WorkersAI;
  TG_BOT_TOKEN?: string;
  TG_CHAT_ID?: string;
};

type KVWithMetadata = {
  put(key: string, value: unknown, opts?: unknown): Promise<void>;
  getWithMetadata<T = unknown>(key: string): Promise<{ value: unknown; metadata: T | null }>;
};

/** 支持 AI 图片分析的图片 MIME 前缀 */
const SUPPORTED_IMAGE_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** AI 分析使用的 Cloudflare image-to-text 模型 */
const AI_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

/** AI 描述最大长度，避免 metadata 过大 */
const AI_CAPTION_MAX = 300;

/** 直接要求返回简短的一句话描述 */
const AI_OUTPUT_PROMPT = "Describe this image in one short sentence concisely. No markdown, no extra text, just the description.";

export function isSupportedImage(mimeType: string | null | undefined, fileName?: string): boolean {
  if (mimeType) {
    return SUPPORTED_IMAGE_PREFIXES.some((prefix) => mimeType.startsWith(prefix));
  }
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase();
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext ?? "");
  }
  return false;
}

async function toUint8Array(file: File | Blob): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 极简提取 AI 纯文本返回值
 */
function extractaiDesc(result: unknown): string {
  if (typeof result === "string") return result;
  
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const record = result as Record<string, unknown>;
    const text = record.response ?? record.description ?? record.text ?? record.result;
    if (typeof text === "string") return text;
  }
  
  return "";
}

/**
 * 调用 Cloudflare Workers AI，返回清洗后的单行描述
 */
async function runAIAnalysis(ai: WorkersAI, imageData: Uint8Array): Promise<string> {
  const result = await ai.run(AI_MODEL, {
    image: Array.from(imageData),
    prompt: AI_OUTPUT_PROMPT,
    max_tokens: 100,
  });

  const caption = extractaiDesc(result);
  return caption.replace(/\s+/g, " ").trim().slice(0, AI_CAPTION_MAX);
}

/**
 * 对图片文件执行 AI 分析并将结果写回 KV metadata。
 */
export async function analyzeImageAndEnrich(
  env: AIEnv,
  kv: KVWithMetadata,
  key: string,
  file: File | Blob,
  metadata: FileMetadata,
): Promise<void> {
  if (!env.AI) return;

  try {
    const imageData = await toUint8Array(file);
    const caption = await runAIAnalysis(env.AI, imageData);

    if (!caption) {
      console.warn(`[AI] Empty result for key: ${key}`);
      return;
    }

    const latest = await kv.getWithMetadata<FileMetadata>(key);
    if (!latest?.metadata) {
      console.warn(`[AI] Skip enrich for missing key: ${key}`);
      return;
    }

    // 仅追加或更新 aiDesc，保留原有的 metadata 和 tags
    const updatedMeta: FileMetadata = {
      ...latest.metadata,
      aiDesc: caption,
    };

    await kv.put(key, latest.value ?? "", { metadata: updatedMeta });

    // // 如需通知 TG 可取消注释
    // if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    //   const tgUrl = buildTgApiUrl(env.TG_BOT_TOKEN, "sendMessage");
    //   fetch(tgUrl, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: `🤖 ${caption}` }),
    //   }).catch(console.warn);
    // }

    console.log(`[AI] Enriched key: ${key}, caption: ${caption.slice(0, 60)}...`);
  } catch (err) {
    console.warn(`[AI] Analysis failed for key: ${key}`, err);
  }
}