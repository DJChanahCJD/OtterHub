import { client } from "./client";
import { unwrap } from "./config";

export type TelegramWebhookInfo = {
  configured: boolean;
  reason?: string;
  url?: string;
  pendingUpdateCount?: number;
  lastErrorMessage?: string;
};

export type TelegramWebhookSetupResult = {
  webhookUrl: string;
  telegramResult: unknown;
};

/**
 * Telegram webhook 管理接口。
 */
export const telegramWebhookApi = {
  getInfo(): Promise<TelegramWebhookInfo> {
    return unwrap<TelegramWebhookInfo>(client.telegram.webhook.info.$get());
  },

  setup(): Promise<TelegramWebhookSetupResult> {
    return unwrap<TelegramWebhookSetupResult>(
      client.telegram.webhook.setup.$post()
    );
  },
};
