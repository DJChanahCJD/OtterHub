import { signJWT } from "@utils/auth";
import { failV1, okV1 } from "@utils/common";

export async function onRequestPost({ request, env }: any) {
  try {
    const { password } = await request.json();

    if (!password || password !== env.PASSWORD) {
      return failV1("Unauthorized", 401);
    }

    // Use JWT_SECRET if available, otherwise fallback to PASSWORD
    const secret = env.JWT_SECRET || env.PASSWORD;
    const token = await signJWT(secret);

    const cookie = [
      `auth=${token}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=86400",
      "Secure"
    ].join("; ");

    return okV1(true, "Login successful", 200, {
      "Set-Cookie": cookie,
    });
  } catch (e) {
    return failV1("Invalid request", 400);
  }
}
