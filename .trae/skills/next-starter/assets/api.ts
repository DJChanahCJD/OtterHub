// lib/api.ts
import { request } from "./utils";

// 开发环境：.env.local
// 生产环境：当前域名
// 注意：使用typeof window !== 'undefined'检查，避免服务端渲染错误
export const API_URL =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? process.env.NEXT_PUBLIC_BACKEND_URL || ""
    : "";

// 登录
export function login(password: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

// 登出
export function logout(): Promise<boolean> {
  return request<boolean>(`${API_URL}/api/logout`, {
    method: "POST",
  });
}