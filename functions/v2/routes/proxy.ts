import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { proxyGet, handleStreamResponse } from '../../utils/proxy';
import type { Env } from '../types/hono';
import { ok, fail } from '../../utils/common';
import { authMiddleware } from 'v2/middleware/auth';

export const proxyRoutes = new Hono<{ Bindings: Env }>();

proxyRoutes.use('*', authMiddleware);

proxyRoutes.get(
  '/',
  zValidator(
    'query',
    z.object({
      url: z.string().url(),
      headers: z.string().optional(),
    })
  ),
  async (c) => {
    const { url: targetUrl, headers: headersParam } = c.req.valid('query');
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
      return handleStreamResponse(response);
    } catch (e: any) {
      console.error("Proxy error:", e);
      return c.json(fail(`Proxy error: ${e.message || "Unknown error"}`), 500);
    }
  }
);
