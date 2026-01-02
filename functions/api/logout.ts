export async function onRequest(context: any) {
  return new Response("Logged out.", { status: 401 });
}
