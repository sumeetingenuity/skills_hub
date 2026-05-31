import { vi, beforeEach } from "vitest"
import { DEFAULT_SKILLS } from "@/lib/default-skills"

// ── Prisma mock ──────────────────────────────────────────────────────────────

type MockPrisma = Record<string, Record<string, ReturnType<typeof vi.fn>>>

const createMockPrisma = (): MockPrisma => {
  const model = () => {
    const methods: Record<string, ReturnType<typeof vi.fn>> = {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    }
    return methods
  }

  const prisma: any = {
    skill: model(),
    execution: model(),
    user: model(),
    apiKey: model(),
    action: model(),
    permission: model(),
    policy: model(),
    workflow: model(),
    workflowSkill: model(),
    analytics: model(),
    review: model(),
    organization: model(),
    badge: model(),
    userBadge: model(),
    trustScore: model(),
    importJob: model(),
    skillVersion: model(),
    agent: model(),
    organizationMember: model(),
    $transaction: vi.fn((txs: any[]) => Promise.all(txs)),
    $queryRawUnsafe: vi.fn(),
  }

  return prisma
}

const mockPrisma = createMockPrisma()

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}))

// ── Clerk mock ───────────────────────────────────────────────────────────────

const mockAuth = vi.fn()
const mockCurrentUser = vi.fn()

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
  currentUser: () => mockCurrentUser(),
}))

// ── Auth helper mock ─────────────────────────────────────────────────────────

const mockGetAuthUser = vi.fn()

vi.mock("@/lib/auth", () => ({
  getAuthUser: () => mockGetAuthUser(),
  requireAuth: () => {
    const user = mockGetAuthUser()
    if (!user) throw new Error("Authentication required")
    return user
  },
}))

// ── API Keys mock ────────────────────────────────────────────────────────────

vi.mock("@/lib/api-keys", () => ({
  hashApiKey: (key: string) => `hashed_${key}`,
  getKeyHint: (key: string) => key.slice(-8),
}))

// ── Security mock ────────────────────────────────────────────────────────────

vi.mock("@/lib/security", () => ({
  checkSsrf: vi.fn().mockResolvedValue({ allowed: true }),
  getCircuitState: vi.fn().mockReturnValue("CLOSED"),
  recordFailure: vi.fn(),
  recordSuccess: vi.fn(),
  signPayload: vi.fn().mockReturnValue("signed-payload"),
}))

// ── @amtp/protocol mock ──────────────────────────────────────────────────────

vi.mock("@amtp/protocol", () => ({
  sanitizeActionId: (s: string) => s.toUpperCase().replace(/-/g, "_"),
  sanitizeEndpoint: (s: string) => s,
  validateUrl: (s: string) => s,
  MIMEType: { AMTP_MARKDOWN: "text/amtp+markdown" },
  PermissionGuard: class {
    assert() { return true }
  },
}))

// ── Default Skills mock ──────────────────────────────────────────────────────

vi.mock("@/lib/default-skills", () => ({
  DEFAULT_SKILLS: [
    {
      slug: "contract-analyzer",
      name: "Contract Analyzer",
      description: "Analyze legal contracts for risks and clauses",
      category: "LEGAL",
      tags: ["contracts", "legal", "analysis"],
      source: "BUILTIN",
      actions: [
        {
          actionId: "analyze",
          name: "Analyze Contract",
          description: "Analyze a contract document",
          endpoint: null,
          method: "POST",
          parameters: [{ name: "text", type: "string", required: true }],
          riskLevel: "low",
        },
      ],
      permissions: [{ roles: ["user"], scopes: ["contract:analyze"], authRequirements: [], approvalRequired: false }],
      policies: [{ rateLimit: 100, rateLimitWindow: 60, restrictions: null, executionConditions: null }],
    },
  ],
}))

// ── Execution Engine mock ────────────────────────────────────────────────────

vi.mock("@/lib/execution-engine", () => ({
  executeBuiltinSkill: vi.fn().mockReturnValue({
    status: "COMPLETED",
    output: { result: "builtin executed" },
    logs: ["[exec] Built-in execution completed"],
    latency: 150,
  }),
  hasBuiltinHandler: vi.fn().mockReturnValue(false),
}))

// ── Vector Search mock ───────────────────────────────────────────────────────

vi.mock("@/lib/vector-search", () => ({
  generateEmbedding: vi
    .fn()
    .mockResolvedValue(new Array(768).fill(0.1)),
  vectorSearch: vi.fn().mockResolvedValue({
    results: [
      { id: "vs-1", name: "Vector Skill", similarity: 0.95 },
    ],
    total: 1,
  }),
}))

// ── Utils mock ───────────────────────────────────────────────────────────────

vi.mock("@/lib/utils", () => ({
  slugify: (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
}))

// ── Pipeline mock ────────────────────────────────────────────────────────────

vi.mock("@/lib/pipeline", () => ({
  executePipeline: vi.fn().mockResolvedValue({
    output: { result: "pipeline executed" },
    status: "COMPLETED",
    logs: ["[pipeline] step 1 done"],
  }),
}))

// ── Import analyzers mock ────────────────────────────────────────────────────

vi.mock("@/lib/import/github-analyzer", () => ({
  analyzeGitHubRepo: vi.fn().mockResolvedValue({
    name: "test-repo",
    description: "A test GitHub repository",
    tags: ["developer-tools", "api"],
    actions: [
      { name: "TEST_ACTION", description: "A test action", input: { type: "object", properties: {} } },
    ],
    permissions: [{ resource: "api", action: "read" }],
    policies: {},
    detectedFeatures: ["feature-a", "feature-b"],
  }),
}))

vi.mock("@/lib/import/mcp-analyzer", () => ({
  analyzeMCPServer: vi.fn().mockResolvedValue({
    name: "MCP Server",
    description: "An MCP server",
    tools: [{ name: "tool1", description: "A tool", inputSchema: {} }],
    detectedFeatures: ["mcp"],
  }),
  mcpToolsToAmtpActions: vi.fn().mockReturnValue([
    { actionId: "tool1", name: "tool1", description: "A tool", parameters: [], method: "POST" },
  ]),
}))

vi.mock("@/lib/import/openapi-analyzer", () => ({
  analyzeOpenAPISpec: vi.fn().mockResolvedValue({
    name: "API Spec",
    description: "An OpenAPI spec",
    version: "3.0",
    baseUrl: "https://api.example.com",
    servers: ["https://api.example.com"],
    totalEndpoints: 5,
    tags: ["users", "posts"],
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    detectedFeatures: ["rest-api"],
    endpoints: [],
  }),
  openAPIToAmtpActions: vi.fn().mockReturnValue([]),
  openAPIToSkillManifest: vi.fn().mockReturnValue([
    {
      name: "API Skill",
      description: "An API skill",
      category: "DEVELOPER_TOOLS",
      tags: ["api"],
      actions: [],
      permissions: [],
      policies: [],
    },
  ]),
  groupActionsByTag: vi.fn().mockReturnValue({}),
}))

// ── Default auth state ───────────────────────────────────────────────────────

const defaultUser = {
  id: "user-1",
  clerkId: "clerk-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  bio: null,
  createdAt: new Date("2024-01-01"),
}

beforeEach(() => {
  // Reset all mocks
  vi.clearAllMocks()

  // Set default auth to authenticated
  mockAuth.mockResolvedValue({ userId: "clerk-1" })
  mockCurrentUser.mockResolvedValue({
    emailAddresses: [{ emailAddress: "test@example.com" }],
    fullName: "Test User",
    firstName: "Test",
    imageUrl: null,
  })
  mockGetAuthUser.mockResolvedValue(defaultUser)

  // Reset Prisma mock methods to default behavior
  Object.values(mockPrisma).forEach((model: any) => {
    Object.values(model).forEach((fn: any) => {
      if (typeof fn.mockReset === "function") fn.mockReset()
    })
  })
})

export { mockPrisma, mockAuth, mockCurrentUser, mockGetAuthUser, defaultUser }
