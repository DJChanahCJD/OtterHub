import { FileMetadata } from "@shared/types";

export interface KVNamespace {
  get(key: string, options?: any): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
  getWithMetadata<T = unknown>(
    key: string
  ): Promise<{ value: any; metadata: T }>;
}

export interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(key: string): Promise<void>;
}

/** Cloudflare Workers AI binding（在 Pages Functions Bindings 面板中配置，变量名为 AI） */
export interface WorkersAI {
  run(model: string, inputs: Record<string, any>): Promise<any>;
}

export type Env = {
  oh_file_url: KVNamespace;
  oh_file_r2?: R2Bucket;
  JWT_SECRET?: string;
  PASSWORD?: string;
  API_TOKEN?: string;

  TG_CHAT_ID?: string;
  TG_BOT_TOKEN?: string;
  TG_WEBHOOK_SECRET?: string;
  PUBLIC_BASE_URL?: string;
  TG_UPLOAD_NOTIFY?: string;

  /** Workers AI binding，可选；不配置时 AI 富化功能自动跳过 */
  AI?: WorkersAI;
};
