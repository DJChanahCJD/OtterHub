import { isDev, buildKeyId, getFileExt, ok, getFileIdFromKey, fail } from "./common";
import { FileMetadata, FileType, CF, ApiResponse } from "./types";

// 存储适配器接口定义
export interface DBAdapter {
  // 上传文件
  upload(file: File | Blob, metadata: any): Promise<string>;
  
  // 获取文件
  get(key: string, context?: any): Promise<Response | null>;
  
  // 删除文件
  delete(key: string): Promise<boolean>;
}

// R2存储适配器实现
export class R2Adapter implements DBAdapter {
  private env: any;
  private bucketName: string;
  private kvName: string;

  constructor(env: any, bucketName: string, kvName: string) {
    this.env = env;
    this.bucketName = bucketName;
    this.kvName = kvName;
  }

  async upload(file: File | Blob, metadata: any): Promise<string> {
    // 生成唯一的fileId
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fileName = metadata.fileName;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // 根据文件类型确定前缀
    let fileType: FileType;
    if (file.type.startsWith('image/')) {
      fileType = FileType.Image;
    } else if (file.type.startsWith('audio/')) {
      fileType = FileType.Audio;
    } else if (file.type.startsWith('video/')) {
      fileType = FileType.Video;
    } else {
      fileType = FileType.Document;
    }
    
    // 构建带有前缀的完整fileId
    const fullFileId = `${fileId}.${fileExtension}`;
    const key = buildKeyId(fileType, fullFileId);

    // 将文件上传到R2存储
    await this.env[this.bucketName].put(key, file, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 将文件信息保存到KV存储
    if (this.env[this.kvName]) {
      await this.env[this.kvName].put(key, "", { metadata });
    }

    return key;
  }

  async get(key: string): Promise<Response | null> {
    const object = await this.env[this.bucketName].get(key);
    if (!object) {
      return fail(`File not found for key: ${key}`, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);

    return ok(object.body, "", 200, headers);
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.env[this.bucketName].delete(key);
      
      // 从KV存储中删除文件信息
      if (this.env[this.kvName]) {
        await this.env[this.kvName].delete(key);
      }
      
      return true;
    } catch (error) {
      console.error('R2 delete error:', error);
      return false;
    }
  }
}

// Telegram存储适配器实现
export class TGAdapter implements DBAdapter {
  private env: any;
  private kvName: string;

  constructor(env: any, kvName: string) {
    this.env = env;
    this.kvName = kvName;
  }

  async upload(file: File | Blob, metadata: FileMetadata): Promise<string> {
    const fileName = metadata.fileName;
    const fileExtension = getFileExt(fileName);

    const tgFormData = new FormData();
    tgFormData.append("chat_id", this.env.TG_Chat_ID);

    // 根据文件类型选择合适的上传方式
    let apiEndpoint: string;
    let fileType: FileType;
    if (file.type.startsWith('image/')) {
      tgFormData.append("photo", file);
      apiEndpoint = 'sendPhoto';
      fileType = FileType.Image;
    } else if (file.type.startsWith('audio/')) {
      tgFormData.append("audio", file);
      apiEndpoint = 'sendAudio';
      fileType = FileType.Audio;
    } else if (file.type.startsWith('video/')) {
      tgFormData.append("video", file);
      apiEndpoint = 'sendVideo';
      fileType = FileType.Video;
    } else {
      tgFormData.append("document", file);
      apiEndpoint = 'sendDocument';
      fileType = FileType.Document;
    }

    const result = await this.sendToTelegram(tgFormData, apiEndpoint);
    console.log('Telegram upload result:', result);

    if (!result.success) {
      throw new Error(result.message);
    }

    const tgFileId = this.getFileId(result.data);

    if (!tgFileId) {
      throw new Error('Failed to get file ID');
    }
    
    const fullFileId = `${tgFileId}.${fileExtension}`;
    const key = buildKeyId(fileType, fullFileId);
    
    // TODO: 默认元数据
    const defaultMetadata = {
    };

    // 将文件信息保存到KV存储
    if (this.env[this.kvName]) {
      await this.env[this.kvName].put(key, "", {
        metadata: {
          ...metadata,
          ...defaultMetadata,
        }
      });
    }

    return key;
  }

  async get(key: string, context: any): Promise<Response | null> {
    const fileId = getFileIdFromKey(key);
    return await this.getTgFile(fileId);
  }

  async delete(key: string): Promise<boolean> {
    try {
      // Telegram API不支持直接删除文件
      // 只从KV存储中删除文件信息
      if (this.env[this.kvName]) {
        await this.env[this.kvName].delete(key);
      }
      
      return true;
    } catch (error) {
      console.error('Telegram delete error:', error);
      return false;
    }
  }

  private async sendToTelegram(formData: FormData, apiEndpoint: string, retryCount = 2): Promise<ApiResponse<any>> {
    const apiUrl = `https://api.telegram.org/bot${this.env.TG_Bot_Token}/${apiEndpoint}`;

    try {
      const response = await fetch(apiUrl, { method: "POST", body: formData });
      const responseData = await response.json();

      if (response.ok) {
        return { success: true, data: responseData };
      }

      // 图片上传失败时转为文档方式重试
      if (retryCount > 0 && apiEndpoint === 'sendPhoto') {
        console.log('Retrying image as document...');
        const newFormData = new FormData();
        newFormData.append('chat_id', formData.get('chat_id') as string);
        newFormData.append('document', formData.get('photo') as File);
        return await this.sendToTelegram(newFormData, 'sendDocument', retryCount - 1);
      }

      return {
        success: false,
        message: 'Upload to Telegram failed'
      };
    } catch (error: any) {
      console.error('Network error:', error);
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount)));
        return await this.sendToTelegram(formData, apiEndpoint, retryCount - 1);
      }
      return { success: false, message: 'Network error occurred' };
    }
  }

  private getFileId(response: any): string | null {
    if (!response.ok || !response.result) return null;

    const result = response.result;
    if (result.photo) {
      return result.photo.reduce((prev: any, current: any) =>
        (prev.file_size > current.file_size) ? prev : current
      ).file_id;
    }
    if (result.document) return result.document.file_id;
    if (result.video) return result.video.file_id;
    if (result.audio) return result.audio.file_id;

    return null;
  }

  // Telegram Bot API 文件处理逻辑
  // 原Telegraph API: 'https://telegra.ph/' + url.pathname + url.search;
  private async getTgFile(key: string) {
    const fileId = getFileIdFromKey(key);
    const filePath = await this.getTgFilePath(fileId);

    if (!filePath) {
      return fail(`File not found: ${key}`, 404);
    }

    const url = `https://api.telegram.org/file/bot${this.env.TG_Bot_Token}/${filePath}`;
    return fetch(url);
  }

  private async getTgFilePath(fileId: string): Promise<string | null> {
    // TODO: 考虑缓存url
    const url = `https://api.telegram.org/bot${this.env.TG_Bot_Token}/getFile?file_id=${fileId}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();
    return data?.ok ? data.result.file_path : null;
  }
}

export enum DBAdapterType {
  R2 = 'r2',
  TG = 'telegram',
}

// 存储适配器工厂类
export class DBAdapterFactory {
  private static adapterInstances: Map<string, DBAdapter> = new Map();

  static getAdapter(env: any, adapterType?: string): DBAdapter {
    const type = adapterType || (isDev(env) ? DBAdapterType.R2 : DBAdapterType.TG);
    
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
    const type = adapterType || (isDev(env) ? DBAdapterType.R2 : env.STORAGE_ADAPTER_TYPE || DBAdapterType.TG);
    
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