// Simple request logger middleware
import type { MiddlewareHandler } from 'hono'

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`[${c.req.method}] ${c.req.path} — ${c.res.status} (${ms}ms)`)
}
