import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { checkIpRateLimit, checkGlobalRateLimit, getRateLimitHeaders } from "@/lib/security/rate-limit"

const isPublicRoute = createRouteMatcher([
  "/",
  "/skills",
  "/skills/(.*)",
  "/import(.*)",
  "/workflows(.*)",
  "/docs(.*)",
  "/profile(.*)",
  "/api/skills",
  "/api/skills/search(.*)",
  "/api/skills/vector-search(.*)",
  "/api/skills/discover(.*)",
  "/api/skills/:id",
  "/api/categories(.*)",
  "/api/import(.*)",
  "/api/analytics(.*)",
  "/api/metrics(.*)",
  "/api/profile(.*)",
  "/api/execute",
  "/.well-known(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

const isApiRoute = createRouteMatcher([
  "/api/(.*)",
])

const MAX_BODY_BYTES = 1024 * 1024

function getAllowedOrigins(request: NextRequest): string[] {
  const host = request.headers.get("host") || ""
  return [
    `https://${host}`,
    `http://${host}`,
    ...(process.env.NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:3001"]
      : []),
  ]
}

export default clerkMiddleware(async (auth, req) => {
  const requestStart = Date.now()

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1"

  const ipResult = checkIpRateLimit(ip)
  if (!ipResult.allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", code: "RATE_LIMITED" },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(ipResult),
          "Content-Type": "application/json",
        },
      }
    )
  }

  const globalResult = checkGlobalRateLimit()
  if (!globalResult.allowed) {
    return NextResponse.json(
      { error: "Service temporarily unavailable due to high load", code: "GLOBAL_RATE_LIMITED" },
      {
        status: 429,
        headers: {
          ...getRateLimitHeaders(globalResult),
          "Content-Type": "application/json",
        },
      }
    )
  }

  if (isApiRoute(req)) {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10)
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: "Request body too large", code: "PAYLOAD_TOO_LARGE" },
        { status: 413 }
      )
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  const response = NextResponse.next()
  const allowedOrigins = getAllowedOrigins(req)
  const origin = req.headers.get("origin") || ""
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0]

  response.headers.set("Access-Control-Allow-Origin", corsOrigin)
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Agent-ID, X-API-Key, X-AMTP-Version, X-Hub-Signature-256")
  response.headers.set("Access-Control-Max-Age", "86400")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-RateLimit-Remaining", ipResult.remaining.toString())
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(ipResult.resetAt / 1000)))
  response.headers.set("X-Response-Time", `${Date.now() - requestStart}ms`)

  return response
})

export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico).*)",
  ],
}
