import { isDev } from "../common";
import { FileMetadata, CF } from "../types";
import { R2AdapterV2 } from "./r2-adapter-v2";
import { TGAdapterV2 } from "./tg-adapter-v2";

// 存储适配器接口定义
export interface DBAdapter {
  // 上传单个完整文件
  uploadFile(file: File | Blob | Uint8Array, metadata: FileMetadata): Promise<{ key: string }>;
  // 上传分片文件
  uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File | Blob,
    waitUntil?: (promise: Promise<any>) => void,
  ): Promise<{ chunkIndex: number }>;

  // 获取文件，永远返回Response
  get(key: string, req?: Request): Promise<Response>;

  // 删除文件
  // TODO: 是否要在key不存在时直接返回
  delete(key: string): Promise<{ isDeleted: boolean }>;

  // 获取文件元数据（用于权限检查）
  getFileMetadataWithValue(key: string): Promise<{
    metadata: FileMetadata;
    value: string | null;
  } | null>;

  // 将文件移入回收站
  moveToTrash(key: string): Promise<void>;

  // 从回收站还原文件
  restoreFromTrash(trashKey: string): Promise<void>;
}

export enum DBAdapterType {
  R2 = "r2",
  TG = "telegram",
}

// 存储适配器工厂类
export class DBAdapterFactory {
  private static adapterInstances: Map<string, DBAdapter> = new Map();

  static getAdapter(env: any, adapterType?: string): DBAdapter {
    const type =
      adapterType || (isDev(env) ? DBAdapterType.R2 : DBAdapterType.TG);

    // 检查缓存中是否已有实例
    if (this.adapterInstances.has(type)) {
      console.log(`DBAdapter hit: ${type}`);
      return this.adapterInstances.get(type)!;
    }

    // 创建新实例
    let adapter: DBAdapter;
    switch (type.toLowerCase()) {
      case DBAdapterType.R2:
        adapter = new R2AdapterV2(env, CF.R2_BUCKET, CF.KV_NAME);
        break;
      case DBAdapterType.TG:
        adapter = new TGAdapterV2(env, CF.KV_NAME);
        break;
      default:
        throw new Error(`Unsupported storage adapter type: ${type}`);
    }
    this.adapterInstances.set(type, adapter);

    return adapter;
  }
}
