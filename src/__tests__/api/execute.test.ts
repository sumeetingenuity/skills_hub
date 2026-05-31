import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST as executeAction } from "@/app/api/execute/route"
import { mockPrisma } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

describe("POST /api/execute", () => {
  const skillWithActions = {
    id: "s1",
    slug: "test-skill",
    name: "Test Skill",
    published: true,
    authorId: "user-1",
    permissions: [{
      id: "p1",
      roles: ["user"],
      scopes: ["test:execute"],
      authRequirements: [],
      approvalRequired: false,
    }],
    policies: [],
    actions: [
      {
        id: "a1",
        actionId: "analyze",
        name: "Analyze",
        description: "Analyze something",
        endpoint: null,
        method: "POST",
        parameters: [{ name: "text", type: "string", required: true }],
        riskLevel: "low",
        steps: null,
        authType: null,
        authConfig: null,
        headers: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    author: { id: "user-1" },
  }

  it("executes a built-in skill", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)
    mockPrisma.execution.create.mockResolvedValue({ id: "exec-1" })
    mockPrisma.execution.update.mockResolvedValue({ id: "exec-1" })

    const { hasBuiltinHandler } = await import("@/lib/execution-engine")
    ;(hasBuiltinHandler as any).mockReturnValue(true)

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "contract-analyzer", actionId: "analyze", input: { text: "hello" } }),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.id).toBeDefined()
    expect(body.status).toBe("COMPLETED")
  })

  it("executes an action with no endpoint (parameter validation)", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(skillWithActions)
    mockPrisma.action.findFirst.mockResolvedValue(skillWithActions.actions[0])
    mockPrisma.execution.create.mockResolvedValue({ id: "exec-1" })
    mockPrisma.execution.update.mockResolvedValue({ id: "exec-1", status: "COMPLETED" })

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze", input: { text: "hello" } }),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe("COMPLETED")
  })

  it("rejects unauthenticated requests", async () => {
    const { mockAuth, mockPrisma: mp } = await import("@/__tests__/setup")
    mockAuth.mockResolvedValue({ userId: null })
    mp.apiKey.findUnique.mockResolvedValue(null)

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("authenticates via X-API-Key header", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({
      id: "ak-1",
      key: "hashed_sk_test",
      expiresAt: null,
      userId: "user-1",
      user: { id: "user-1" },
    })
    mockPrisma.agent.findFirst.mockResolvedValue(null)
    mockPrisma.apiKey.update.mockResolvedValue({})
    mockPrisma.skill.findFirst.mockResolvedValue(skillWithActions)
    mockPrisma.action.findFirst.mockResolvedValue(skillWithActions.actions[0])
    mockPrisma.execution.create.mockResolvedValue({ id: "exec-2" })
    mockPrisma.execution.update.mockResolvedValue({ id: "exec-2", status: "COMPLETED" })

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": "sk_test" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze", input: { text: "hello" } }),
      })
    )
    expect(res.status).toBe(200)
  })

  it("returns 404 for unknown skill", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)
    const { hasBuiltinHandler } = await import("@/lib/execution-engine")
    ;(hasBuiltinHandler as any).mockReturnValue(false)

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "nonexistent", actionId: "analyze" }),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe("Skill not found")
  })

  it("returns 403 when skill is not published and not owned by user", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue({
      ...skillWithActions,
      published: false,
      authorId: "other-user",
    })
    mockPrisma.action.findFirst.mockResolvedValue(skillWithActions.actions[0])

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze" }),
      })
    )
    expect(res.status).toBe(403)
  })

  it("returns 404 for unknown action", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(skillWithActions)
    mockPrisma.action.findFirst.mockResolvedValue(null)

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "nonexistent" }),
      })
    )
    expect(res.status).toBe(404)
  })

  it("returns 400 for invalid request body", async () => {
    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
  })

  it("handles external endpoint with SSRF and circuit breaker", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue({
      ...skillWithActions,
      actions: [{
        ...skillWithActions.actions[0],
        endpoint: "https://api.example.com/action",
        method: "POST",
      }],
    })
    mockPrisma.action.findFirst.mockResolvedValue({
      ...skillWithActions.actions[0],
      endpoint: "https://api.example.com/action",
      method: "POST",
    })
    mockPrisma.execution.create.mockResolvedValue({ id: "exec-3" })
    mockPrisma.execution.update.mockResolvedValue({ id: "exec-3", status: "COMPLETED" })

    const { checkSsrf } = await import("@/lib/security")
    ;(checkSsrf as any).mockResolvedValue({ allowed: true })

    // Mock global fetch to simulate external call
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ result: "external success" })),
    })
    vi.stubGlobal("fetch", mockFetch)

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze", input: { text: "hello" } }),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.status).toBe("COMPLETED")

    vi.unstubAllGlobals()
  })

  it("handles rate limited actions", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue({
      ...skillWithActions,
      policies: [{
        id: "pol-1",
        rateLimit: 5,
        rateLimitWindow: 60,
        restrictions: null,
        executionConditions: null,
      }],
    })
    mockPrisma.action.findFirst.mockResolvedValue(skillWithActions.actions[0])
    mockPrisma.execution.count.mockResolvedValue(10) // exceeded rate limit

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze" }),
      })
    )
    expect(res.status).toBe(429)
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findFirst.mockRejectedValue(new Error("DB error"))

    const res = await executeAction(
      makeRequest("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillId: "s1", actionId: "analyze" }),
      })
    )
    expect(res.status).toBe(500)
  })
})
