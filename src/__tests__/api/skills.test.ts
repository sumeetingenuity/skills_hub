import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { GET as listSkills, POST as createSkill } from "@/app/api/skills/route"
import { GET as getSkill, PATCH as updateSkill, DELETE as deleteSkill } from "@/app/api/skills/[id]/route"
import { GET as searchSkills } from "@/app/api/skills/search/route"
import { GET as vectorSearch } from "@/app/api/skills/vector-search/route"
import { GET as discoverSkills } from "@/app/api/skills/discover/route"
import { POST as seedSkills } from "@/app/api/skills/seed/route"
import { mockPrisma, defaultUser } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function jsonResponse(res: Response) {
  return res.json()
}

// ── GET /api/skills ──────────────────────────────────────────────────────────

describe("GET /api/skills", () => {
  it("lists published skills with pagination", async () => {
    const skills = [
      { id: "s1", slug: "skill-one", name: "Skill One", description: "First skill", category: "AI_ML", tags: ["ai"], published: true, version: 1, author: { id: "u1", name: "Author", avatarUrl: null }, trustScore: { score: 85, verified: true, totalExecutions: 100, totalReviews: 10 }, _count: { actions: 3 }, createdAt: new Date() },
    ]
    mockPrisma.skill.findMany.mockResolvedValue(skills)
    mockPrisma.skill.count.mockResolvedValue(1)

    const res = await listSkills(makeRequest("/api/skills?page=1&limit=10"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skills).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.limit).toBe(10)
  })

  it("filters by category", async () => {
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.findMany.mockResolvedValue([])

    await listSkills(makeRequest("/api/skills?category=AI_ML"))
    const where = mockPrisma.skill.findMany.mock.calls[0][0].where
    expect(where.category).toBe("AI_ML")
  })

  it("searches by keyword", async () => {
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.findMany.mockResolvedValue([])

    await listSkills(makeRequest("/api/skills?search=test"))
    const where = mockPrisma.skill.findMany.mock.calls[0][0].where
    expect(where.OR).toBeDefined()
    expect(where.OR[0].name.contains).toBe("test")
  })

  it("sorts by popularity", async () => {
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.findMany.mockResolvedValue([])

    await listSkills(makeRequest("/api/skills?sort=popularity"))
    const orderBy = mockPrisma.skill.findMany.mock.calls[0][0].orderBy
    expect(orderBy.executions._count).toBe("desc")
  })

  it("sorts by trust", async () => {
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.findMany.mockResolvedValue([])

    await listSkills(makeRequest("/api/skills?sort=trust"))
    const orderBy = mockPrisma.skill.findMany.mock.calls[0][0].orderBy
    expect(orderBy.trustScore.score).toBe("desc")
  })

  it("returns default skills when DB is empty", async () => {
    mockPrisma.skill.count.mockResolvedValue(0)
    mockPrisma.skill.findMany.mockResolvedValue([])

    const res = await listSkills(makeRequest("/api/skills"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skills.length).toBeGreaterThan(0)
    expect(body.skills[0].author.name).toBe("AMTP Team")
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findMany.mockRejectedValue(new Error("DB error"))

    const res = await listSkills(makeRequest("/api/skills"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(500)
    expect(body.error).toBe("Internal server error")
  })
})

// ── POST /api/skills ─────────────────────────────────────────────────────────

describe("POST /api/skills", () => {
  const validBody = {
    name: "New Skill",
    description: "A brand new skill for testing purposes",
    category: "AI_ML",
    tags: ["ai", "test"],
    actions: [{ name: "Action 1", description: "Test action" }],
  }

  it("creates a new skill", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null)
    mockPrisma.skill.create.mockResolvedValue({
      id: "new-skill-1",
      slug: "new-skill",
      name: "New Skill",
      description: "A brand new skill for testing purposes",
      category: "AI_ML",
      tags: ["ai", "test"],
      published: true,
      author: { id: "user-1", name: "Test User", avatarUrl: null },
      actions: [{ id: "a1", actionId: "action-1", name: "Action 1" }],
      trustScore: { score: 50, successRate: 1.0, verified: false },
    })

    const res = await createSkill(
      makeRequest("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      })
    )
    const body = await jsonResponse(res)

    expect(res.status).toBe(201)
    expect(body.skill.name).toBe("New Skill")
    expect(body.slug).toBeDefined()
  })

  it("rejects unauthenticated requests", async () => {
    const { mockAuth, mockGetAuthUser } = await import("@/__tests__/setup")
    mockAuth.mockResolvedValue({ userId: null })
    mockGetAuthUser.mockResolvedValue(null)

    const res = await createSkill(
      makeRequest("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      })
    )
    const body = await jsonResponse(res)
    expect(res.status).toBe(401)
    expect(body.error).toBe("Authentication required")
  })

  it("rejects invalid request body", async () => {
    const res = await createSkill(
      makeRequest("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "x" }), // missing description + actions
      })
    )
    const body = await jsonResponse(res)
    expect(res.status).toBe(400)
    expect(body.error).toBe("Validation failed")
  })

  it("rejects duplicate slug", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "existing", slug: "new-skill" })

    const res = await createSkill(
      makeRequest("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      })
    )
    const body = await jsonResponse(res)
    expect(res.status).toBe(409)
    expect(body.error).toContain("already exists")
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await createSkill(
      makeRequest("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validBody),
      })
    )
    expect(res.status).toBe(500)
  })
})

// ── GET /api/skills/[id] ─────────────────────────────────────────────────────

describe("GET /api/skills/[id]", () => {
  const skillDetail = {
    id: "s1",
    slug: "test-skill",
    name: "Test Skill",
    description: "A test skill",
    category: "AI_ML",
    tags: ["ai"],
    published: true,
    version: 1,
    source: "BUILTIN",
    sourceUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: { id: "u1", name: "Author", avatarUrl: null, bio: null },
    organization: null,
    trustScore: { score: 85, verified: true, successRate: 0.97, uptime: 0.99, totalExecutions: 100, totalReviews: 10 },
    actions: [{ id: "a1", actionId: "analyze", name: "Analyze", description: "Analyze something", endpoint: null, method: "POST", parameters: [], riskLevel: "low" }],
    permissions: [],
    policies: [],
    versions: [],
    reviews: [],
    analytics: [],
    _count: { executions: 100, workflows: 2 },
  }

  it("returns a skill by id", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(skillDetail)

    const res = await getSkill(makeRequest("/api/skills/s1"), { params: Promise.resolve({ id: "s1" }) })
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skill.name).toBe("Test Skill")
  })

  it("returns a skill by slug", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(skillDetail)

    const res = await getSkill(makeRequest("/api/skills/test-skill"), { params: Promise.resolve({ id: "test-skill" }) })
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skill.slug).toBe("test-skill")
  })

  it("returns AMTP markdown when accept header is set", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(skillDetail)

    const res = await getSkill(
      makeRequest("/api/skills/s1", { headers: { Accept: "text/amtp+markdown" } }),
      { params: Promise.resolve({ id: "s1" }) }
    )

    expect(res.status).toBe(200)
    const text = await res.text()
    expect(res.headers.get("Content-Type")).toContain("text/amtp+markdown")
    expect(text).toContain("Test Skill")
  })

  it("falls back to default skills when DB is empty", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)

    const res = await getSkill(makeRequest("/api/skills/contract-analyzer"), { params: Promise.resolve({ id: "contract-analyzer" }) })
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skill.name).toBe("Contract Analyzer")
    expect(body.skill.author.name).toBe("AMTP Team")
  })

  it("returns 404 when skill not found anywhere", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)

    const res = await getSkill(makeRequest("/api/skills/nonexistent"), { params: Promise.resolve({ id: "nonexistent" }) })
    const body = await jsonResponse(res)

    expect(res.status).toBe(404)
    expect(body.error).toBe("Skill not found")
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findFirst.mockRejectedValue(new Error("DB error"))

    const res = await getSkill(makeRequest("/api/skills/s1"), { params: Promise.resolve({ id: "s1" }) })
    expect(res.status).toBe(500)
  })
})

// ── PATCH /api/skills/[id] ───────────────────────────────────────────────────

describe("PATCH /api/skills/[id]", () => {
  it("updates a skill", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue({ id: "s1", slug: "test-skill", authorId: "user-1" })
    mockPrisma.skill.update.mockResolvedValue({
      id: "s1",
      name: "Updated Skill",
      slug: "test-skill",
      description: "Updated description",
      category: "AI_ML",
      tags: ["ai", "updated"],
      published: true,
      author: { id: "user-1", name: "Test User", avatarUrl: null },
      trustScore: { score: 85, verified: true },
      _count: { actions: 2, executions: 10 },
    })

    const res = await updateSkill(
      makeRequest("/api/skills/s1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Skill", description: "Updated description" }),
      }),
      { params: Promise.resolve({ id: "s1" }) }
    )
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skill.name).toBe("Updated Skill")
  })

  it("rejects unauthenticated requests", async () => {
    const { mockGetAuthUser } = await import("@/__tests__/setup")
    mockGetAuthUser.mockResolvedValue(null)

    const res = await updateSkill(
      makeRequest("/api/skills/s1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "s1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("rejects when skill not owned by user", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)

    const res = await updateSkill(
      makeRequest("/api/skills/s1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "s1" }) }
    )
    const body = await jsonResponse(res)
    expect(res.status).toBe(404)
    expect(body.error).toContain("not owned by you")
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findFirst.mockRejectedValue(new Error("DB error"))

    const res = await updateSkill(
      makeRequest("/api/skills/s1", {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "s1" }) }
    )
    expect(res.status).toBe(500)
  })
})

// ── DELETE /api/skills/[id] ──────────────────────────────────────────────────

describe("DELETE /api/skills/[id]", () => {
  it("deletes a skill", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue({ id: "s1", authorId: "user-1" })
    mockPrisma.$transaction.mockResolvedValue([])

    const res = await deleteSkill(makeRequest("/api/skills/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    })
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it("rejects unauthenticated requests", async () => {
    const { mockGetAuthUser } = await import("@/__tests__/setup")
    mockGetAuthUser.mockResolvedValue(null)

    const res = await deleteSkill(makeRequest("/api/skills/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 404 for non-existent or non-owned skill", async () => {
    mockPrisma.skill.findFirst.mockResolvedValue(null)

    const res = await deleteSkill(makeRequest("/api/skills/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    })
    expect(res.status).toBe(404)
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findFirst.mockRejectedValue(new Error("DB error"))

    const res = await deleteSkill(makeRequest("/api/skills/s1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "s1" }),
    })
    expect(res.status).toBe(500)
  })
})

// ── GET /api/skills/search ───────────────────────────────────────────────────

describe("GET /api/skills/search", () => {
  it("searches skills by query", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", slug: "test-skill", name: "Test Skill", description: "A test", category: "AI_ML", version: 1, createdAt: new Date(), author: { id: "u1", name: "A", avatarUrl: null }, trustScore: { score: 80, verified: true }, _count: { actions: 1 } },
    ])

    const res = await searchSkills(makeRequest("/api/skills/search?q=test"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skills).toHaveLength(1)
    expect(mockPrisma.skill.findMany.mock.calls[0][0].where.published).toBe(true)
  })

  it("returns empty array for empty query", async () => {
    const res = await searchSkills(makeRequest("/api/skills/search?q="))
    const body = await jsonResponse(res)
    expect(body.skills).toEqual([])
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findMany.mockRejectedValue(new Error("DB error"))
    const res = await searchSkills(makeRequest("/api/skills/search?q=test"))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/skills/vector-search ────────────────────────────────────────────

describe("GET /api/skills/vector-search", () => {
  it("performs vector search with query", async () => {
    const res = await vectorSearch(makeRequest("/api/skills/vector-search?q=test+query&limit=5"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.results).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it("returns 400 when query is missing", async () => {
    const res = await vectorSearch(makeRequest("/api/skills/vector-search"))
    const body = await jsonResponse(res)
    expect(res.status).toBe(400)
    expect(body.error).toBe("Query parameter q is required")
  })

  it("returns 500 on error", async () => {
    const { vectorSearch: mockVectorSearch } = await import("@/lib/vector-search")
    ;(mockVectorSearch as any).mockRejectedValue(new Error("Service error"))

    const res = await vectorSearch(makeRequest("/api/skills/vector-search?q=test"))
    expect(res.status).toBe(500)
  })
})

// ── GET /api/skills/discover ─────────────────────────────────────────────────

describe("GET /api/skills/discover", () => {
  it("discovers skills with facets", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", slug: "skill-1", name: "Skill 1", description: "First", category: "AI_ML", tags: ["ai"], published: true, version: 1, author: { id: "u1", name: "A", avatarUrl: null }, trustScore: { score: 85, verified: true, totalExecutions: 100 }, _count: { actions: 2, executions: 100 }, createdAt: new Date() },
    ])
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.groupBy.mockResolvedValue([{ category: "AI_ML", _count: { _all: 1 } }])

    const res = await discoverSkills(makeRequest("/api/skills/discover?category=AI_ML&sort=newest"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skills).toHaveLength(1)
    expect(body.facets.categories).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it("filters by verification status", async () => {
    mockPrisma.skill.count.mockResolvedValue(0)
    mockPrisma.skill.groupBy.mockResolvedValue([])
    mockPrisma.skill.findMany.mockResolvedValue([])

    await discoverSkills(makeRequest("/api/skills/discover?verified=true"))
    const where = mockPrisma.skill.findMany.mock.calls[0][0].where
    expect(where.trustScore.verified).toBe(true)
  })

  it("filters by tags", async () => {
    mockPrisma.skill.count.mockResolvedValue(0)
    mockPrisma.skill.groupBy.mockResolvedValue([])
    mockPrisma.skill.findMany.mockResolvedValue([])

    await discoverSkills(makeRequest("/api/skills/discover?tags=ai,ml"))
    const where = mockPrisma.skill.findMany.mock.calls[0][0].where
    expect(where.tags.hasSome).toEqual(["ai", "ml"])
  })

  it("returns default skills when DB is empty", async () => {
    mockPrisma.skill.count.mockResolvedValue(0)
    mockPrisma.skill.findMany.mockResolvedValue([])
    mockPrisma.skill.groupBy.mockResolvedValue([])

    const res = await discoverSkills(makeRequest("/api/skills/discover"))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.skills.length).toBeGreaterThan(0)
    expect(body._fallback).toBe(true)
  })

  it("returns AMTP markdown when requested", async () => {
    mockPrisma.skill.findMany.mockResolvedValue([
      { id: "s1", slug: "test", name: "Test", description: "test", category: "AI_ML", tags: [], published: true, version: 1, author: { id: "u1", name: "A", avatarUrl: null }, trustScore: { score: 80, verified: true, totalExecutions: 50 }, _count: { actions: 1, executions: 50 }, createdAt: new Date() },
    ])
    mockPrisma.skill.count.mockResolvedValue(1)
    mockPrisma.skill.groupBy.mockResolvedValue([])

    const res = await discoverSkills(
      makeRequest("/api/skills/discover", { headers: { Accept: "text/amtp+markdown" } })
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/amtp+markdown")
  })
})

// ── POST /api/skills/seed ────────────────────────────────────────────────────

describe("POST /api/skills/seed", () => {
  it("seeds default skills into database", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue(null)
    mockPrisma.skill.create.mockResolvedValue({ id: "seed-1", slug: "contract-analyzer" })

    const res = await seedSkills(makeRequest("/api/skills/seed", { method: "POST" }))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.results[0].status).toBe("created")
  })

  it("skips existing skills", async () => {
    mockPrisma.skill.findUnique.mockResolvedValue({ id: "existing", slug: "contract-analyzer" })

    const res = await seedSkills(makeRequest("/api/skills/seed", { method: "POST" }))
    const body = await jsonResponse(res)

    expect(res.status).toBe(200)
    expect(body.results[0].status).toBe("exists")
  })

  it("rejects unauthenticated requests", async () => {
    const { mockGetAuthUser } = await import("@/__tests__/setup")
    mockGetAuthUser.mockResolvedValue(null)

    const res = await seedSkills(makeRequest("/api/skills/seed", { method: "POST" }))
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.skill.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await seedSkills(makeRequest("/api/skills/seed", { method: "POST" }))
    expect(res.status).toBe(500)
  })
})
