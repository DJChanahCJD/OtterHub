import * as Sentry from '@sentry/cloudflare';
import type { Env } from './types/hono';

interface Context {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
  waitUntil: (promise: Promise<any>) => void;
  data: Record<string, unknown>;
}

// Initialize Sentry SDK
const sentryMiddleware = Sentry.sentryPagesPlugin<Env>((context) => ({
  dsn: context.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
}));

// Custom error handling and logging
const errorHandlerMiddleware = async (context: Context) => {
  const { request, next } = context;

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

    return new Response('Internal Server Error', {
      status: 500,
    });
  }
};

export const onRequest = [sentryMiddleware, errorHandlerMiddleware];
