import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"
import { MIMEType } from "@amtp/protocol"
import { hashApiKey } from "@/lib/api-keys"

/**
 * Resolve the user from either Clerk session or X-API-Key header.
 * Returns the local user record or null.
 */
async function resolveUser(request: NextRequest) {
  // Try API key first (agent access)
  const apiKeyHeader = request.headers.get("x-api-key")
  if (apiKeyHeader) {
    const keyHash = hashApiKey(apiKeyHeader)
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: keyHash },
      include: { user: true },
    })
    if (apiKey && (!apiKey.expiresAt || apiKey.expiresAt > new Date())) {
      return apiKey.user
    }
  }

  // Fall back to Clerk session
  return getAuthUser().catch(() => null)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await resolveUser(request)

    // Build access control: public skills OR skills owned by the current user
    const accessFilter = user
      ? { AND: [{ OR: [{ id }, { slug: id }] }, { OR: [{ published: true }, { authorId: user.id }] }] }
      : { AND: [{ OR: [{ id }, { slug: id }] }, { published: true }] }

    const skill = await prisma.skill.findFirst({
      where: accessFilter,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        trustScore: true,
        actions: { orderBy: { createdAt: "asc" } },
        permissions: true,
        policies: true,
        versions: { orderBy: { version: "desc" } },
        reviews: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: "desc" },
        },
        analytics: { orderBy: { date: "desc" }, take: 30 },
        _count: { select: { executions: true, workflows: true } },
      },
    })

    if (!skill) {
      // Fall back to default skills if DB is empty
      const { DEFAULT_SKILLS } = await import("@/lib/default-skills")
      const defaultSkill = DEFAULT_SKILLS.find((s) => s.slug === id)
      
      if (defaultSkill) {
        const fallbackSkill = {
          id: defaultSkill.slug,
          slug: defaultSkill.slug,
          name: defaultSkill.name,
          description: defaultSkill.description,
          category: defaultSkill.category,
          tags: defaultSkill.tags,
          version: 1,
          published: true,
          source: defaultSkill.source,
          sourceUrl: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: { id: "system", name: "AMTP Team", avatarUrl: null, bio: "Built-in capabilities maintained by the AMTP team" },
          organization: null,
          trustScore: { id: "ts-" + defaultSkill.slug, score: 88, verified: true, successRate: 0.97, uptime: 0.99, totalExecutions: 2450, totalReviews: 32, skillId: defaultSkill.slug, updatedAt: new Date().toISOString() },
          actions: defaultSkill.actions.map((a) => ({
            id: a.actionId,
            actionId: a.actionId,
            name: a.name,
            description: a.description,
            endpoint: a.endpoint,
            method: a.method,
            parameters: a.parameters,
            riskLevel: a.riskLevel,
            skillId: defaultSkill.slug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          permissions: defaultSkill.permissions.map((p, i) => ({
            id: `perm-${i}`,
            roles: p.roles,
            scopes: p.scopes,
            authRequirements: p.authRequirements,
            approvalRequired: p.approvalRequired,
            skillId: defaultSkill.slug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          policies: defaultSkill.policies.map((p, i) => ({
            id: `pol-${i}`,
            rateLimit: p.rateLimit,
            rateLimitWindow: p.rateLimitWindow,
            restrictions: p.restrictions,
            executionConditions: p.executionConditions,
            skillId: defaultSkill.slug,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
          versions: [{ id: "v1", version: 1, changelog: "Initial release", manifest: defaultSkill, skillId: defaultSkill.slug, createdAt: new Date().toISOString() }],
          reviews: [],
          analytics: [],
          _count: { executions: 2450, workflows: 3 },
        }

        const accept = request.headers.get("accept") || ""
        if (accept.includes(MIMEType.AMTP_MARKDOWN)) {
          const md = generateAmtpMarkdown(fallbackSkill)
          return new NextResponse(md, {
            headers: {
              "Content-Type": `${MIMEType.AMTP_MARKDOWN}; charset=utf-8`,
              "X-AMTP-Version": "1.0",
            },
          })
        }

        return NextResponse.json({ skill: fallbackSkill })
      }

      return NextResponse.json({ error: "Skill not found" }, { status: 404 })
    }

    const accept = request.headers.get("accept") || ""
    if (accept.includes(MIMEType.AMTP_MARKDOWN)) {
      const md = generateAmtpMarkdown(skill)
      return new NextResponse(md, {
        headers: {
          "Content-Type": `${MIMEType.AMTP_MARKDOWN}; charset=utf-8`,
          "X-AMTP-Version": "1.0",
        },
      })
    }

    return NextResponse.json({ skill })
  } catch (error) {
    console.error("GET /api/skills/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const skill = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }], authorId: user.id },
    })

    if (!skill) {
      return NextResponse.json({ error: "Skill not found or not owned by you" }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, category, tags, published } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (category !== undefined) updateData.category = category
    if (tags !== undefined) updateData.tags = tags
    if (published !== undefined) updateData.published = published

    const updated = await prisma.skill.update({
      where: { id: skill.id },
      data: updateData,
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        trustScore: true,
        _count: { select: { actions: true, executions: true } },
      },
    })

    return NextResponse.json({ skill: updated })
  } catch (error) {
    console.error("PATCH /api/skills/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const skill = await prisma.skill.findFirst({
      where: { OR: [{ id }, { slug: id }], authorId: user.id },
    })

    if (!skill) {
      return NextResponse.json({ error: "Skill not found or not owned by you" }, { status: 404 })
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.execution.deleteMany({ where: { skillId: skill.id } }),
      prisma.analytics.deleteMany({ where: { skillId: skill.id } }),
      prisma.review.deleteMany({ where: { skillId: skill.id } }),
      prisma.workflowSkill.deleteMany({ where: { skillId: skill.id } }),
      prisma.action.deleteMany({ where: { skillId: skill.id } }),
      prisma.permission.deleteMany({ where: { skillId: skill.id } }),
      prisma.policy.deleteMany({ where: { skillId: skill.id } }),
      prisma.skillVersion.deleteMany({ where: { skillId: skill.id } }),
      prisma.trustScore.deleteMany({ where: { skillId: skill.id } }),
      prisma.skill.delete({ where: { id: skill.id } }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/skills/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateAmtpMarkdown(skill: any): string {
  const lines: string[] = []
  lines.push("---")
  lines.push(`title: ${skill.name}`)
  lines.push(`version: "${skill.version}"`)
  lines.push(`category: ${skill.category}`)
  lines.push(`author: ${skill.author?.name || "Unknown"}`)
  if (skill.trustScore) lines.push(`trust_score: ${skill.trustScore.score}`)
  lines.push(`slug: ${skill.slug}`)
  lines.push(`published: ${skill.published}`)
  lines.push("---")
  lines.push("")
  lines.push(`# ${skill.name}`)
  lines.push("")
  if (skill.description) lines.push(skill.description)
  lines.push("")
  lines.push(`- **Version:** ${skill.version}`)
  lines.push(`- **Category:** ${skill.category}`)
  lines.push(`- **Author:** ${skill.author?.name || "Unknown"}`)
  if (skill.trustScore) lines.push(`- **Trust Score:** ${skill.trustScore.score}`)
  lines.push("")
  lines.push("## Actions")
  lines.push("")
  for (const action of skill.actions || []) {
    lines.push(`### \`${action.actionId}\``)
    lines.push(`- **Name:** ${action.name}`)
    if (action.description) lines.push(`- **Description:** ${action.description}`)
    if (action.endpoint) lines.push(`- **Endpoint:** ${action.endpoint}`)
    lines.push(`- **Method:** ${action.method}`)
    lines.push(`- **Risk Level:** ${action.riskLevel}`)
    if (action.parameters) {
      lines.push("- **Parameters:**")
      const params = Array.isArray(action.parameters) ? action.parameters : []
      for (const p of params) {
        lines.push(`  - \`${p.name}\` (${p.type}${p.required ? ", required" : ""})${p.description ? ": " + p.description : ""}`)
      }
    }
    lines.push("")
  }
  if (skill.permissions?.length) {
    lines.push("## Permissions")
    lines.push("")
    for (const perm of skill.permissions) {
      lines.push(`- **Roles:** ${perm.roles.join(", ")}`)
      lines.push(`  **Scopes:** ${perm.scopes.join(", ")}`)
      lines.push(`  **Auth:** ${perm.authRequirements.join(", ")}`)
      if (perm.approvalRequired) lines.push("  *Approval required*")
      lines.push("")
    }
  }
  if (skill.policies?.length) {
    lines.push("## Policies")
    lines.push("")
    for (const policy of skill.policies) {
      if (policy.rateLimit) lines.push(`- **Rate Limit:** ${policy.rateLimit} req/${policy.rateLimitWindow || "?"}s`)
      if (policy.restrictions) lines.push(`- **Restrictions:** ${JSON.stringify(policy.restrictions)}`)
      lines.push("")
    }
  }
  return lines.join("\n")
}
