import type { PublishSkillInput, ExecutionResult } from "./types"

export interface PublisherConfig {
  registryUrl: string
  apiKey: string
}

export class SkillHubPublisher {
  private registryUrl: string
  private apiKey: string

  constructor(config: PublisherConfig) {
    this.registryUrl = config.registryUrl.replace(/\/$/, "")
    this.apiKey = config.apiKey
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.registryUrl}${path}`

    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": "amtp-sdk",
        ...(options.headers as Record<string, string>),
      },
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(
        body?.error?.message || `HTTP ${res.status}: ${res.statusText}`
      )
    }

    return res.json() as Promise<T>
  }

  async publish(
    input: PublishSkillInput
  ): Promise<{ id: string; slug: string; manifest: any }> {
    return this.request("/api/import", {
      method: "POST",
      body: JSON.stringify({
        source: "amtp-sdk",
        name: input.name,
        description: input.description,
        category: input.category,
        tags: input.tags || [],
        actions: input.actions.map((a) => ({
          id: a.id,
          label: a.label || a.id,
          description: a.description,
          method: a.method,
          endpoint: a.endpoint,
          parameters: a.parameters || [],
          requiresAuthentication: a.requiresAuthentication ?? true,
          rateLimit: a.rateLimit || null,
          riskLevel: a.riskLevel,
        })),
        permissions: input.permissions || [],
        policies: input.policies || [],
      }),
    })
  }

  async analyzeSource(
    url: string,
    sourceType: "github" | "mcp" | "openapi" | "amtp-markdown" = "github"
  ): Promise<{
    name: string
    description: string
    category: string
    actions: any[]
    permissions: any[]
    policies: any[]
  }> {
    return this.request("/api/import/analyze", {
      method: "POST",
      body: JSON.stringify({ url, sourceType }),
    })
  }

  async updateSkill(
    slug: string,
    updates: Partial<PublishSkillInput>
  ): Promise<{ id: string; slug: string }> {
    return this.request(`/api/skills/${slug}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    })
  }

  async deleteSkill(slug: string): Promise<void> {
    await this.request(`/api/skills/${slug}`, {
      method: "DELETE",
    })
  }

  async executeAction(
    skillId: string,
    action: string,
    parameters?: Record<string, unknown>
  ): Promise<ExecutionResult> {
    return this.request("/api/execute", {
      method: "POST",
      body: JSON.stringify({ skillId, action, parameters }),
    })
  }
}
