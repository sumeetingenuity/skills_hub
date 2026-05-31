/**
 * In-memory rate limiting.
 * 
 * IMPORTANT: This implementation uses in-memory Maps, meaning:
 * - Rate limits are NOT shared across multiple server instances
 * - In a multi-instance deployment (k8s, serverless), use Redis-backed rate limiting instead
 * - Suitable for single-instance deployments or as a first line of defense
 * 
 * For production multi-instance setups, replace with:
 *   - Redis + sliding window counter
 *   - Upstash ratelimit (@upstash/ratelimit)
 *   - Cloudflare Rate Limiting
 */

const ipBuckets = new Map<string, { count: number; resetAt: number }>()
const globalBucket = { count: 0, resetAt: Date.now() + 60_000 }

const IP_MAX_REQUESTS = 100
const IP_WINDOW_MS = 60_000
const GLOBAL_MAX_REQUESTS = 5000
const GLOBAL_WINDOW_MS = 60_000

// Maximum number of IP entries to track (prevents unbounded memory growth)
const MAX_IP_ENTRIES = 10_000

// Cleanup interval — purge expired entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60_000

let lastCleanup = Date.now()

function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [ip, bucket] of ipBuckets) {
    if (now > bucket.resetAt) {
      ipBuckets.delete(ip)
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

export function checkIpRateLimit(ip: string): RateLimitResult {
  const now = Date.now()
  cleanupStaleEntries()

  const bucket = ipBuckets.get(ip)

  if (!bucket || now > bucket.resetAt) {
    // Enforce max entries to prevent memory exhaustion
    if (ipBuckets.size >= MAX_IP_ENTRIES && !ipBuckets.has(ip)) {
      // Evict oldest expired entry or just allow (fail open for new IPs under pressure)
      return { allowed: true, remaining: IP_MAX_REQUESTS - 1, resetAt: now + IP_WINDOW_MS }
    }
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
    return { allowed: true, remaining: IP_MAX_REQUESTS - 1, resetAt: now + IP_WINDOW_MS }
  }

  bucket.count++
  if (bucket.count > IP_MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt, retryAfter }
  }

  return { allowed: true, remaining: IP_MAX_REQUESTS - bucket.count, resetAt: bucket.resetAt }
}

export function checkGlobalRateLimit(): RateLimitResult {
  const now = Date.now()

  if (now > globalBucket.resetAt) {
    globalBucket.count = 1
    globalBucket.resetAt = now + GLOBAL_WINDOW_MS
    return { allowed: true, remaining: GLOBAL_MAX_REQUESTS - 1, resetAt: now + GLOBAL_WINDOW_MS }
  }

  globalBucket.count++
  if (globalBucket.count > GLOBAL_MAX_REQUESTS) {
    const retryAfter = Math.ceil((globalBucket.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, resetAt: globalBucket.resetAt, retryAfter }
  }

  return { allowed: true, remaining: GLOBAL_MAX_REQUESTS - globalBucket.count, resetAt: globalBucket.resetAt }
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.retryAfter ? { "Retry-After": String(result.retryAfter) } : {}),
  }
}

export function resetRateLimits(): void {
  ipBuckets.clear()
  globalBucket.count = 0
  globalBucket.resetAt = Date.now() + GLOBAL_WINDOW_MS
}
