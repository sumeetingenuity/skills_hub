import { NextRequest, NextResponse } from "next/server"
import { analyzeGitHubRepo } from "@/lib/import/github-analyzer"
import { analyzeMCPServer, mcpToolsToAmtpActions } from "@/lib/import/mcp-analyzer"
import { analyzeOpenAPISpec, openAPIToAmtpActions, openAPIToSkillManifest, groupActionsByTag } from "@/lib/import/openapi-analyzer"
import { auth } from "@clerk/nextjs/server"
import { checkSsrf } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Require authentication to prevent unauthenticated SSRF
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { source, sourceUrl } = body

    if (!sourceUrl) {
      return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 })
    }

    let manifest: Record<string, unknown>
    let detectedFeatures: string[] = []

    switch (source) {
      case "GITHUB": {
        const result = await analyzeGitHubRepo(sourceUrl)
        manifest = {
          name: result.name,
          description: result.description,
          category: "DEVELOPER_TOOLS",
          tags: result.tags || [],
          actions: result.actions || [],
          permissions: result.permissions || [],
          policies: result.policies || [],
        }
        detectedFeatures = result.detectedFeatures || []
        break
      }

      case "MCP": {
        const result = await analyzeMCPServer(sourceUrl)
        const actions = mcpToolsToAmtpActions(result.tools)
        manifest = {
          name: result.name,
          description: result.description,
          category: "DEVELOPER_TOOLS",
          tags: ["mcp", "tools", "integration"],
          actions,
          permissions: [{ roles: ["agent"], scopes: actions.map(a => `${a.actionId}:execute`), authRequirements: ["api-key"], approvalRequired: false }],
          policies: [{ rateLimit: 60, rateLimitWindow: 60 }],
        }
        detectedFeatures = result.detectedFeatures
        break
      }

      case "OPENAPI": {
        const result = await analyzeOpenAPISpec(sourceUrl)
        const skills = openAPIToSkillManifest(result, { splitByTag: result.tags.length > 3 })
        const primarySkill = skills[0]
        
        manifest = {
          name: primarySkill.name,
          description: primarySkill.description,
          category: primarySkill.category,
          tags: primarySkill.tags,
          baseUrl: result.baseUrl,
          actions: primarySkill.actions,
          permissions: primarySkill.permissions,
          policies: primarySkill.policies,
          // Additional metadata for the UI
          _openapi: {
            version: result.version,
            servers: result.servers,
            totalEndpoints: result.totalEndpoints,
            tags: result.tags,
            securitySchemes: Object.keys(result.securitySchemes),
            additionalSkills: skills.length > 1 ? skills.slice(1).map((s) => ({ name: s.name, actions: s.actions.length })) : [],
          },
        }
        detectedFeatures = result.detectedFeatures
        break
      }

      case "AMTP_MARKDOWN": {
        // Fetch and parse AMTP markdown document
        try {
          const ssrfCheck = await checkSsrf(sourceUrl)
          if (!ssrfCheck.allowed) {
            return NextResponse.json({ error: `SSRF blocked: ${ssrfCheck.reason}` }, { status: 400 })
          }
          const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(10000) })
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`)
          const text = await res.text()
          
          // Parse front-matter and content
          const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
          if (fmMatch) {
            const frontMatter = fmMatch[1]
            const content = fmMatch[2]
            const name = frontMatter.match(/title:\s*(.+)/)?.[1] || "Imported Skill"
            const category = frontMatter.match(/category:\s*(.+)/)?.[1] || "OTHER"
            
            manifest = {
              name,
              description: content.split("\n\n")[0]?.replace(/^#.*\n/, "").trim() || name,
              category,
              tags: ["amtp", "imported"],
              actions: [],
              permissions: [{ roles: ["agent"], scopes: [], authRequirements: ["api-key"], approvalRequired: false }],
              policies: [{ rateLimit: 100, rateLimitWindow: 60 }],
            }
            detectedFeatures = ["AMTP Markdown", "Front Matter"]
          } else {
            manifest = {
              name: "Imported AMTP Skill",
              description: text.slice(0, 200),
              category: "OTHER",
              tags: ["amtp", "imported"],
              actions: [],
              permissions: [{ roles: ["agent"], scopes: [], authRequirements: ["api-key"], approvalRequired: false }],
              policies: [{ rateLimit: 100, rateLimitWindow: 60 }],
            }
            detectedFeatures = ["AMTP Markdown"]
          }
        } catch (err) {
          return NextResponse.json({ error: `Failed to fetch AMTP document: ${err instanceof Error ? err.message : "Unknown"}` }, { status: 400 })
        }
        break
      }

      default:
        return NextResponse.json({ error: `Unsupported source type: ${source}` }, { status: 400 })
    }

    return NextResponse.json({ manifest, detectedFeatures })
  } catch (error) {
    console.error("POST /api/import/analyze error:", error)
    // Only expose safe, expected error messages (network/fetch failures)
    const safeMessages = ["fetch failed", "SSRF blocked", "timeout", "not found", "404", "403"]
    const rawMessage = error instanceof Error ? error.message : ""
    const isSafe = safeMessages.some(m => rawMessage.toLowerCase().includes(m))
    return NextResponse.json(
      { error: isSafe ? rawMessage : "Analysis failed. Please check the URL and try again." },
      { status: 500 }
    )
  }
}
