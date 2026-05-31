import { describe, it, expect, vi } from "vitest"
import { NextRequest } from "next/server"
import { GET as listWorkflows, POST as createWorkflow } from "@/app/api/workflows/route"
import { GET as getWorkflow, PUT as updateWorkflow, DELETE as deleteWorkflow } from "@/app/api/workflows/[id]/route"
import { POST as executeWorkflow } from "@/app/api/workflows/execute/route"
import { mockPrisma, mockAuth } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

describe("GET /api/workflows", () => {
  it("lists published workflows", async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([
      {
        id: "wf-1",
        name: "Test Workflow",
        slug: "test-workflow",
        description: "A test workflow",
        published: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        skills: [],
        author: { name: "Author", avatarUrl: null },
      },
    ])
    mockPrisma.workflow.count.mockResolvedValue(1)

    const res = await listWorkflows(makeRequest("/api/workflows?page=1&limit=10"))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.workflows).toHaveLength(1)
    expect(body.total).toBe(1)
  })

  it("returns 500 on error", async () => {
    mockPrisma.workflow.findMany.mockRejectedValue(new Error("DB error"))
    const res = await listWorkflows(makeRequest("/api/workflows"))
    expect(res.status).toBe(500)
  })
})

describe("POST /api/workflows", () => {
  it("creates a workflow", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "test@example.com",
      name: "Test User",
    })
    mockPrisma.workflow.findUnique.mockResolvedValue(null)
    mockPrisma.workflow.create.mockResolvedValue({
      id: "wf-new",
      name: "New Workflow",
      slug: "new-workflow",
      published: true,
      skills: [],
      author: { name: "Test User", avatarUrl: null },
    })

    const res = await createWorkflow(
      makeRequest("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Workflow", description: "A new workflow", skillIds: ["s1", "s2"] }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.name).toBe("New Workflow")
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await createWorkflow(
      makeRequest("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Workflow", skillIds: ["s1"] }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("rejects missing name or skillIds", async () => {
    const res = await createWorkflow(
      makeRequest("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Workflow" }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("auto-creates user if not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({
      id: "user-new",
      clerkId: "clerk-1",
      email: "user-clerk-1@skillhub.dev",
      name: "User",
    })
    mockPrisma.workflow.findUnique.mockResolvedValue(null)
    mockPrisma.workflow.create.mockResolvedValue({
      id: "wf-new",
      name: "New Workflow",
      slug: "new-workflow",
      published: true,
      skills: [],
      author: { name: "User", avatarUrl: null },
    })

    const res = await createWorkflow(
      makeRequest("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Workflow", skillIds: ["s1"] }),
      })
    )
    expect(res.status).toBe(201)
  })

  it("returns 500 on error", async () => {
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await createWorkflow(
      makeRequest("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Workflow", skillIds: ["s1"] }),
      })
    )
    expect(res.status).toBe(500)
  })
})

describe("GET /api/workflows/[id]", () => {
  it("returns a workflow by id", async () => {
    mockPrisma.workflow.findFirst.mockResolvedValue({
      id: "wf-1",
      name: "Test Workflow",
      slug: "test-workflow",
      published: true,
      skills: [],
      author: { name: "Author", avatarUrl: null },
    })

    const res = await getWorkflow(makeRequest("/api/workflows/wf-1"), {
      params: Promise.resolve({ id: "wf-1" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe("Test Workflow")
  })

  it("returns 404 when not found", async () => {
    mockPrisma.workflow.findFirst.mockResolvedValue(null)

    const res = await getWorkflow(makeRequest("/api/workflows/nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    })
    expect(res.status).toBe(404)
  })

  it("returns 500 on error", async () => {
    mockPrisma.workflow.findFirst.mockRejectedValue(new Error("DB error"))
    const res = await getWorkflow(makeRequest("/api/workflows/wf-1"), {
      params: Promise.resolve({ id: "wf-1" }),
    })
    expect(res.status).toBe(500)
  })
})

describe("PUT /api/workflows/[id]", () => {
  it("updates a workflow", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue({
      id: "wf-1",
      name: "Old Name",
      description: "Old desc",
    })
    mockPrisma.workflowSkill.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.workflow.update.mockResolvedValue({
      id: "wf-1",
      name: "Updated Workflow",
      description: "Updated desc",
      skills: [],
      author: { name: "Author", avatarUrl: null },
    })

    const res = await updateWorkflow(
      makeRequest("/api/workflows/wf-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Workflow", description: "Updated desc", skillIds: ["s1"] }),
      }),
      { params: Promise.resolve({ id: "wf-1" }) }
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.name).toBe("Updated Workflow")
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await updateWorkflow(
      makeRequest("/api/workflows/wf-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "wf-1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when not found", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue(null)

    const res = await updateWorkflow(
      makeRequest("/api/workflows/wf-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "wf-1" }) }
    )
    expect(res.status).toBe(404)
  })

  it("returns 500 on error", async () => {
    mockPrisma.workflow.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await updateWorkflow(
      makeRequest("/api/workflows/wf-1", {
        method: "PUT",
        body: JSON.stringify({ name: "Updated" }),
      }),
      { params: Promise.resolve({ id: "wf-1" }) }
    )
    expect(res.status).toBe(500)
  })
})

describe("DELETE /api/workflows/[id]", () => {
  it("deletes a workflow", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue({ id: "wf-1" })
    mockPrisma.workflowSkill.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.workflow.delete.mockResolvedValue({ id: "wf-1" })

    const res = await deleteWorkflow(makeRequest("/api/workflows/wf-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "wf-1" }),
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toBe("Workflow deleted")
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await deleteWorkflow(makeRequest("/api/workflows/wf-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "wf-1" }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 404 when not found", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue(null)

    const res = await deleteWorkflow(makeRequest("/api/workflows/wf-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "wf-1" }),
    })
    expect(res.status).toBe(404)
  })
})

describe("POST /api/workflows/execute", () => {
  it("executes a workflow sequentially", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue({
      id: "wf-1",
      name: "Test Workflow",
      skills: [
        {
          order: 0,
          skill: {
            id: "s1",
            name: "Skill 1",
            actions: [{ id: "a1", name: "Action 1", endpoint: null, method: "POST" }],
          },
        },
      ],
    })
    mockPrisma.execution.create.mockResolvedValue({})

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ result: "ok" })),
    }))

    const res = await executeWorkflow(
      makeRequest("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1", input: { data: "test" } }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.workflowId).toBe("wf-1")
    expect(body.status).toBe("COMPLETED")
    expect(body.results).toHaveLength(1)

    vi.unstubAllGlobals()
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await executeWorkflow(
      makeRequest("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "wf-1" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("rejects missing workflowId", async () => {
    const res = await executeWorkflow(
      makeRequest("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 when workflow not found", async () => {
    mockPrisma.workflow.findUnique.mockResolvedValue(null)

    const res = await executeWorkflow(
      makeRequest("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: "nonexistent" }),
      })
    )
    expect(res.status).toBe(404)
  })
})
