import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ApiResponse } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function request<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  // 确保跨域请求携带 Cookie
  const requestInit: RequestInit = {
    ...init,
    credentials: init?.credentials || "include",
  };

  const response = await fetch(input, requestInit);

  // 处理未授权情况
  if (response.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  // HTTP 层错误
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const result: ApiResponse<T> = await response.json();

  // 业务层错误
  if (!result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result.data;
}