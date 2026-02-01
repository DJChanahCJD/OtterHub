import { request } from "../utils";
import { API_URL } from ".";

/**
 * 登录
 */
export function login(password: string): Promise<boolean> {
  return request<boolean>(`${API_URL}/v1/api/login`, {
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
  return request<boolean>(`${API_URL}/v1/api/logout`, {
    method: "POST",
  });
}
