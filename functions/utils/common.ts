import { FileType, ApiResponse } from "./types";

// 判断是否为开发环境
export function isDev(env: any): boolean {
  const isDev = !env?.TG_Bot_Token;
  console.log("isDev:", isDev);
  return isDev;
}

// 获取文件扩展名
export function getFileExt(fileName: string): string {
  return fileName.split(".").pop()!.toLowerCase();
}

// 构建存储键
export function buildKeyId(fileType: FileType, fullFileId: string): string {
  return `${fileType}_${fullFileId}`;
}

// 从存储键提取文件ID
const FILE_PREFIX_REG = new RegExp(`^(${Object.values(FileType).join("|")})_`);
export function getFileIdFromKey(key: string): string {
  return key.replace(FILE_PREFIX_REG, "");
}

// 生成唯一文件ID
// 当前只给R2用，TG的文件ID由TG API返回
export function getUniqueFileId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function json(body: any, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * 生成成功响应
 * @param data 响应数据
 * @param message 提示消息
 * @param status HTTP状态码，默认为200
 */
export function ok<T>(data?: T, message?: string, status = 200, headers?: HeadersInit): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return json(response, status, headers);
}

/**
 * 生成错误响应
 * @param message 错误信息
 * @param status HTTP状态码，默认为500
 */
export function fail(message: string, status = 500, headers?: HeadersInit): Response {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    message,
  };
  return json(response, status, headers);
}
