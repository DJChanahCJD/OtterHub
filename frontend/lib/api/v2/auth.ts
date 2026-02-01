import { request } from "@/lib/utils";
import { API_URL } from ".";

/**
 * 登录
 */
export function login(password: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
}

/**
 * 登出
 */
export function logout(): Promise<boolean> {
  return request<boolean>(`${API_URL}/auth/logout`, {
    method: "POST",
  });
}
