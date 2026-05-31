import { NextResponse } from "next/server"

/**
 * AMTP Discovery Document
 * Spec: https://amtp.dev/discovery
 * 
 * This endpoint allows agents to discover the registry's capabilities
 * by fetching /.well-known/amtp
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const discoveryDocument = {
    amtp_version: "1.0",
    type: "registry",
    name: "AMTP SkillHub",
    description: "A registry of AI agent capabilities published as AMTP skills",
    endpoints: {
      skills: `${baseUrl}/api/skills`,
      discover: `${baseUrl}/api/skills/discover`,
      search: `${baseUrl}/api/skills/vector-search`,
      execute: `${baseUrl}/api/execute`,
      categories: `${baseUrl}/api/categories`,
    },
    authentication: {
      methods: ["api-key", "session"],
      api_key: {
        header: "X-API-Key",
        format: "sk_<token>",
        obtain: `${baseUrl}/dashboard/api-keys`,
      },
    },
    capabilities: {
      semantic_search: true,
      execution_proxy: true,
      trust_scoring: true,
      rate_limiting: true,
      multi_step_pipelines: true,
    },
    content_negotiation: {
      supported_types: [
        "application/json",
        "text/amtp+markdown",
      ],
    },
    links: {
      documentation: `${baseUrl}/docs`,
      registry: `${baseUrl}/skills`,
      status: `${baseUrl}/api/metrics`,
    },
  }

  return NextResponse.json(discoveryDocument, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
