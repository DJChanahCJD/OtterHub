import { isDev } from "../common";
import { FileMetadata, CF } from "../types";
import { R2Adapter } from "./r2-adaper";
import { TGAdapter } from "./tg-adapter";

// 存储适配器接口定义
export interface DBAdapter {
  // 上传单个完整文件
  uploadFile(file: File | Blob, metadata: FileMetadata): Promise<Response>;

  // 上传分片文件
  uploadChunk(
    key: string,
    chunkIndex: number,
    chunkFile: File | Blob
  ): Promise<Response>;

  // 获取文件，永远返回Response
  get(key: string, req?: Request): Promise<Response>;

  // 删除文件
  // TODO: 是否要在key不存在时直接返回
  delete(key: string): Promise<boolean>;
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
        adapter = new R2Adapter(env, CF.R2_BUCKET, CF.KV_NAME);
        break;
      case DBAdapterType.TG:
        adapter = new TGAdapter(env, CF.KV_NAME);
        break;
      default:
        throw new Error(`Unsupported storage adapter type: ${type}`);
    }
    this.adapterInstances.set(type, adapter);

    return adapter;
  }
  // 根据环境选择合适的存储适配器
  static createAdapter(env: any, adapterType?: string): DBAdapter {
    // 优先使用传入的adapterType，否则根据环境变量判断
    // 开发环境默认使用R2，生产环境默认使用Telegram
    const type =
      adapterType ||
      (isDev(env)
        ? DBAdapterType.R2
        : env.STORAGE_ADAPTER_TYPE || DBAdapterType.TG);

    switch (type.toLowerCase()) {
      case DBAdapterType.R2:
        return new R2Adapter(env, CF.R2_BUCKET, CF.KV_NAME);
      case DBAdapterType.TG:
        return new TGAdapter(env, CF.KV_NAME);
      default:
        throw new Error(`Unsupported storage adapter type: ${type}`);
    }
  }
}
