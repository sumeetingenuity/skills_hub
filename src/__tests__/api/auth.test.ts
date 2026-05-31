import { describe, it, expect, vi } from "vitest"
import { GET as getMe } from "@/app/api/auth/me/route"
import { POST as syncAuth } from "@/app/api/auth/sync/route"
import { NextRequest } from "next/server"
import { mockPrisma, mockAuth, mockCurrentUser } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

describe("GET /api/auth/me", () => {
  it("returns current authenticated user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: null,
      _count: { skills: 3, executions: 10, reviews: 2, workflows: 1 },
      badges: [],
      organizations: [],
    })

    const res = await getMe()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user.email).toBe("test@example.com")
  })

  it("auto-creates user when not found locally", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockCurrentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "new@example.com" }],
      fullName: "New User",
      firstName: "New",
      imageUrl: null,
    })
    mockPrisma.user.create.mockResolvedValue({
      id: "user-new",
      clerkId: "clerk-1",
      email: "new@example.com",
      name: "New User",
      avatarUrl: null,
      _count: { skills: 0, executions: 0, reviews: 0, workflows: 0 },
      badges: [],
      organizations: [],
    })

    const res = await getMe()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user.email).toBe("new@example.com")
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await getMe()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"))
    const res = await getMe()
    expect(res.status).toBe(500)
  })
})

describe("POST /api/auth/sync", () => {
  it("syncs user data", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "updated@example.com",
      name: "Updated Name",
      avatarUrl: "https://example.com/avatar.png",
    })

    const res = await syncAuth(
      makeRequest("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "updated@example.com",
          name: "Updated Name",
          avatarUrl: "https://example.com/avatar.png",
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user.name).toBe("Updated Name")
  })

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await syncAuth(
      makeRequest("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.upsert.mockRejectedValue(new Error("DB error"))

    const res = await syncAuth(
      makeRequest("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "test@example.com" }),
      })
    )
    expect(res.status).toBe(500)
  })
})
