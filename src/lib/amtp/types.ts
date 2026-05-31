import type {
  Action as AmtpAction,
  ActionParameter,
  Permission,
  Policy,
  RateLimit,
  Session,
  AuthMethod,
} from "@amtp/protocol"

export type { AmtpAction, ActionParameter, Permission, Policy, RateLimit, Session, AuthMethod }

export type RiskLevel = "low" | "medium" | "high" | "critical"

export interface SkillSummary {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags: string[]
  version: string
  createdAt: string
  author: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  trustScore: {
    score: number
    verified: boolean
    totalExecutions: number
  } | null
  actionCount: number
}

export interface SkillManifest {
  name: string
  description: string
  version: string
  protocol: string
  actions: AmtpAction[]
  permissions: Permission[]
  policies: Policy[]
}

export interface CapabilityContractAction {
  id: string
  name: string
  description: string
  endpoint: string
  method: "GET" | "POST" | "PUT" | "DELETE"
  riskLevel: RiskLevel
  parameters: ActionParameter[]
  authentication: {
    required: boolean
    methods: AuthMethod[]
  }
  rateLimit: RateLimit | null
}

export interface TrustScore {
  overall: number
  verified: boolean
  executions: number
  successRate: number
  reviews: number
  badges: string[]
}

export interface AgentCompatibility {
  agent: string
  compatibility: "full" | "partial" | "limited"
  maxRiskLevel: RiskLevel
  maxActions: number
}

export interface CapabilityContract {
  skill: {
    id: string
    name: string
    description: string
    version: string
    protocol: string
    category: string
    author: string
    tags: string[]
  }
  actions: CapabilityContractAction[]
  permissions: Permission[]
  policies: Policy[]
  trust: TrustScore
  compatibility: AgentCompatibility[]
}

export interface ExecuteActionParams {
  skillId: string
  action: string
  parameters?: Record<string, unknown>
  sessionId?: string
}

export interface ExecutionResult {
  status: "success" | "error"
  data?: unknown
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  execution?: {
    id: string
    latency: number
    startedAt: string
    completedAt: string
  }
}

export interface AnalyticsData {
  totalExecutions: number
  successCount: number
  failedCount: number
  successRate: number
  avgLatency: number
  activeAgents: number
  growthRate: number
  dailyStats: Array<{
    date: string
    executions: number
    avgLatency: number
  }>
}

export interface PublishSkillInput {
  name: string
  description: string
  category: string
  tags?: string[]
  actions: Array<{
    id: string
    label?: string
    description?: string
    method: "GET" | "POST" | "PUT" | "DELETE"
    endpoint: string
    parameters?: ActionParameter[]
    requiresAuthentication?: boolean
    rateLimit?: RateLimit
    riskLevel: RiskLevel
  }>
  permissions?: Permission[]
  policies?: Policy[]
}
