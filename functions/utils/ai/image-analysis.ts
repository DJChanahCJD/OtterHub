import { FileMetadata } from "@shared/types";
import { buildTgFileUrl, getTgFilePath } from "@utils/db-adapter/tg-tools";

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

type AIImageSource = {
  previewFileId?: string | null;
};

/** 支持 AI 图片分析的图片 MIME 前缀 */
const SUPPORTED_IMAGE_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** AI 输入最大体积，避免 Worker 内存和请求体膨胀 */
const AI_INPUT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** AI 分析使用的 Cloudflare image-to-text 模型 */
const AI_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

/** AI 描述最大长度，避免 metadata 过大 */
const AI_DESC_MAX = 300;

/** 直接要求返回简短的一句话描述 */
const AI_OUTPUT_PROMPT = "Describe this image in one short sentence concisely. No markdown, no extra text, just the description.";

/**
 * 判断当前文件是否支持图片 AI 分析。
 */
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

/**
 * 将图片内容读取为 Uint8Array，供 Workers AI 调用。
 */
async function toUint8Array(file: File | Blob): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * 极简提取 AI 纯文本返回值。
 */
function extractImageAiDesc(result: unknown): string {
  if (typeof result === "string") return result;

  if (result && typeof result === "object" && !Array.isArray(result)) {
    const record = result as Record<string, unknown>;
    const text = record.response ?? record.description ?? record.text ?? record.result;
    if (typeof text === "string") return text;
  }

  return "";
}

/**
 * 清洗 AI 返回文本，避免写入过长或多行内容。
 */
function normalizeAiDesc(desc: string): string {
  return desc.replace(/\s+/g, " ").trim().slice(0, AI_DESC_MAX);
}

/**
 * 拉取 Telegram 预览图并校验体积，避免把过大的图片送入 AI。
 */
async function fetchTelegramPreviewBlob(
  botToken: string,
  previewFileId: string,
  key: string,
): Promise<Blob | null> {
  const filePath = await getTgFilePath(previewFileId, botToken);
  if (!filePath) {
    console.warn(`[AI] Preview file path not found for key: ${key}`);
    return null;
  }

  const previewUrl = buildTgFileUrl(botToken, filePath);
  const response = await fetch(previewUrl);
  if (!response.ok) {
    console.warn(`[AI] Preview fetch failed for key: ${key}, status: ${response.status}`);
    return null;
  }

  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  if (contentLength > AI_INPUT_MAX_BYTES) {
    console.warn(`[AI] Preview too large for key: ${key}, size: ${contentLength}`);
    return null;
  }

  const previewBlob = await response.blob();
  if (previewBlob.size > AI_INPUT_MAX_BYTES) {
    console.warn(`[AI] Preview blob too large for key: ${key}, size: ${previewBlob.size}`);
    return null;
  }

  return previewBlob;
}

/**
 * 选择用于 AI 分析的图片输入源：优先 TG 预览图，其次小体积原图。
 */
async function resolveAnalysisFile(
  env: AIEnv,
  key: string,
  file: File | Blob,
  metadata: FileMetadata,
  source: AIImageSource,
): Promise<File | Blob | null> {
  if (source.previewFileId && env.TG_BOT_TOKEN) {
    const previewBlob = await fetchTelegramPreviewBlob(env.TG_BOT_TOKEN, source.previewFileId, key);
    if (previewBlob) {
      return previewBlob;
    }
  }

  const originalSize = file.size || metadata.fileSize;
  if (originalSize > AI_INPUT_MAX_BYTES) {
    console.warn(`[AI] Skip original image for key: ${key}, size: ${originalSize}`);
    return null;
  }

  return file;
}

/**
 * 调用 Cloudflare Workers AI，返回清洗后的单行描述。
 */
async function runAIAnalysis(ai: WorkersAI, file: File | Blob): Promise<string> {
  const imageData = await toUint8Array(file);
  const result = await ai.run(AI_MODEL, {
    image: Array.from(imageData),
    prompt: AI_OUTPUT_PROMPT,
    max_tokens: 100,
  });

  return normalizeAiDesc(extractImageAiDesc(result));
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
  source: AIImageSource = {},
): Promise<void> {
  if (!env.AI) return;

  try {
    const analysisFile = await resolveAnalysisFile(env, key, file, metadata, source);
    if (!analysisFile) {
      return;
    }

    const desc = await runAIAnalysis(env.AI, analysisFile);
    if (!desc) {
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
      aiDesc: desc,
    };

    await kv.put(key, latest.value ?? "", { metadata: updatedMeta });

    // // 如需通知 TG 可取消注释
    // if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
    //   const tgUrl = buildTgApiUrl(env.TG_BOT_TOKEN, "sendMessage");
    //   fetch(tgUrl, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: `🤖 ${desc}` }),
    //   }).catch(console.warn);
    // }

    console.log(`[AI] Enriched key: ${key}, desc: ${desc.slice(0, 60)}...`);
  } catch (err) {
    console.warn(`[AI] Analysis failed for key: ${key}`, err);
  }
}
