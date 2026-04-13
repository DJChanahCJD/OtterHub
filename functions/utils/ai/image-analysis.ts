import { FileMetadata, MAX_DESC_LENGTH } from "@shared/types";
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
  tgFileId?: string | null; // 用于兜底的原图 ID
};

const SUPPORTED_IMAGE_PREFIXES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const AI_INPUT_MAX_BYTES = 5 * 1024 * 1024; // 仅用于内存文件的兜底限制
const AI_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const AI_OUTPUT_PROMPT =
  "Output 5-10 comma-separated visual tags for search. " +
  "Order: subject, action, objects, scene, color, style. " +
  "Use concrete nouns. Skip vague words, minor details, and duplicates. " +
  "NO sentences, markdown, or explanations.";

export function isSupportedImage(mimeType?: string | null, fileName?: string): boolean {
  if (mimeType) return SUPPORTED_IMAGE_PREFIXES.some((p) => mimeType.startsWith(p));
  if (fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
  }
  return false;
}

function extractImageDesc(result: unknown): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const record = result as Record<string, unknown>;
    const text = record.response ?? record.description ?? record.text ?? record.result;
    if (typeof text === "string") return text;
  }
  return "";
}

function normalizeDesc(desc: string): string {
  const parsedTags = desc
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5,\s-]/g, "") // 仅保留字母数字、中文、逗号、空格、连字符
    .split(",")
    .map(tag => tag.trim().slice(0, 24))       // 限制单个 tag 长度，防止长句污染
    .filter(Boolean);                          // 过滤空值

  // 使用 Set 去重，再重新拼接并限制总长度
  return Array.from(new Set(parsedTags))
    .join(", ")
    .slice(0, MAX_DESC_LENGTH);
}

/**
 * 核心优化：利用 CF 边缘节点拉取并实时压缩图片，返回轻量级 ArrayBuffer
 */
async function fetchResizedImageBuffer(botToken: string, fileId: string): Promise<ArrayBuffer | null> {
  const filePath = await getTgFilePath(fileId, botToken);
  if (!filePath) return null;

  const url = buildTgFileUrl(botToken, filePath);
  
  // 利用 Cloudflare Image Resizing，将压缩计算卸载到边缘节点
  const res = await fetch(url, {
    cf: {
      image: {
        width: 1024,
        height: 1024,
        fit: "scale-down",
        format: "jpeg",
        quality: 75,
      },
    },
  } as RequestInit); // 断言以规避 TS 对 cf 字段的报错

  return res.ok ? res.arrayBuffer() : null;
}

/**
 * 获取用于 AI 分析的图像内存流。优先 CF 压缩网络图，回退小体积本地图。
 */
async function resolveAnalysisBuffer(
  env: AIEnv,
  file: File | Blob,
  source: AIImageSource
): Promise<ArrayBuffer | null> {
  const targetId = source.previewFileId || source.tgFileId;

  // 1. 优先走 Cloudflare Resizing 链路 (无论原图多大，出来的都是小图)
  if (env.TG_BOT_TOKEN && targetId) {
    try {
      const buffer = await fetchResizedImageBuffer(env.TG_BOT_TOKEN, targetId);
      if (buffer) return buffer;
    } catch (err) {
      console.warn("[AI] CF Resize fetch failed, falling back to memory file:", err);
    }
  }

  // 2. 网络链路失败时，兜底使用当前内存中的 file 对象 (仅限小于 5MB)
  if (file.size <= AI_INPUT_MAX_BYTES) {
    return file.arrayBuffer();
  }

  return null;
}

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
    const buffer = await resolveAnalysisBuffer(env, file, source);
    if (!buffer) {
      console.warn(`[AI] Skip enrich: No suitable image buffer resolved for key: ${key}`);
      return;
    }

    const result = await env.AI.run(AI_MODEL, {
      image: Array.from(new Uint8Array(buffer)), 
      prompt: AI_OUTPUT_PROMPT,
      max_tokens: 100,
    });

    const desc = normalizeDesc(extractImageDesc(result));
    if (!desc) return;

    const latest = await kv.getWithMetadata<FileMetadata>(key);
    if (!latest?.metadata) {
      console.warn(`[AI] Skip enrich for missing key: ${key}`);
      return;
    }

    // 仅追加或更新 desc，保留原有的 metadata 和 tags
    const updatedMeta: FileMetadata = {
      ...latest.metadata,
      desc: desc,
    };

    await kv.put(key, latest.value ?? "", { metadata: updatedMeta });

    // 可选：通知 TG
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