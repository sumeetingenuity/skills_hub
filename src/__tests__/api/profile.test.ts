import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET as getProfile } from "@/app/api/profile/[id]/route"
import { mockPrisma } from "@/__tests__/setup"

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

describe("GET /api/profile/[id]", () => {
  const profileUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    avatarUrl: null,
    bio: "A test user",
    createdAt: new Date(),
    badges: [],
    _count: { skills: 3, executions: 10, reviews: 2 },
  }

  it("returns user profile", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(profileUser)
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", slug: "skill-1", name: "Skill 1", description: "Desc", category: "AI_ML", tags: ["ai"], published: true, version: 1, author: { id: "u1", name: "A", avatarUrl: null }, trustScore: { score: 85, verified: true, totalExecutions: 100, totalReviews: 10 }, _count: { actions: 2 }, createdAt: new Date() },
    ])

    const res = await getProfile(makeRequest("/api/profile/user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user.name).toBe("Test User")
    expect(body.skills).toHaveLength(1)
  })

  it("finds user by clerkId", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(profileUser)
    mockPrisma.skill.findMany.mockResolvedValue([])

    const res = await getProfile(makeRequest("/api/profile/clerk-1"), {
      params: Promise.resolve({ id: "clerk-1" }),
    })
    expect(res.status).toBe(200)
  })

  it("returns 404 when user not found", async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null)

    const res = await getProfile(makeRequest("/api/profile/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe("User not found")
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.findFirst.mockRejectedValue(new Error("DB error"))
    const res = await getProfile(makeRequest("/api/profile/user-1"), {
      params: Promise.resolve({ id: "user-1" }),
    })
    expect(res.status).toBe(500)
  })
})
