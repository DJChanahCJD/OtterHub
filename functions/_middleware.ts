import * as Sentry from '@sentry/cloudflare';
import type { Env } from './types/hono';

interface Context {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
}

export const onRequest = async (context: Context) => {
  const { request, next, env } = context;

  return Sentry.withSentry(
    {
      dsn: env.SENTRY_DSN,
      // environment: env.ENVIRONMENT || "development", // Optional: Add environment variable if needed
      tracesSampleRate: 0.2, // 20% tracing
    },
    async () => {
      try {
        const response = await next();

        // Record server errors
        if (response.status >= 500) {
          Sentry.captureMessage('Server Error Response', {
            level: 'error',
            extra: {
              url: request.url,
              status: response.status,
            },
          });
        }

        return response;
      } catch (err) {
        Sentry.captureException(err);

        // Allow the error to propagate or return a 500 response?
        // Since Hono might have its own error handling, we might want to let Hono handle it or return a generic error.
        // However, if we catch it here, we ensure it's logged.
        // Returning a new Response might bypass Hono's error handler if this middleware runs "around" Hono.
        // But Hono is inside [[path]].ts which is wrapped by this.
        // So if Hono throws, we catch it here.
        return new Response('Internal Server Error', {
          status: 500,
        });
      }
    }
  );
};
