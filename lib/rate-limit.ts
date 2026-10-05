import { getRequestIP } from '@tanstack/react-start/server'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_BUCKETS = 10_000

export type RateLimitResult = {
  ok: boolean
  retryAfterSeconds: number
}

/**
 * Prosty sliding-window limiter w pamięci instancji (Vercel serverless).
 * Chroni przed pojedynczymi floodami; nie jest globalny między instancjami —
 * twardy limit wymaga warstwy zewnętrznej (np. Cloudflare/Upstash).
 */
export function consumeRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) buckets.clear()
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSeconds: 0 }
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    }
  }

  bucket.count += 1
  return { ok: true, retryAfterSeconds: 0 }
}

export function requestIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function rateLimitError(result: RateLimitResult): { error: string } {
  return {
    error: `Zbyt wiele żądań. Spróbuj ponownie za ${result.retryAfterSeconds} s.`,
  }
}
