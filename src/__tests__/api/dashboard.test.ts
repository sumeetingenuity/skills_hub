import { describe, it, expect } from "vitest"
import { GET as getDashboard } from "@/app/api/dashboard/route"
import { GET as getDashboardSkills } from "@/app/api/dashboard/skills/route"
import { mockPrisma, mockGetAuthUser } from "@/__tests__/setup"

describe("GET /api/dashboard", () => {
  it("returns dashboard data", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      _count: { skills: 3, executions: 10, reviews: 2, workflows: 1 },
    })
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", name: "My Skill", slug: "my-skill", _count: { executions: 5, actions: 2 }, trustScore: { score: 80 } },
    ])
    mockPrisma.execution.findMany.mockResolvedValue([
      { id: "e1", status: "COMPLETED", createdAt: new Date(), skill: { name: "My Skill", slug: "my-skill" } },
    ])

    const res = await getDashboard()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.user).toBeDefined()
    expect(body.mySkills).toHaveLength(1)
    expect(body.recentExecutions).toHaveLength(1)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await getDashboard()
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"))
    const res = await getDashboard()
    expect(res.status).toBe(500)
  })
})

describe("GET /api/dashboard/skills", () => {
  it("returns user's skills", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", name: "Skill", _count: { executions: 5, actions: 2 }, trustScore: { score: 80 } },
    ])

    const res = await getDashboardSkills()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.skills).toHaveLength(1)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null)
    const res = await getDashboardSkills()
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findMany.mockRejectedValue(new Error("DB error"))
    const res = await getDashboardSkills()
    expect(res.status).toBe(500)
  })
})
