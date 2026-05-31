import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { GET as listKeys, POST as createKey } from "@/app/api/keys/route"
import { DELETE as deleteKey } from "@/app/api/keys/[id]/route"
import { mockPrisma, mockGetAuthUser } from "@/__tests__/setup"

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

describe("GET /api/keys", () => {
  it("lists user API keys", async () => {
    mockPrisma.apiKey.findMany.mockResolvedValue([
      { id: "ak-1", name: "My Key", keyHint: "abcd1234", lastUsed: null, expiresAt: null, createdAt: new Date(), updatedAt: new Date() },
    ])

    const res = await listKeys()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.keys).toHaveLength(1)
    expect(body.keys[0].name).toBe("My Key")
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await listKeys()
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.apiKey.findMany.mockRejectedValue(new Error("DB error"))
    const res = await listKeys()
    expect(res.status).toBe(500)
  })
})

describe("POST /api/keys", () => {
  it("creates a new API key", async () => {
    mockPrisma.apiKey.create.mockResolvedValue({
      id: "ak-new",
      name: "New Key",
      keyHint: "abcdefgh",
      createdAt: new Date(),
    })

    const res = await createKey(
      makeRequest("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Key" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.apiKey.name).toBe("New Key")
    expect(body.key).toBeDefined()
    expect(body.key.startsWith("sk_")).toBe(true)
  })

  it("rejects missing name", async () => {
    const res = await createKey(
      makeRequest("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      })
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe("Name is required")
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await createKey(
      makeRequest("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Key" }),
      })
    )
    expect(res.status).toBe(401)
  })

  it("returns 500 on error", async () => {
    mockPrisma.apiKey.create.mockRejectedValue(new Error("DB error"))

    const res = await createKey(
      makeRequest("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Key" }),
      })
    )
    expect(res.status).toBe(500)
  })
})

describe("DELETE /api/keys/[id]", () => {
  it("deletes an API key", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue({ id: "ak-1", userId: "user-1" })
    mockPrisma.apiKey.delete.mockResolvedValue({ id: "ak-1" })

    const res = await deleteKey(makeRequest("/api/keys/ak-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "ak-1" }),
    })
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  it("returns 401 when unauthenticated", async () => {
    mockGetAuthUser.mockResolvedValue(null)

    const res = await deleteKey(makeRequest("/api/keys/ak-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "ak-1" }),
    })
    expect(res.status).toBe(401)
  })

  it("returns 404 when key not found or not owned", async () => {
    mockPrisma.apiKey.findUnique.mockResolvedValue(null)

    const res = await deleteKey(makeRequest("/api/keys/ak-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "ak-1" }),
    })
    expect(res.status).toBe(404)
  })

  it("returns 500 on error", async () => {
    mockPrisma.apiKey.findUnique.mockRejectedValue(new Error("DB error"))

    const res = await deleteKey(makeRequest("/api/keys/ak-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "ak-1" }),
    })
    expect(res.status).toBe(500)
  })
})
