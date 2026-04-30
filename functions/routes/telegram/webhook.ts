import { Hono } from "hono";
import { FileMetadata } from "@shared/types";
import type { Env } from "../../types/hono";
import { authMiddleware } from "../../middleware/auth";
import { buildKeyId } from "@utils/file";
import { fail, ok } from "@utils/response";
import {
  buildTgApiUrl,
  buildTelegramDirectLink,
  getTelegramFileFromMessage,
  sendTelegramUploadNotice,
  shouldNotifyTelegramUpload,
} from "@utils/db-adapter/tg-tools";

export const telegramWebhookRoutes = new Hono<{ Bindings: Env }>();

telegramWebhookRoutes.use("/webhook/setup", authMiddleware);
telegramWebhookRoutes.use("/webhook/info", authMiddleware);

/**
 * Telegram webhook 健康检查入口。
 */
telegramWebhookRoutes.get("/webhook", async (c) => {
  return ok(c, {
    ready: true,
    endpoint: new URL(c.req.url).pathname,
  });
});

/**
 * 接收 Telegram message/channel_post 并将媒体 file_id 注册到 OtterHub KV。
 */
telegramWebhookRoutes.post("/webhook", async (c) => {
  if (!c.env.TG_BOT_TOKEN) {
    return fail(c, "TG_BOT_TOKEN is not configured", 500);
  }

  const expectedSecret = c.env.TG_WEBHOOK_SECRET;
  if (expectedSecret) {
    const headerSecret = c.req.header("X-Telegram-Bot-Api-Secret-Token") || "";
    if (headerSecret !== expectedSecret) {
      return fail(c, "Invalid webhook secret", 401);
    }
  }

  const update = await c.req.json().catch(() => null);
  if (!update) {
    return fail(c, "Invalid JSON body", 400);
  }

  const message = update?.message || update?.channel_post;
  if (!message) {
    return ok(c, { ignored: "no-message" });
  }

  const media = getTelegramFileFromMessage(message);
  if (!media) {
    return ok(c, { ignored: "message-without-file" });
  }

  const key = buildKeyId(media.fileType, media.fileId, media.ext);
  const metadata: FileMetadata = {
    fileName: media.fileName,
    fileSize: media.fileSize,
    uploadedAt: Date.now(),
    liked: false,
    thumbUrl: media.previewFileId
      ? `/file/${media.previewFileId}/thumb`
      : undefined,
  };

  await c.env.oh_file_url.put(key, "", { metadata });

  const directLink = buildTelegramDirectLink(
    c.env.PUBLIC_BASE_URL,
    new URL(c.req.url).origin,
    key
  );

  const chatId = message?.chat?.id;
  if (chatId && shouldNotifyTelegramUpload(c.env.TG_UPLOAD_NOTIFY)) {
    const noticeResult = await sendTelegramUploadNotice(c.env.TG_BOT_TOKEN, {
      chatId,
      replyToMessageId: message.message_id,
      directLink,
      fileId: media.fileId,
      messageId: media.messageId || message.message_id,
      fileName: media.fileName,
      fileSize: media.fileSize,
    });

    if (!noticeResult.ok && !noticeResult.skipped) {
      console.warn(
        "[TelegramWebhook] Upload notice failed:",
        noticeResult.data?.description || noticeResult.error || "unknown error"
      );
    }
  }

  return ok(c, {
    key,
    url: directLink,
  });
});

/**
 * 查询当前 Telegram webhook 绑定状态。
 */
telegramWebhookRoutes.get("/webhook/info", async (c) => {
  if (!c.env.TG_BOT_TOKEN) {
    return ok(c, {
      configured: false,
      reason: "missing-token",
    });
  }

  const result = await callTelegramApi(c.env.TG_BOT_TOKEN, "getWebhookInfo");
  if (!result.ok) {
    return fail(
      c,
      result.description || "Failed to get Telegram webhook info",
      502
    );
  }

  return ok(c, {
    configured: Boolean(result.result?.url),
    url: result.result?.url || "",
    pendingUpdateCount: result.result?.pending_update_count ?? 0,
    lastErrorMessage: result.result?.last_error_message,
  });
});

/**
 * 使用后端环境变量配置 Telegram webhook。
 */
telegramWebhookRoutes.post("/webhook/setup", async (c) => {
  if (!c.env.TG_BOT_TOKEN) {
    return fail(c, "TG_BOT_TOKEN is not configured", 500);
  }
  if (!c.env.TG_WEBHOOK_SECRET) {
    return fail(c, "TG_WEBHOOK_SECRET is not configured", 400);
  }

  const webhookUrl = buildTelegramWebhookUrl(
    c.env.PUBLIC_BASE_URL,
    new URL(c.req.url).origin
  );
  const result = await callTelegramApi(c.env.TG_BOT_TOKEN, "setWebhook", {
    url: webhookUrl,
    secret_token: c.env.TG_WEBHOOK_SECRET,
    allowed_updates: ["message", "channel_post"],
  });

  if (!result.ok) {
    return fail(c, result.description || "Failed to set Telegram webhook", 502);
  }

  return ok(c, {
    webhookUrl,
    telegramResult: result,
  });
});

/**
 * 调用 Telegram Bot API 并返回解析后的 JSON。
 */
async function callTelegramApi(
  botToken: string,
  method: string,
  payload?: Record<string, unknown>
): Promise<any> {
  const response = await fetch(buildTgApiUrl(botToken, method), {
    method: payload ? "POST" : "GET",
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return {
    ...data,
    ok: response.ok && data?.ok === true,
  };
}

/**
 * 生成当前部署可访问的 Telegram webhook URL。
 */
function buildTelegramWebhookUrl(
  publicBaseUrl: string | undefined,
  fallbackOrigin: string
): string {
  const base =
    normalizeBaseUrl(publicBaseUrl) || normalizeBaseUrl(fallbackOrigin);
  return `${base}/telegram/webhook`;
}

/**
 * 规范化公开访问基础 URL。
 */
function normalizeBaseUrl(rawValue: string | undefined): string {
  if (!rawValue) return "";

  try {
    return new URL(rawValue).toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}
