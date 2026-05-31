import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST as importSkill } from "@/app/api/import/route"
import { POST as analyzeImport } from "@/app/api/import/analyze/route"
import { GET as getImportJob } from "@/app/api/import/[id]/route"
import { mockPrisma, mockAuth } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

describe("POST /api/import", () => {
  it("imports a skill from GitHub", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "test@example.com",
      name: "Test User",
    })
    mockPrisma.skill.findUnique.mockResolvedValue(null)
    mockPrisma.skill.create.mockResolvedValue({
      id: "imported-skill-1",
      slug: "test-repo",
      name: "test-repo",
    })
    mockPrisma.importJob.create.mockResolvedValue({})

    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.slug).toBe("test-repo")
    expect(body.status).toBe("COMPLETED")
  })

  it("rejects requests without source", async () => {
    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toContain("source is required")
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 for unsupported source type", async () => {
    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "UNSUPPORTED" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("autocreates user if not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: "user-new",
      clerkId: "clerk-1",
      email: "user-clerk-1@clerk.dev",
    })
    mockPrisma.skill.findUnique.mockResolvedValue(null)
    mockPrisma.skill.create.mockResolvedValue({ id: "s1", slug: "test-repo" })
    mockPrisma.importJob.create.mockResolvedValue({})

    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    expect(res.status).toBe(201)
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await importSkill(
      makeRequest("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    expect(res.status).toBe(500)
  })
})

describe("POST /api/import/analyze", () => {
  it("analyzes a GitHub repo", async () => {
    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.manifest.name).toBe("test-repo")
    expect(body.detectedFeatures).toContain("feature-a")
  })

  it("analyzes an MCP server", async () => {
    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "MCP", sourceUrl: "https://mcp.example.com" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.manifest.name).toBe("MCP Server")
  })

  it("analyzes an OpenAPI spec", async () => {
    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "OPENAPI", sourceUrl: "https://api.example.com/openapi.json" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.manifest.name).toBe("API Skill")
  })

  it("analyzes AMTP markdown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("---\ntitle: My AMTP Skill\ncategory: AI_ML\n---\n# My Skill\nSome description"),
    }))

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "AMTP_MARKDOWN", sourceUrl: "https://example.com/skill.md" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.manifest.name).toBe("My AMTP Skill")
    expect(body.manifest.category).toBe("AI_ML")

    vi.unstubAllGlobals()
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB", sourceUrl: "https://github.com/test/repo" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("rejects missing sourceUrl", async () => {
    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "GITHUB" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("rejects unsupported source type", async () => {
    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "BAD_SOURCE", sourceUrl: "https://example.com" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("returns 500 on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")))

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "AMTP_MARKDOWN", sourceUrl: "https://example.com/skill.md" }),
      })
    )
    expect(res.status).toBe(400)

    vi.unstubAllGlobals()
  })
})

describe("GET /api/import/[id]", () => {
  it("returns import job status", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue({
      id: "job-1",
      source: "GITHUB",
      status: "COMPLETED",
      sourceUrl: "https://github.com/test/repo",
      log: "Import completed",
    })

    const res = await getImportJob(makeRequest("/api/import/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe("COMPLETED")
  })

  it("returns 404 when job not found", async () => {
    mockPrisma.importJob.findUnique.mockResolvedValue(null)

    const res = await getImportJob(makeRequest("/api/import/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    })
    const body = await res.json()
    expect(res.status).toBe(404)
    expect(body.error).toBe("Import job not found")
  })

  it("returns 500 on error", async () => {
    mockPrisma.importJob.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await getImportJob(makeRequest("/api/import/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    })
    expect(res.status).toBe(500)
  })
})
