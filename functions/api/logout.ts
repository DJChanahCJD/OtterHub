import { error } from "../utils/common";

export async function onRequest(context: any) {
  return error("Logged out.", 401);
}
