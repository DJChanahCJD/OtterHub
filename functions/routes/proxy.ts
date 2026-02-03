import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { proxyGet, handleStreamResponse } from '@utils/proxy';
import type { Env } from '../types/hono';
import { authMiddleware } from '../middleware/auth';
import { fail } from '@utils/response';

export const proxyRoutes = new Hono<{ Bindings: Env }>();

proxyRoutes.use('*', authMiddleware);

proxyRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      url: z.string().url(),
      headers: z.string().optional(),
      filename: z.string().optional(),
    })
  ),
  async (c) => {
    const { url: targetUrl, headers: headersParam, filename } = c.req.valid('query');
    let customHeaders: Record<string, string> | undefined;

    if (headersParam) {
      try {
        customHeaders = JSON.parse(headersParam);
      } catch {
        // Ignore invalid headers
      }
    }

    try {
      const response = await proxyGet(targetUrl, customHeaders);
      
      // If filename is provided, force download
      if (filename) {
        const streamResponse = handleStreamResponse(response);
        const newHeaders = new Headers(streamResponse.headers);
        
        // Use RFC 5987 for non-ASCII filenames
        const encodedFilename = encodeURIComponent(filename);
        newHeaders.set(
          'Content-Disposition', 
          `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
        );
        
        return new Response(streamResponse.body, {
          status: streamResponse.status,
          statusText: streamResponse.statusText,
          headers: newHeaders,
        });
      }

      return handleStreamResponse(response);
    } catch (e: any) {
      console.error("Proxy error:", e);
      return fail(c, `Proxy error: ${e.message || "Unknown error"}`, 500);
    }
  }
);
