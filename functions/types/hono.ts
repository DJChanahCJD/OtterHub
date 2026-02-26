import { FileMetadata } from '@shared/types';

export interface KVNamespace {
  get(key: string, options?: any): Promise<any>;
  put(key: string, value: any, options?: any): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: any): Promise<any>;
  getWithMetadata(key: string): Promise<{ value: any; metadata: FileMetadata }>;
}

export interface R2Bucket {
  get(key: string): Promise<any>;
  put(key: string, value: any, options?: any): Promise<any>;
  delete(key: string): Promise<void>;
}

export type Env = {
  oh_file_url: KVNamespace;
  oh_file_r2?: R2Bucket;
  JWT_SECRET?: string;
  PASSWORD?: string;
  API_TOKEN?: string;
  
  TG_CHAT_ID?: string;
  TG_BOT_TOKEN?: string;
  SENTRY_DSN?: string;
};
