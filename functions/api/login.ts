import { signJWT } from "../utils/auth";
import { fail, ok } from "../utils/common";

export async function onRequestPost({ request, env }: any) {
  try {
    const { password } = await request.json();

    if (!password || password !== env.PASSWORD) {
      return fail("Unauthorized", 401);
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

    return ok(true, "Login successful", 200, {
      "Set-Cookie": cookie,
    });
  } catch (e) {
    return fail("Invalid request", 400);
  }
}
