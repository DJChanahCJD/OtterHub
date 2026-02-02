import { hc } from 'hono/client'
import { API_URL } from './config'
import type { AppType } from '@functions/app'

export const client = hc<AppType>(API_URL) as any
