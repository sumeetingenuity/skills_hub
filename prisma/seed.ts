import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const a = JSON.parse(fs.readFileSync("prisma/seed-actions.json", "utf-8")) as Record<string, {
  id: string;
  name: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}>;

async function upsertSkill(data: {
  slug: string;
  name: string;
  description: string;
  category: "LEGAL" | "DATA" | "PRODUCTIVITY" | "RESEARCH" | "ANALYTICS";
  tags: string[];
  published: boolean;
  version: number;
  authorId: string;
  actions: { actionId: string; name: string; description: string; endpoint: string; riskLevel: string }[];
  permissions: { roles: string[]; scopes: string[]; authRequirements?: string[]; approvalRequired?: boolean };
  policies: { rateLimit: number; rateLimitWindow: number };
  trustScore: { score: number; verified: boolean; totalExecutions: number; successRate: number; uptime: number };
  manifest: Record<string, unknown>;
}) {
  const { actions, permissions, policies, trustScore, manifest, ...skillFields } = data;

  await prisma.action.deleteMany({ where: { skill: { slug: data.slug } } });
  await prisma.permission.deleteMany({ where: { skill: { slug: data.slug } } });
  await prisma.policy.deleteMany({ where: { skill: { slug: data.slug } } });
  await prisma.trustScore.deleteMany({ where: { skill: { slug: data.slug } } });
  await prisma.skillVersion.deleteMany({ where: { skill: { slug: data.slug } } });

  await prisma.skill.upsert({
    where: { slug: data.slug },
    update: {
      ...skillFields,
      actions: {
        create: actions.map((a) => ({
          actionId: a.actionId,
          name: a.name,
          description: a.description,
          endpoint: a.endpoint,
          riskLevel: a.riskLevel,
        })),
      },
      permissions: {
        create: {
          roles: permissions.roles,
          scopes: permissions.scopes,
          authRequirements: permissions.authRequirements ?? [],
          approvalRequired: permissions.approvalRequired ?? false,
        },
      },
      policies: {
        create: {
          rateLimit: policies.rateLimit,
          rateLimitWindow: policies.rateLimitWindow,
        },
      },
      trustScore: {
        create: trustScore,
      },
      versions: {
        create: {
          version: skillFields.version,
          manifest: manifest as Record<string, unknown>,
        },
      },
    },
    create: {
      ...skillFields,
      actions: {
        create: actions.map((a) => ({
          actionId: a.actionId,
          name: a.name,
          description: a.description,
          endpoint: a.endpoint,
          riskLevel: a.riskLevel,
        })),
      },
      permissions: {
        create: {
          roles: permissions.roles,
          scopes: permissions.scopes,
          authRequirements: permissions.authRequirements ?? [],
          approvalRequired: permissions.approvalRequired ?? false,
        },
      },
      policies: {
        create: {
          rateLimit: policies.rateLimit,
          rateLimitWindow: policies.rateLimitWindow,
        },
      },
      trustScore: {
        create: trustScore,
      },
      versions: {
        create: {
          version: skillFields.version,
          manifest: manifest as Record<string, unknown>,
        },
      },
    },
  });

  return actions.length;
}

async function upsertWorkflow(data: {
  name: string;
  description: string;
  slug: string;
  published: boolean;
  authorId: string;
  skills: { slug: string; order: number }[];
}) {
  const { skills, ...workflowFields } = data;

  const existingWorkflow = await prisma.workflow.findUnique({ where: { slug: data.slug } });
  if (existingWorkflow) {
    await prisma.workflowSkill.deleteMany({ where: { workflowId: existingWorkflow.id } });
  }

  await prisma.workflow.upsert({
    where: { slug: data.slug },
    update: {
      ...workflowFields,
      skills: {
        create: await Promise.all(
          skills.map(async (s) => {
            const skill = await prisma.skill.findUniqueOrThrow({
              where: { slug: s.slug },
              select: { id: true },
            });
            return { order: s.order, skillId: skill.id };
          })
        ),
      },
    },
    create: {
      ...workflowFields,
      skills: {
        create: await Promise.all(
          skills.map(async (s) => {
            const skill = await prisma.skill.findUniqueOrThrow({
              where: { slug: s.slug },
              select: { id: true },
            });
            return { order: s.order, skillId: skill.id };
          })
        ),
      },
    },
  });
}

async function main() {
  const author = await prisma.user.upsert({
    where: { email: "seed@skillshub.dev" },
    update: {},
    create: {
      clerkId: "seed-default-author",
      email: "seed@skillshub.dev",
      name: "Seed Author",
    },
  });

  const skillsData = [
    {
      slug: "contract-analyzer",
      name: "Contract Analyzer",
      description: "Analyzes legal contracts to identify risks, extract clauses, and ensure compliance.",
      category: "LEGAL" as const,
      tags: ["contracts", "legal", "analysis", "risk", "compliance"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "analyze-clause", name: "Analyze Clause", description: "Analyzes a specific clause in a contract and provides insights.", endpoint: "/contracts/analyze-clause", riskLevel: "medium" },
        { actionId: "detect-risk", name: "Detect Risk", description: "Identifies high-risk clauses and potential legal issues.", endpoint: "/contracts/detect-risk", riskLevel: "high" },
        { actionId: "summarize-terms", name: "Summarize Terms", description: "Generates a plain-language summary of contract terms.", endpoint: "/contracts/summarize-terms", riskLevel: "low" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["contracts:read", "contracts:analyze"] },
      policies: { rateLimit: 100, rateLimitWindow: 60 },
      trustScore: { score: 94, verified: true, totalExecutions: 1200, successRate: 97.5, uptime: 99.9 },
      manifest: {
        name: "Contract Analyzer",
        description: "Analyzes legal contracts to identify risks, extract clauses, and ensure compliance.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.analyzeClause, a.detectRisk, a.summarizeTerms],
        permissions: { roles: ["developer", "agent"], scopes: ["contracts:read", "contracts:analyze"] },
        policies: { rateLimit: 100, rateLimitWindow: 60 },
      },
    },
    {
      slug: "flight-search",
      name: "Flight Search",
      description: "Searches and compares flight prices across multiple airlines and providers.",
      category: "DATA" as const,
      tags: ["flights", "travel", "search", "comparison", "booking"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "search-flights", name: "Search Flights", description: "Searches for available flights based on origin, destination, and dates.", endpoint: "/flights/search", riskLevel: "low" },
        { actionId: "compare-prices", name: "Compare Prices", description: "Compares flight prices across multiple providers.", endpoint: "/flights/compare", riskLevel: "low" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["flights:search"] },
      policies: { rateLimit: 200, rateLimitWindow: 60 },
      trustScore: { score: 88, verified: true, totalExecutions: 3400, successRate: 94.2, uptime: 99.7 },
      manifest: {
        name: "Flight Search",
        description: "Searches and compares flight prices across multiple airlines and providers.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.searchFlights, a.comparePrices],
        permissions: { roles: ["developer", "agent"], scopes: ["flights:search"] },
        policies: { rateLimit: 200, rateLimitWindow: 60 },
      },
    },
    {
      slug: "invoice-generator",
      name: "Invoice Generator",
      description: "Generates, sends, and tracks invoices with customizable templates.",
      category: "PRODUCTIVITY" as const,
      tags: ["invoices", "billing", "payments", "finance"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "create-invoice", name: "Create Invoice", description: "Generates a professional invoice with line items, tax, and totals.", endpoint: "/invoices/create", riskLevel: "low" },
        { actionId: "send-invoice", name: "Send Invoice", description: "Sends an invoice to the client via email.", endpoint: "/invoices/send", riskLevel: "medium" },
        { actionId: "track-payment", name: "Track Payment", description: "Tracks payment status for an invoice.", endpoint: "/invoices/track", riskLevel: "low" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["invoices:create", "invoices:send"] },
      policies: { rateLimit: 50, rateLimitWindow: 60 },
      trustScore: { score: 91, verified: true, totalExecutions: 890, successRate: 96.8, uptime: 99.5 },
      manifest: {
        name: "Invoice Generator",
        description: "Generates, sends, and tracks invoices with customizable templates.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.createInvoice, a.sendInvoice, a.trackPayment],
        permissions: { roles: ["developer", "agent"], scopes: ["invoices:create", "invoices:send"] },
        policies: { rateLimit: 50, rateLimitWindow: 60 },
      },
    },
    {
      slug: "product-research",
      name: "Product Research",
      description: "Researches products, compares features, and provides market insights.",
      category: "RESEARCH" as const,
      tags: ["products", "research", "comparison", "market", "analysis"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "search-products", name: "Search Products", description: "Searches for products by criteria and returns detailed results.", endpoint: "/products/search", riskLevel: "low" },
        { actionId: "compare-products", name: "Compare Products", description: "Compares multiple products across features, pricing, and ratings.", endpoint: "/products/compare", riskLevel: "low" },
        { actionId: "compare-features", name: "Compare Features", description: "Compares features across different products side by side.", endpoint: "/products/compare-features", riskLevel: "low" },
        { actionId: "analyze-pricing", name: "Analyze Pricing", description: "Analyzes pricing strategies and provides cost comparisons.", endpoint: "/products/analyze-pricing", riskLevel: "medium" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["products:search"] },
      policies: { rateLimit: 150, rateLimitWindow: 60 },
      trustScore: { score: 85, verified: false, totalExecutions: 2100, successRate: 91.0, uptime: 98.5 },
      manifest: {
        name: "Product Research",
        description: "Researches products, compares features, and provides market insights.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.searchProducts, a.compareProducts, a.compareFeatures, a.analyzePricing],
        permissions: { roles: ["developer", "agent"], scopes: ["products:search"] },
        policies: { rateLimit: 150, rateLimitWindow: 60 },
      },
    },
    {
      slug: "patent-search",
      name: "Patent Search",
      description: "Searches patent databases and analyzes patent documents for prior art.",
      category: "RESEARCH" as const,
      tags: ["patents", "legal", "research", "intellectual-property", "prior-art"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "search-patents", name: "Search Patents", description: "Searches patent databases for relevant patents.", endpoint: "/patents/search", riskLevel: "low" },
        { actionId: "analyze-patent", name: "Analyze Patent", description: "Provides a detailed analysis of a patent document.", endpoint: "/patents/analyze", riskLevel: "medium" },
        { actionId: "check-infringement", name: "Check Infringement", description: "Checks if a product or process infringes on existing patents.", endpoint: "/patents/check-infringement", riskLevel: "high" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["patents:search", "patents:analyze"] },
      policies: { rateLimit: 75, rateLimitWindow: 60 },
      trustScore: { score: 79, verified: false, totalExecutions: 560, successRate: 88.3, uptime: 97.2 },
      manifest: {
        name: "Patent Search",
        description: "Searches patent databases and analyzes patent documents for prior art.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.searchPatents, a.analyzePatent, a.checkInfringement],
        permissions: { roles: ["developer", "agent"], scopes: ["patents:search", "patents:analyze"] },
        policies: { rateLimit: 75, rateLimitWindow: 60 },
      },
    },
    {
      slug: "contract-review",
      name: "Contract Review",
      description: "Reviews existing contracts for clarity, compliance, and completeness.",
      category: "LEGAL" as const,
      tags: ["contracts", "review", "legal", "compliance", "readability"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "review-clause", name: "Review Clause", description: "Reviews a contract clause for clarity and completeness.", endpoint: "/contracts/review-clause", riskLevel: "low" },
        { actionId: "check-compliance", name: "Check Compliance", description: "Checks a contract for regulatory compliance.", endpoint: "/contracts/check-compliance", riskLevel: "high" },
        { actionId: "generate-summary", name: "Generate Summary", description: "Generates a concise summary of a contract.", endpoint: "/contracts/generate-summary", riskLevel: "low" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["contracts:read", "contracts:review"] },
      policies: { rateLimit: 80, rateLimitWindow: 60 },
      trustScore: { score: 87, verified: false, totalExecutions: 430, successRate: 93.1, uptime: 98.8 },
      manifest: {
        name: "Contract Review",
        description: "Reviews existing contracts for clarity, compliance, and completeness.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.reviewClause, a.checkCompliance, a.generateSummary],
        permissions: { roles: ["developer", "agent"], scopes: ["contracts:read", "contracts:review"] },
        policies: { rateLimit: 80, rateLimitWindow: 60 },
      },
    },
    {
      slug: "legal-research",
      name: "Legal Research",
      description: "Searches case law and legal databases to support legal analysis.",
      category: "LEGAL" as const,
      tags: ["legal", "research", "cases", "precedent", "briefs"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "search-cases", name: "Search Cases", description: "Searches legal case databases for relevant case law.", endpoint: "/legal/search-cases", riskLevel: "low" },
        { actionId: "analyze-precedent", name: "Analyze Precedent", description: "Analyzes legal precedent relevance to a case.", endpoint: "/legal/analyze-precedent", riskLevel: "medium" },
        { actionId: "generate-brief", name: "Generate Brief", description: "Generates a legal brief from case analysis.", endpoint: "/legal/generate-brief", riskLevel: "medium" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["legal:search", "legal:analyze"] },
      policies: { rateLimit: 60, rateLimitWindow: 60 },
      trustScore: { score: 82, verified: false, totalExecutions: 310, successRate: 90.5, uptime: 97.9 },
      manifest: {
        name: "Legal Research",
        description: "Searches case law and legal databases to support legal analysis.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.searchCases, a.analyzePrecedent, a.generateBrief],
        permissions: { roles: ["developer", "agent"], scopes: ["legal:search", "legal:analyze"] },
        policies: { rateLimit: 60, rateLimitWindow: 60 },
      },
    },
    {
      slug: "market-analysis",
      name: "Market Analysis",
      description: "Analyzes market trends, competitive landscapes, and generates reports.",
      category: "ANALYTICS" as const,
      tags: ["market", "analytics", "trends", "competitive", "reports"],
      published: true,
      version: 1,
      authorId: author.id,
      actions: [
        { actionId: "analyze-trends", name: "Analyze Trends", description: "Analyzes market trends from data sources.", endpoint: "/market/analyze-trends", riskLevel: "low" },
        { actionId: "competitive-analysis", name: "Competitive Analysis", description: "Analyzes competitive landscape for a market segment.", endpoint: "/market/competitive-analysis", riskLevel: "medium" },
        { actionId: "generate-report", name: "Generate Report", description: "Generates a comprehensive market analysis report.", endpoint: "/market/generate-report", riskLevel: "low" },
      ],
      permissions: { roles: ["developer", "agent"], scopes: ["market:read", "market:analyze"] },
      policies: { rateLimit: 120, rateLimitWindow: 60 },
      trustScore: { score: 90, verified: true, totalExecutions: 1800, successRate: 95.2, uptime: 99.3 },
      manifest: {
        name: "Market Analysis",
        description: "Analyzes market trends, competitive landscapes, and generates reports.",
        version: "1.0.0",
        protocol: "amtp-2025-01",
        actions: [a.analyzeTrends, a.competitiveAnalysis, a.generateReport],
        permissions: { roles: ["developer", "agent"], scopes: ["market:read", "market:analyze"] },
        policies: { rateLimit: 120, rateLimitWindow: 60 },
      },
    },
  ];

  const workflowData = [
    {
      name: "Research & Report",
      description: "Searches patents, analyzes them, and generates a comprehensive report.",
      slug: "research-report",
      published: true,
      authorId: author.id,
      skills: [
        { slug: "patent-search", order: 0 },
        { slug: "contract-analyzer", order: 1 },
      ],
    },
    {
      name: "Invoice Pipeline",
      description: "Creates, sends, and tracks invoices automatically.",
      slug: "invoice-pipeline",
      published: true,
      authorId: author.id,
      skills: [
        { slug: "invoice-generator", order: 0 },
      ],
    },
    {
      name: "Market Intelligence",
      description: "Analyzes markets, researches products, and reviews contracts for competitive insights.",
      slug: "market-intelligence",
      published: true,
      authorId: author.id,
      skills: [
        { slug: "market-analysis", order: 0 },
        { slug: "product-research", order: 1 },
        { slug: "contract-analyzer", order: 2 },
      ],
    },
    {
      name: "Legal Pipeline",
      description: "Searches legal precedents and reviews contracts for comprehensive legal analysis.",
      slug: "legal-pipeline",
      published: true,
      authorId: author.id,
      skills: [
        { slug: "legal-research", order: 0 },
        { slug: "contract-review", order: 1 },
      ],
    },
    {
      name: "Full Research Suite",
      description: "Comprehensive research across products, markets, contracts, and invoices.",
      slug: "full-research-suite",
      published: true,
      authorId: author.id,
      skills: [
        { slug: "product-research", order: 0 },
        { slug: "market-analysis", order: 1 },
        { slug: "contract-review", order: 2 },
        { slug: "invoice-generator", order: 3 },
      ],
    },
  ];

  console.log("Seeding skills...");
  for (const skill of skillsData) {
    const actionCount = await upsertSkill(skill as Parameters<typeof upsertSkill>[0]);
    console.log(`  ✓ ${skill.name} (${actionCount} actions)`);
  }

  console.log("Seeding workflows...");
  for (const workflow of workflowData) {
    await upsertWorkflow(workflow as Parameters<typeof upsertWorkflow>[0]);
    console.log(`  ✓ ${workflow.name}`);
  }

  console.log("Generating embeddings...");
  try {
    const { generateEmbedding } = await import("../src/lib/vector-search");
    const skills = await prisma.skill.findMany({ select: { id: true, name: true, description: true, tags: true, category: true } });
    for (const s of skills) {
      const text = `${s.name} ${s.description} ${s.tags?.join(" ") || ""} ${s.category}`;
      const embedding = await generateEmbedding(text);
      const embStr = `[${embedding.join(",")}]`;
      await prisma.$queryRawUnsafe(
        `UPDATE public."Skill" SET embedding = $1::vector WHERE id = $2`,
        embStr,
        s.id
      );
    }
    console.log(`  ✓ ${skills.length} embeddings generated`);
  } catch (e) {
    console.log("  ⚠ Embedding generation skipped:", e instanceof Error ? e.message : e);
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
