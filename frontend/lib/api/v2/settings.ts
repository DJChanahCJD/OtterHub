import { request } from "@/lib/utils";
import { API_URL } from ".";

/**
 * 获取云端同步设置
 */
export function getSettings(): Promise<any> {
  return request<any>(`${API_URL}/settings`);
}

/**
 * 更新云端同步设置
 * @param settings 部分或全部设置项
 */
export function updateSettings(settings: any): Promise<any> {
  return request<any>(`${API_URL}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
}
