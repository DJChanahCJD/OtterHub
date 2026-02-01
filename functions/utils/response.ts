// utils/response.ts
import type { Context } from 'hono'
import type { ApiResponse } from '@shared/types'
import { ContentfulStatusCode } from 'hono/utils/http-status'

export function ok<T>(
  c: Context,
  data?: T,
  message?: string,
  status: ContentfulStatusCode = 200
) {
  const res: ApiResponse<T> = {
    success: true,
    data,
    message,
  }

  return c.json(res, status)
}

export function fail(
  c: Context,
  message: string,
  status: ContentfulStatusCode = 500
) {
  const res: ApiResponse<null> = {
    success: false,
    data: null,
    message,
  }

  return c.json(res, status)
}
