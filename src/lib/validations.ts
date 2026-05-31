import { z } from "zod"

// === Enums matching Prisma schema ===

const skillCategoryEnum = z.enum([
  "ANALYTICS", "COMMUNICATION", "DATA", "DEVELOPER_TOOLS", "FINANCE",
  "LEGAL", "MARKETING", "PRODUCTIVITY", "RESEARCH", "SALES",
  "SECURITY", "AI_ML", "OTHER",
])

const importSourceEnum = z.enum([
  "GITHUB", "AWESOME_SKILLS", "MCP", "PROMPT_LIBRARY", "OPENAPI", "LOCAL_UPLOAD", "AMTP_MARKDOWN",
])

// === Execute route validation ===

export const executeSchema = z.object({
  skillId: z.string().min(1).max(200),
  actionId: z.string().min(1).max(200),
  input: z.record(z.string(), z.unknown()).optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
})

// === Skill creation validation ===

const actionParameterSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  required: z.boolean().optional().default(false),
  description: z.string().max(500).optional().default(""),
})

const actionStepSchema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().min(1).max(100),
  type: z.enum(["http", "transform", "merge"]).optional().default("http"),
  endpoint: z.string().max(2000).optional().default(""),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().default("POST"),
  order: z.number().int().min(1).optional(),
})

const actionSchema = z.object({
  actionId: z.string().max(100).optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional().default(""),
  endpoint: z.string().max(2000).nullable().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().default("POST"),
  riskLevel: z.enum(["low", "medium", "high", "critical"]).optional().default("low"),
  parameters: z.array(actionParameterSchema).max(50).optional().default([]),
  executionMode: z.enum(["single", "sequential", "parallel"]).optional().default("single"),
  steps: z.array(actionStepSchema).max(20).optional(),
  authType: z.enum(["none", "bearer", "api-key", "basic", "oauth2"]).nullable().optional(),
  authConfig: z.record(z.string(), z.string()).nullable().optional(),
  headers: z.record(z.string(), z.string()).nullable().optional(),
})

const permissionSchema = z.object({
  roles: z.array(z.string().max(50)).max(20).optional().default([]),
  scopes: z.array(z.string().max(100)).max(50).optional().default([]),
  authRequirements: z.array(z.string().max(50)).max(10).optional().default([]),
  approvalRequired: z.boolean().optional().default(false),
})

const policySchema = z.object({
  rateLimit: z.number().int().min(1).max(100000).nullable().optional(),
  rateLimitWindow: z.number().int().min(1).max(86400).nullable().optional(),
  restrictions: z.record(z.string(), z.unknown()).nullable().optional(),
  executionConditions: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(5000),
  category: skillCategoryEnum.optional().default("OTHER"),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  visibility: z.enum(["public", "private"]).optional().default("public"),
  published: z.boolean().optional(),
  source: importSourceEnum.nullable().optional(),
  sourceUrl: z.string().max(2000).nullable().optional(),
  actions: z.array(actionSchema).min(1).max(50),
  permissions: z.array(permissionSchema).max(10).optional().default([]),
  policies: z.array(policySchema).max(10).optional().default([]),
})

// === Import analyze validation ===

export const importAnalyzeSchema = z.object({
  source: z.enum(["GITHUB", "MCP", "OPENAPI", "AMTP-MARKDOWN", "UPLOAD"]),
  sourceUrl: z.string().min(1).max(2000).url(),
})

// === API Key validation ===

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim(),
})
