import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET as getAnalytics } from "@/app/api/analytics/route"
import { mockPrisma } from "@/__tests__/setup"

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

describe("GET /api/analytics", () => {
  it("returns execution analytics", async () => {
    const now = new Date()
    mockPrisma.execution.findMany.mockResolvedValue([
      { status: "COMPLETED", latency: 100, createdAt: now },
      { status: "COMPLETED", latency: 200, createdAt: now },
    ])
    mockPrisma.analytics.aggregate.mockResolvedValue({
      _sum: { executions: 50, activeAgents: 5 },
    })

    const res = await getAnalytics(makeRequest("/api/analytics?skillId=s1&days=7"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalExecutions).toBe(2)
    expect(body.completed).toBe(2)
    expect(body.successRate).toBe(100)
    expect(body.avgLatencyMs).toBe(150)
  })

  it("returns analytics without skillId filter", async () => {
    mockPrisma.execution.findMany.mockResolvedValue([])

    const res = await getAnalytics(makeRequest("/api/analytics?days=30"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalExecutions).toBe(0)
    expect(body.daily.length).toBe(30)
  })

  it("returns 500 on error", async () => {
    mockPrisma.execution.findMany.mockRejectedValue(new Error("DB error"))
    const res = await getAnalytics(makeRequest("/api/analytics"))
    expect(res.status).toBe(500)
  })
})
