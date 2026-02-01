// utils/common.ts
import { ApiResponse } from "@shared/types";

// 判断是否为开发环境
export function isDev(env: any): boolean {
  const isDev = !env?.TG_BOT_TOKEN;
  // console.log("isDev:", isDev);
  return isDev;
}

function json(body: any, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * 编码 Content-Disposition header 中的文件名（支持中文等非 ASCII 字符）
 * 使用 RFC 5987 标准：filename*=UTF-8''<percent-encodedfilename>
 */
export function encodeContentDisposition(fileName: string, inline = true): string {
  const disposition = inline ? 'inline' : 'attachment';
  // 使用 RFC 5987 编码：filename*=UTF-8''<percent-encoded>
  const encodedFileName = encodeURIComponent(fileName)
    .replace(/['()]/g, escape) // 额外转义特殊字符
    .replace(/\*/g, '%2A');
  return `${disposition}; filename*=UTF-8''${encodedFileName}`;
}

/**
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
