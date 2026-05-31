import { describe, it, expect } from "vitest"
import { GET as getMetrics } from "@/app/api/metrics/route"

describe("GET /api/metrics", () => {
  it("returns platform metrics", async () => {
    const { mockPrisma } = await import("@/__tests__/setup")

    mockPrisma.skill.count.mockResolvedValue(5)
    mockPrisma.execution.count.mockResolvedValue(100)
    mockPrisma.user.count.mockResolvedValue(10)
    mockPrisma.organization.count.mockResolvedValue(2)
    mockPrisma.agent.count.mockResolvedValue(20)

    const res = await getMetrics()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skills).toBe(5)
    expect(body.executions).toBe(100)
    expect(body.developers).toBe(10)
    expect(body.organizations).toBe(2)
    expect(body.agents).toBe(20)
  })

  it("returns sample metrics when DB is empty", async () => {
    const { mockPrisma } = await import("@/__tests__/setup")

    mockPrisma.skill.count.mockResolvedValue(0)
    mockPrisma.execution.count.mockResolvedValue(0)

    const res = await getMetrics()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skills).toBeGreaterThan(0)
    expect(body.executions).toBeGreaterThan(0)
  })

  it("returns fallback metrics on error", async () => {
    const { mockPrisma } = await import("@/__tests__/setup")

    mockPrisma.skill.count.mockRejectedValue(new Error("DB error"))

    const res = await getMetrics()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skills).toBeGreaterThan(0)
  })
})
