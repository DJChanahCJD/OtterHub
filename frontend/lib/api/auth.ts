import { client } from "./client";

/**
 * 登录
 */
export async function login(password: string): Promise<boolean> {
  const res = await client.auth.login.$post({
    json: { password },
  });

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}

/**
 * 登出
 */
export async function logout(): Promise<boolean> {
  const res = await client.auth.logout.$post();

  if (!res.ok) {
    return false;
  }

  const data = await res.json();
  return data.success;
}
