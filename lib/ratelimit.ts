/**
 * In-memory sliding window rate limiter.
 *
 * Works fine for local dev and single-process deployments.
 * For Vercel/serverless (where each invocation is isolated), upgrade to
 * Upstash Redis: https://upstash.com — drop-in swap, ~5 min setup.
 */

type Entry = { count: number; resetAt: number }

const store = new Map<string, Entry>()

// Prune expired keys every 5 minutes to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}, 5 * 60 * 1000)

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 }
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count, retryAfterSec: 0 }
}

export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anonymous'
  )
}
