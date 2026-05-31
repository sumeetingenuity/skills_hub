import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"
import { DEFAULT_SKILLS } from "@/lib/default-skills"

export async function POST() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const results = []

    for (const template of DEFAULT_SKILLS) {
      const existing = await prisma.skill.findUnique({ where: { slug: template.slug } })
      if (existing) {
        results.push({ slug: template.slug, status: "exists" })
        continue
      }

      const skill = await prisma.skill.create({
        data: {
          name: template.name,
          slug: template.slug,
          description: template.description,
          category: template.category,
          tags: template.tags,
          published: true,
          source: template.source as any,
          authorId: user.id,
          actions: {
            create: template.actions.map((a) => ({
              actionId: a.actionId,
              name: a.name,
              description: a.description,
              endpoint: a.endpoint,
              method: a.method,
              parameters: a.parameters,
              riskLevel: a.riskLevel,
            })),
          },
          permissions: {
            create: template.permissions.map((p) => ({
              roles: p.roles,
              scopes: p.scopes,
              authRequirements: p.authRequirements,
              approvalRequired: p.approvalRequired,
            })),
          },
          policies: {
            create: template.policies.map((p) => ({
              rateLimit: p.rateLimit,
              rateLimitWindow: p.rateLimitWindow,
              restrictions: p.restrictions,
              executionConditions: p.executionConditions,
            })),
          },
          trustScore: {
            create: {
              score: 75 + Math.random() * 20,
              successRate: 0.95 + Math.random() * 0.05,
              uptime: 0.99,
              verified: Math.random() > 0.5,
              totalExecutions: Math.floor(Math.random() * 10000),
              totalReviews: Math.floor(Math.random() * 100),
            },
          },
          versions: {
            create: {
              version: 1,
              changelog: "Initial version",
              manifest: template as any,
            },
          },
        },
      })

      results.push({ slug: template.slug, status: "created", id: skill.id })
    }

    return NextResponse.json({ results, total: results.length })
  } catch (error) {
    console.error("POST /api/skills/seed error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
