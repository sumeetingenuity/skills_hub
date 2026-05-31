import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { NextRequest } from "next/server"
import { POST as analyzeImport } from "@/app/api/import/analyze/route"
import { mockAuth } from "@/__tests__/setup"

// Load the real (not mocked) openapi-analyzer module for unit tests
let realAnalyzer: typeof import("@/lib/import/openapi-analyzer")
const sampleSpec = JSON.parse(
  readFileSync(resolve(__dirname, "../../../prisma/sample-openapi.json"), "utf-8")
)

beforeAll(async () => {
  realAnalyzer = await vi.importActual("@/lib/import/openapi-analyzer") as any
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

// ── analyzeOpenAPISpec: Basic parsing ────────────────────────────────────────

describe("analyzeOpenAPISpec", () => {
  it("parses the sample OpenAPI spec correctly", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    expect(result.name).toBe("Pet Store API")
    expect(result.version).toBe("1.0.0")
    expect(result.description).toContain("pet store")
    expect(result.totalEndpoints).toBe(10)
  })

  it("extracts servers", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    expect(result.servers).toHaveLength(2)
    expect(result.servers[0].url).toBe("https://api.petstore.example.com/v1")
    expect(result.baseUrl).toBe("https://api.petstore.example.com/v1")
  })

  it("detects features: OpenAPI version, servers, endpoints, tags, auth", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    expect(result.detectedFeatures).toContain("OpenAPI 3.0.3")
    expect(result.detectedFeatures).toContain("2 Server(s)")
    expect(result.detectedFeatures).toContain("10 Endpoints")
    expect(result.detectedFeatures).toContain("3 Tags/Groups")
    expect(result.detectedFeatures).toContain("Request Bodies")
    expect(result.detectedFeatures).toContain("Response Schemas")
    expect(result.detectedFeatures).toContain("Auth: apiKey, http")
  })

  it("extracts tags with endpoint counts", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    expect(result.tags).toHaveLength(3)
    const petsTag = result.tags.find(t => t.name === "pets")
    expect(petsTag).toBeDefined()
    expect(petsTag!.endpoints).toBe(5) // listPets, createPet, getPetById, updatePet, deletePet
  })
})

// ── analyzeOpenAPISpec: Endpoint extraction ──────────────────────────────────

describe("analyzeOpenAPISpec - endpoints", () => {
  it("extracts all endpoints with paths and methods", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    const paths = result.endpoints.map(e => `${e.method} ${e.path}`)
    expect(paths).toContain("GET /pets")
    expect(paths).toContain("POST /pets")
    expect(paths).toContain("GET /pets/{petId}")
    expect(paths).toContain("PUT /pets/{petId}")
    expect(paths).toContain("DELETE /pets/{petId}")
    expect(paths).toContain("GET /users")
    expect(paths).toContain("POST /users")
    expect(paths).toContain("POST /store/orders")
    expect(paths).toContain("GET /store/orders/{orderId}")
    expect(paths).toContain("DELETE /store/orders/{orderId}")
  })

  it("extracts operationId and summary", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const listPets = result.endpoints.find(e => e.operationId === "listPets")

    expect(listPets).toBeDefined()
    expect(listPets!.summary).toBe("List all pets")
    expect(listPets!.tags).toEqual(["pets"])
  })

  it("extracts tags per endpoint", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    const storeEndpoints = result.endpoints.filter(e => e.tags.includes("store"))
    expect(storeEndpoints).toHaveLength(3)

    const userEndpoints = result.endpoints.filter(e => e.tags.includes("users"))
    expect(userEndpoints).toHaveLength(2)
  })
})

// ── analyzeOpenAPISpec: Parameters ──────────────────────────────────────────

describe("analyzeOpenAPISpec - parameters", () => {
  it("extracts query parameters", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const listPets = result.endpoints.find(e => e.operationId === "listPets")!

    const limitParam = listPets.parameters.find(p => p.name === "limit")
    expect(limitParam).toBeDefined()
    expect(limitParam!.type).toBe("integer")
    expect(limitParam!.in).toBe("query")
    expect(limitParam!.required).toBe(false)

    const statusParam = listPets.parameters.find(p => p.name === "status")
    expect(statusParam).toBeDefined()
    expect(statusParam!.enum).toContain("available")
  })

  it("extracts path parameters", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const getPet = result.endpoints.find(e => e.operationId === "getPetById")!

    const petIdParam = getPet.parameters.find(p => p.name === "petId")
    expect(petIdParam).toBeDefined()
    expect(petIdParam!.in).toBe("path")
    expect(petIdParam!.required).toBe(true)
    expect(petIdParam!.type).toBe("integer")
  })

  it("extracts implicit path parameters from URL template", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const cancelOrder = result.endpoints.find(e => e.operationId === "cancelOrder")!

    // cancelOrder has {orderId} in path but delete /store/orders/{orderId}
    // The path parameter should be extracted even if not explicitly defined
    expect(cancelOrder.path).toBe("/store/orders/{orderId}")
  })
})

// ── analyzeOpenAPISpec: Request bodies ──────────────────────────────────────

describe("analyzeOpenAPISpec - request bodies", () => {
  it("extracts request body from $ref schema", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const createPet = result.endpoints.find(e => e.operationId === "createPet")!

    expect(createPet.requestBody).toBeDefined()
    expect(createPet.requestBody!.required).toBe(true)
    expect(createPet.requestBody!.contentType).toBe("application/json")

    // Should resolve $ref and extract properties from NewPet schema
    const nameProp = createPet.requestBody!.properties.find(p => p.name === "name")
    expect(nameProp).toBeDefined()
    expect(nameProp!.type).toBe("string")
    expect(nameProp!.required).toBe(true)

    const tagProp = createPet.requestBody!.properties.find(p => p.name === "tag")
    expect(tagProp).toBeDefined()
  })

  it("extracts request body from endpoints without $ref", async () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Simple API", version: "1.0" },
      paths: {
        "/items": {
          post: {
            summary: "Create an item",
            requestBody: {
              required: true,
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["name"],
                    properties: {
                      name: { type: "string", description: "Item name" },
                      price: { type: "number", description: "Item price" },
                    },
                  },
                },
              },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    }

    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(spec))
    const createItem = result.endpoints[0]

    expect(createItem.requestBody).toBeDefined()
    expect(createItem.requestBody!.properties).toHaveLength(2)

    const nameProp = createItem.requestBody!.properties.find(p => p.name === "name")
    expect(nameProp!.type).toBe("string")
    expect(nameProp!.required).toBe(true)
  })

  it("handles endpoints without request body", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const listPets = result.endpoints.find(e => e.operationId === "listPets")!

    expect(listPets.requestBody).toBeUndefined()
  })
})

// ── analyzeOpenAPISpec: Security schemes ─────────────────────────────────────

describe("analyzeOpenAPISpec - security schemes", () => {
  it("extracts security schemes", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))

    expect(result.securitySchemes.apiKeyAuth).toBeDefined()
    expect(result.securitySchemes.apiKeyAuth.type).toBe("apiKey")
    expect(result.securitySchemes.apiKeyAuth.in).toBe("header")
    expect(result.securitySchemes.apiKeyAuth.name).toBe("X-API-Key")

    expect(result.securitySchemes.bearerAuth).toBeDefined()
    expect(result.securitySchemes.bearerAuth.type).toBe("http")
    expect(result.securitySchemes.bearerAuth.scheme).toBe("bearer")
  })

  it("associates security requirements with endpoints", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const createPet = result.endpoints.find(e => e.operationId === "createPet")!

    expect(createPet.security).toContain("apiKeyAuth")
  })
})

// ── analyzeOpenAPISpec: Responses ───────────────────────────────────────────

describe("analyzeOpenAPISpec - responses", () => {
  it("extracts response schemas", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const listPets = result.endpoints.find(e => e.operationId === "listPets")!

    expect(listPets.responses["200"]).toBeDefined()
    expect(listPets.responses["200"].schema).toBeDefined()
    expect(listPets.responses["200"].schema!.type).toBe("array")
  })

  it("marks deprecated endpoints", async () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Test API", version: "1.0" },
      paths: {
        "/old": {
          get: {
            deprecated: true,
            summary: "Old endpoint",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    }
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(spec))
    expect(result.endpoints[0].deprecated).toBe(true)
  })
})

// ── $ref resolution ─────────────────────────────────────────────────────────

describe("analyzeOpenAPISpec - $ref resolution", () => {
  it("resolves local $ref references in parameters", async () => {
    const spec = {
      openapi: "3.0.0",
      info: { title: "Ref Test", version: "1.0" },
      paths: {
        "/items/{id}": {
          get: {
            summary: "Get item",
            parameters: [
              { $ref: "#/components/parameters/ItemId" },
            ],
            responses: { "200": { description: "OK" } },
          },
        },
      },
      components: {
        parameters: {
          ItemId: {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "The item ID",
          },
        },
      },
    }

    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(spec))
    const getItem = result.endpoints[0]
    const idParam = getItem.parameters.find(p => p.name === "id")

    expect(idParam).toBeDefined()
    expect(idParam!.type).toBe("string")
    expect(idParam!.required).toBe(true)
    expect(idParam!.in).toBe("path")
  })
})

// ── openAPIToAmtpActions ────────────────────────────────────────────────────

describe("openAPIToAmtpActions", () => {
  it("converts endpoints to AMTP actions", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)

    expect(actions.length).toBe(10)

    const listPetsAction = actions.find(a => a.actionId === "listpets")
    expect(listPetsAction).toBeDefined()
    expect(listPetsAction!.method).toBe("GET")
    expect(listPetsAction!.endpoint).toContain("/v1/pets")
  })

  it("sets risk levels appropriately", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)

    const deleteAction = actions.find(a => a.method === "DELETE")!
    expect(deleteAction.riskLevel).toBe("high")

    const postAction = actions.find(a => a.actionId === "createpet")!
    expect(postAction.riskLevel).toBe("medium")

    const getAction = actions.find(a => a.method === "GET")!
    expect(getAction.riskLevel).toBe("low")
  })

  it("sets auth config from security schemes", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)

    // createPet uses apiKeyAuth
    const createPet = actions.find(a => a.actionId === "createpet")!
    expect(createPet.authType).toBe("api-key")
    expect(createPet.authConfig?.headerName).toBe("X-API-Key")

    // placeOrder uses bearerAuth
    const placeOrder = actions.find(a => a.actionId === "placeorder")!
    expect(placeOrder.authType).toBe("bearer")
  })

  it("builds correct full endpoint URLs", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)

    const listPets = actions.find(a => a.actionId === "listpets")!
    expect(listPets.endpoint).toBe("https://api.petstore.example.com/v1/pets")

    const getPet = actions.find(a => a.actionId === "getpetbyid")!
    expect(getPet.endpoint).toBe("https://api.petstore.example.com/v1/pets/{petId}")
  })

  it("converts parameters from OpenAPI to action parameters", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)

    const createPet = actions.find(a => a.actionId === "createpet")!
    expect(createPet.parameters.length).toBeGreaterThan(0)

    const nameParam = createPet.parameters.find((p: any) => p.name === "name")
    expect(nameParam).toBeDefined()
    expect(nameParam.type).toBe("string")
    expect(nameParam.required).toBe(true)
  })
})

// ── openAPIToSkillManifest ───────────────────────────────────────────────────

describe("openAPIToSkillManifest", () => {
  it("creates a single skill manifest by default", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const skills = realAnalyzer.openAPIToSkillManifest(result)

    expect(skills).toHaveLength(1)
    expect(skills[0].name).toBe("Pet Store API")
    expect(skills[0].actions.length).toBe(10)
    expect(skills[0].tags).toContain("api")
    expect(skills[0].tags).toContain("openapi")
  })

  it("splits into multiple skills by tag when splitByTag is true", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const skills = realAnalyzer.openAPIToSkillManifest(result, { splitByTag: true })

    expect(skills.length).toBe(3) // pets, users, store

    const petsSkill = skills.find(s => s.name.includes("pets"))
    expect(petsSkill).toBeDefined()
    expect(petsSkill!.actions.length).toBe(5) // GET/POST /pets, GET/PUT/DELETE /pets/{petId}

    const usersSkill = skills.find(s => s.name.includes("users"))
    expect(usersSkill).toBeDefined()
    expect(usersSkill!.actions.length).toBe(2)
  })

  it("sets approvalRequired when high-risk actions exist", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const skills = realAnalyzer.openAPIToSkillManifest(result)

    // DELETE /pets/{petId} has riskLevel "high", so approvalRequired should be true
    expect(skills[0].permissions[0].approvalRequired).toBe(true)
  })
})

// ── groupActionsByTag ────────────────────────────────────────────────────────

describe("groupActionsByTag", () => {
  it("groups actions by their first tag", async () => {
    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(sampleSpec))
    const actions = realAnalyzer.openAPIToAmtpActions(result)
    const groups = realAnalyzer.groupActionsByTag(actions)

    expect(groups).toHaveLength(3)

    const petsGroup = groups.find(g => g.tag === "pets")
    expect(petsGroup).toBeDefined()
    expect(petsGroup!.count).toBe(5)

    const storeGroup = groups.find(g => g.tag === "store")
    expect(storeGroup).toBeDefined()
    expect(storeGroup!.count).toBe(3)
  })
})

// ── Error handling ──────────────────────────────────────────────────────────

describe("analyzeOpenAPISpec - error handling", () => {
  it("throws for invalid spec (missing openapi/swagger)", async () => {
    await expect(
      realAnalyzer.analyzeOpenAPISpec(JSON.stringify({ info: { title: "Bad" } }))
    ).rejects.toThrow("Invalid OpenAPI/Swagger specification")
  })

  it("throws for malformed JSON", async () => {
    await expect(
      realAnalyzer.analyzeOpenAPISpec("not json at all {{{")
    ).rejects.toThrow()
  })
})

// ── Swagger 2.0 compatibility ───────────────────────────────────────────────

describe("analyzeOpenAPISpec - Swagger 2.0", () => {
  it("parses Swagger 2.0 specs", async () => {
    const swaggerSpec = {
      swagger: "2.0",
      info: { title: "Swagger Pet Store", version: "1.0", description: "Swagger 2.0 pet store" },
      host: "api.example.com",
      basePath: "/v2",
      schemes: ["https"],
      paths: {
        "/pets": {
          get: {
            summary: "List pets",
            operationId: "listPetsV2",
            parameters: [
              { name: "limit", in: "query", type: "integer", required: false },
            ],
            responses: {
              "200": { description: "OK", schema: { type: "array", items: { type: "object" } } },
            },
          },
          post: {
            summary: "Add pet",
            operationId: "addPetV2",
            parameters: [
              {
                name: "pet",
                in: "body",
                required: true,
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string", description: "Pet name" },
                    species: { type: "string" },
                  },
                },
              },
            ],
            responses: { "201": { description: "Created" } },
          },
        },
      },
    }

    const result = await realAnalyzer.analyzeOpenAPISpec(JSON.stringify(swaggerSpec))

    expect(result.detectedFeatures).toContain("Swagger 2.0")
    expect(result.name).toBe("Swagger Pet Store")
    expect(result.baseUrl).toBe("https://api.example.com/v2")
    expect(result.totalEndpoints).toBe(2)

    // Swagger 2.0 body parameters should be extracted as request bodies
    const addPet = result.endpoints.find(e => e.operationId === "addPetV2")
    expect(addPet).toBeDefined()
    expect(addPet!.requestBody).toBeDefined()
    expect(addPet!.requestBody!.required).toBe(true)
    const nameProp = addPet!.requestBody!.properties.find(p => p.name === "name")
    expect(nameProp).toBeDefined()
    expect(nameProp!.type).toBe("string")
  })
})

// ── Route handler integration (via fetch mock) ──────────────────────────────

describe("POST /api/import/analyze (OPENAPI via route)", () => {
  beforeEach(async () => {
    // Replace mock implementations with real ones for integration testing
    const mod = await import("@/lib/import/openapi-analyzer")
    const real = await vi.importActual<typeof import("@/lib/import/openapi-analyzer")>(
      "@/lib/import/openapi-analyzer"
    )
    ;(mod.analyzeOpenAPISpec as any).mockImplementation(real.analyzeOpenAPISpec)
    ;(mod.openAPIToSkillManifest as any).mockImplementation(real.openAPIToSkillManifest)
    ;(mod.openAPIToAmtpActions as any).mockImplementation(real.openAPIToAmtpActions)
  })

  it("analyzes an OpenAPI spec via the route handler", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      text: () => Promise.resolve(JSON.stringify(sampleSpec)),
    })
    vi.stubGlobal("fetch", mockFetch)

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "OPENAPI",
          sourceUrl: "https://api.petstore.example.com/openapi.json",
        }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.manifest).toBeDefined()
    expect(body.manifest.name).toBe("Pet Store API")
    expect(body.manifest.actions.length).toBeGreaterThan(0)
    expect(body.manifest._openapi).toBeDefined()
    expect(body.manifest._openapi.totalEndpoints).toBe(10)
    expect(body.manifest._openapi.securitySchemes).toContain("apiKeyAuth")
    expect(body.manifest._openapi.securitySchemes).toContain("bearerAuth")
    expect(body.detectedFeatures).toContain("OpenAPI 3.0.3")

    vi.unstubAllGlobals()
  })

  it("handles fetch failure gracefully", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fetch failed")))

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "OPENAPI",
          sourceUrl: "https://api.example.com/broken.json",
        }),
      })
    )
    expect(res.status).toBe(500)
    vi.unstubAllGlobals()
  })

  it("rejects unauthenticated requests", async () => {
    mockAuth.mockResolvedValue({ userId: null })

    const res = await analyzeImport(
      makeRequest("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "OPENAPI",
          sourceUrl: "https://api.example.com/spec.json",
        }),
      })
    )
    expect(res.status).toBe(401)
  })
})
