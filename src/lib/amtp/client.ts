import type {
  SkillSummary,
  CapabilityContract,
  ExecuteActionParams,
  ExecutionResult,
  AnalyticsData,
} from "./types"

export interface SkillHubClientConfig {
  registryUrl: string
  apiKey?: string
  timeout?: number
}

export class SkillHubClient {
  private registryUrl: string
  private apiKey?: string
  private timeout: number

  constructor(config: SkillHubClientConfig) {
    this.registryUrl = config.registryUrl.replace(/\/$/, "")
    this.apiKey = config.apiKey
    this.timeout = config.timeout ?? 10_000
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.registryUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "amtp-sdk",
        ...(options.headers as Record<string, string>),
      }

      if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`
      }

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          body?.error?.message || `HTTP ${res.status}: ${res.statusText}`
        )
      }

      return res.json() as Promise<T>
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async searchSkills(
    query?: string,
    options?: {
      category?: string
      sort?: "newest" | "popularity" | "trust"
      page?: number
      limit?: number
    }
  ): Promise<{ skills: SkillSummary[]; total: number }> {
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (options?.category) params.set("category", options.category)
    if (options?.sort) params.set("sort", options.sort)
    if (options?.page) params.set("page", String(options.page))
    if (options?.limit) params.set("limit", String(options.limit))

    return this.request(`/api/skills?${params.toString()}`)
  }

  async semanticSearch(
    query: string,
    options?: {
      category?: string
      limit?: number
    }
  ): Promise<{ skills: SkillSummary[]; total: number }> {
    const params = new URLSearchParams()
    params.set("q", query)
    if (options?.category) params.set("category", options.category)
    if (options?.limit) params.set("limit", String(options.limit))

    return this.request(`/api/skills/vector-search?${params.toString()}`)
  }

  async getSkill(slugOrId: string): Promise<SkillSummary> {
    return this.request(`/api/skills/${slugOrId}`)
  }

  async getCapabilityContract(
    slugOrId: string
  ): Promise<CapabilityContract> {
    const skill = await this.request<any>(`/api/skills/${slugOrId}`)

    return this.buildContract(skill)
  }

  async executeAction(params: ExecuteActionParams): Promise<ExecutionResult> {
    return this.request("/api/execute", {
      method: "POST",
      body: JSON.stringify(params),
    })
  }

  async getAnalytics(
    skillId: string,
    days?: number
  ): Promise<AnalyticsData> {
    const params = new URLSearchParams()
    params.set("skillId", skillId)
    if (days) params.set("days", String(days))

    return this.request(`/api/analytics?${params.toString()}`)
  }

  async getCategories(): Promise<
    Array<{ category: string; count: number }>
  > {
    return this.request("/api/categories")
  }

  async getMetrics(): Promise<{
    skills: number
    executions: number
    developers: number
    organizations: number
    agents: number
  }> {
    return this.request("/api/metrics")
  }

  private buildContract(skill: any): CapabilityContract {
    const actions = (skill.actions || []).map((a: any) => ({
      id: a.id,
      name: a.label || a.id,
      description: a.description || "",
      endpoint: a.endpoint || `/api/actions/${a.id}`,
      method: a.method || "POST",
      riskLevel: a.riskLevel || "medium",
      parameters: a.parameters || [],
      authentication: {
        required: a.requiresAuthentication ?? true,
        methods: ["bearer_token"],
      },
      rateLimit: a.rateLimit || null,
    }))

    const maxRiskLevel = this.computeMaxRiskLevel(actions)

    return {
      skill: {
        id: skill.id,
        name: skill.name,
        description: skill.description,
        version: skill.version || "1.0.0",
        protocol: skill.protocol || "amtp-2025-01",
        category: skill.category,
        author: skill.author?.name || "Unknown",
        tags: skill.tags || [],
      },
      actions,
      permissions: skill.permissions || [],
      policies: skill.policies || [],
      trust: {
        overall: skill.trustScore?.score || 0,
        verified: skill.trustScore?.verified || false,
        executions: skill.trustScore?.totalExecutions || 0,
        successRate: skill.trustScore?.successRate || 0,
        reviews: skill.trustScore?.reviews || 0,
        badges: skill.trustScore?.badges || [],
      },
      compatibility: [
        {
          agent: "ChatGPT",
          compatibility: maxRiskLevel === "low" ? "full" : "partial",
          maxRiskLevel,
          maxActions: actions.length,
        },
        {
          agent: "Claude",
          compatibility: "full",
          maxRiskLevel,
          maxActions: actions.length,
        },
        {
          agent: "Cursor",
          compatibility: maxRiskLevel === "critical" ? "limited" : "partial",
          maxRiskLevel,
          maxActions: actions.length,
        },
      ],
    }
  }

  private computeMaxRiskLevel(
    actions: Array<{ riskLevel: string }>
  ): "low" | "medium" | "high" | "critical" {
    const levels = ["low", "medium", "high", "critical"] as const
    let maxIdx = 0
    for (const a of actions) {
      const idx = levels.indexOf(a.riskLevel as any)
      if (idx > maxIdx) maxIdx = idx
    }
    return levels[maxIdx]
  }
}
