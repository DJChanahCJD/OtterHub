import { fail } from "../utils/common";

export async function onRequest(context: any) {
  return fail("Logged out.", 401, {
    "WWW-Authenticate": 'Basic realm="OtterHub Admin", charset="UTF-8"',  // 清除之前存储的 Basic Auth 凭据
  });
}
