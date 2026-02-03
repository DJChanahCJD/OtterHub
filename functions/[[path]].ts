import { app } from './app';
import { handle } from 'hono/cloudflare-pages';

const worker = handle(app);

export const onRequest = async (context: any) => {
  const response = await worker(context);

  // 如果 Hono 返回 404，说明没有匹配的 API 路由
  // 此时尝试调用 next() 将请求交给 Cloudflare Pages 的静态资源处理
  if (response.status === 404) {
    const contentType = response.headers.get('content-type');
    // 如果返回的是 JSON，说明是 API 明确返回的 404 错误（例如文件未找到），不应回退
    // 只有非 JSON 的 404（即 Hono 默认的路由未匹配）才回退给静态资源
    if (!contentType || !contentType.includes('application/json')) {
      return context.next();
    }
  }

  return response;
};
