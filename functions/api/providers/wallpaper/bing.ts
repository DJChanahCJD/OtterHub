import { ok, fail } from "../../../utils/common";

export async function onRequest(context: any) {
  const res = await fetch(`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=5`);
  const data = await res.json();
  return ok(data.images);
}