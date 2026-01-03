import { CF } from "../utils/types";

export async function onRequest(context: any) {
  // Contents of context object
  const {
    request, // same as existing Worker API
    env, // same as existing Worker API
    params, // if filename includes [id] or [[path]]
    waitUntil, // same as ctx.waitUntil in existing Worker API
    next, // used for middleware or to fetch assets
    data, // arbitrary space for passing data between middlewares
  } = context;
  const value = await env[CF.KV_NAME].list();

  console.log(value)

  return new Response(JSON.stringify(value.keys));

}