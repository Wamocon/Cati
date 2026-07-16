import { createHash } from "node:crypto"
import type { NextRequest } from "next/server"

interface RateBucket {
  count: number
  resetAt: number
}

const processWithRateBuckets = process as typeof process & {
  __catiRequestRateBuckets?: Map<string, RateBucket>
}

const rateBuckets =
  processWithRateBuckets.__catiRequestRateBuckets ?? new Map<string, RateBucket>()
processWithRateBuckets.__catiRequestRateBuckets = rateBuckets

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export function mutationOriginAllowed(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "cross-site") return false

  const origin = request.headers.get("origin")
  if (!origin) return true

  try {
    // Sec-Fetch-Site is a forbidden browser header. It remains trustworthy
    // when a managed reverse proxy rewrites Host but the browser request is
    // genuinely same-origin.
    if (fetchSite === "same-origin") return true

    const originHost = new URL(origin).host.toLowerCase()
    const forwardedHost = request.headers
      .get("x-forwarded-host")
      ?.split(",", 1)[0]
      ?.trim()
      .toLowerCase()
    const requestHosts = new Set(
      [request.nextUrl.host, request.headers.get("host"), forwardedHost]
        .filter((host): host is string => Boolean(host))
        .map((host) => host.toLowerCase())
    )
    return requestHosts.has(originHost)
  } catch {
    return false
  }
}

function clientDigest(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
  const address = forwarded || request.headers.get("x-real-ip") || "unknown"
  const agent = request.headers.get("user-agent")?.slice(0, 200) || "unknown"
  return createHash("sha256")
    .update(`${address}\u0000${agent}`)
    .digest("hex")
    .slice(0, 32)
}

function pruneExpiredBuckets(now: number) {
  if (rateBuckets.size < 2_000) return
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key)
  }
  // Bound memory even if an attacker rotates client identifiers.
  if (rateBuckets.size > 10_000) {
    for (const key of rateBuckets.keys()) {
      rateBuckets.delete(key)
      if (rateBuckets.size <= 8_000) break
    }
  }
}

export function consumeRequestRateLimit({
  request,
  scope,
  limit,
  windowMs,
  subject,
}: {
  request: NextRequest
  scope: string
  limit: number
  windowMs: number
  subject?: string | null
}): RateLimitResult {
  const now = Date.now()
  pruneExpiredBuckets(now)
  const subjectDigest = subject
    ? createHash("sha256").update(subject.trim().toLowerCase()).digest("hex").slice(0, 24)
    : "none"
  const key = `${scope}:${clientDigest(request)}:${subjectDigest}`
  const current = rateBuckets.get(key)
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current
  bucket.count += 1
  rateBuckets.set(key, bucket)

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  }
}

