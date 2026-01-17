import { ok } from "../utils/common";

export async function onRequest() {
  return ok(true, "Logout successful", 200, {
    "Set-Cookie": [
      "auth=",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0"
    ].join("; "),
  });
}
