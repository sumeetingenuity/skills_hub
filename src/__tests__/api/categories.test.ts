import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET as listCategories } from "@/app/api/categories/route"
import { mockPrisma } from "@/__tests__/setup"

function makeRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

describe("GET /api/categories", () => {
  it("returns categories with counts", async () => {
    mockPrisma.skill.groupBy.mockResolvedValue([
      { category: "AI_ML", _count: { category: 5 } },
    ])

    const res = await listCategories(makeRequest("/api/categories"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.categories).toContain("AI_ML")
    expect(body.detailed).toBeDefined()
    const aiMl = body.detailed.find((c: any) => c.name === "AI_ML")
    expect(aiMl.count).toBe(5)
  })

  it("returns fallback on DB error", async () => {
    mockPrisma.skill.groupBy.mockRejectedValue(new Error("DB error"))

    const res = await listCategories(makeRequest("/api/categories"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.categories).toContain("AI_ML")
  })
})
