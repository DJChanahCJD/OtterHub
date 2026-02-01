import { okV1 } from "@utils/common";

export async function onRequest() {
  return okV1(true, "Logout successful", 200, {
    "Set-Cookie": [
      "auth=",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=0"
    ].join("; "),
  });
}
