import { ApiResponse } from "@shared/types";

export const API_URL =
  typeof window !== "undefined"
    ? window.location.hostname === "localhost" && process.env.NEXT_PUBLIC_BACKEND_URL
      ? process.env.NEXT_PUBLIC_BACKEND_URL
      : window.location.origin
    : "";

/**
 * 统一处理后端 ok / fail 响应
 * 支持传入 Response 对象或 Promise<Response>
 */
export async function unwrap<T>(resOrPromise: Response | Promise<Response>): Promise<T> {
  const res = await resOrPromise;
  
  if (!res.ok) {
    throw new Error(await res.text());
  }

  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new Error(body.message || '请求失败');
  }

  return body.data as T;
}