import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { slugify } from "@/lib/utils"
import { sanitizeActionId } from "@amtp/protocol"
import type { Prisma, $Enums } from "@/generated/prisma/client"
import type { AnalysisResult } from "@/lib/import/github-analyzer"

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function mapCategory(tags: string[]): $Enums.SkillCategory {
  if (tags.some((t) => ["developer-tools", "api", "cli"].includes(t))) return "DEVELOPER_TOOLS"
  if (tags.includes("ai")) return "AI_ML"
  if (tags.includes("security")) return "SECURITY"
  if (tags.includes("data")) return "DATA"
  return "OTHER"
}

function mapRiskLevel(permissions: { resource: string; action: string }[]): string {
  const sensitive = ["database", "filesystem", "authentication"]
  if (permissions.some((p) => sensitive.includes(p.resource))) return "medium"
  return "low"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, sourceUrl, manifest } = body as {
      source: string
      sourceUrl?: string
      manifest?: AnalysisResult
    }

    if (!source) {
      return NextResponse.json(
        { error: "source is required" },
        { status: 400 }
      )
    }

    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const clerkId = clerkAuth.userId
    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      const email = (clerkAuth.sessionClaims as Record<string, unknown>)?.email as string || `${clerkId}@clerk.dev`
      user = await prisma.user.create({
        data: {
          clerkId,
          email,
          name: (clerkAuth.sessionClaims as Record<string, unknown>)?.name as string || undefined,
        },
      })
    }

    if (source === "GITHUB") {
      const { analyzeGitHubRepo } = await import("@/lib/import/github-analyzer")
      const analysis: AnalysisResult = manifest || await analyzeGitHubRepo(sourceUrl!)

      const slug = slugify(analysis.name)
      const existing = await prisma.skill.findUnique({ where: { slug } })
      const finalSlug = existing ? `${slug}-${Date.now()}` : slug

      const category = mapCategory(analysis.tags)
      const riskLevel = mapRiskLevel(analysis.permissions)

      const skill = await prisma.skill.create({
        data: {
          slug: finalSlug,
          name: analysis.name,
          description: analysis.description,
          category,
          source: "GITHUB",
          sourceUrl,
          tags: analysis.tags,
          published: true,
          authorId: user.id,
          actions: {
            create: analysis.actions.map((a) => ({
              actionId: sanitizeActionId(slugify(a.name)),
              name: a.name,
              description: a.description,
              method: "POST",
              parameters: toJson(a.input),
              riskLevel,
            })),
          },
          permissions: {
            create: {
              roles: ["developer", "agent"],
              scopes: analysis.permissions.map(
                (p) => `${p.resource}:${p.action}`
              ),
              authRequirements: [],
              approvalRequired: false,
            },
          },
          policies: {
            create: {
              rateLimit: 100,
              rateLimitWindow: 60,
              restrictions: toJson(analysis.policies),
            },
          },
          versions: {
            create: {
              version: 1,
              changelog: "Initial import from GitHub",
              manifest: toJson(analysis),
            },
          },
          trustScore: {
            create: {
              score: 70,
              verified: false,
              totalExecutions: 0,
              totalReviews: 0,
            },
          },
        },
        include: {
          actions: true,
          permissions: true,
          policies: true,
          trustScore: true,
        },
      })

      try {
        const { generateEmbedding } = await import("@/lib/vector-search")
        const text = `${skill.name} ${skill.description} ${skill.tags?.join(" ") || ""} ${skill.category}`
        const embedding = await generateEmbedding(text)
        const embStr = `[${embedding.join(",")}]`
        await prisma.$queryRawUnsafe(
          `UPDATE public."Skill" SET embedding = $1::vector WHERE id = $2`,
          embStr,
          skill.id
        )
      } catch {
        console.log("Embedding generation skipped for imported skill")
      }

      await prisma.importJob.create({
        data: {
          source: "GITHUB",
          sourceUrl: sourceUrl || "",
          status: "COMPLETED",
          skillId: skill.id,
          userId: user.id,
          log: `Imported ${analysis.name} with ${analysis.actions.length} actions, detected: ${analysis.detectedFeatures.join(", ")}`,
        },
      })

      return NextResponse.json(
        {
          id: skill.id,
          slug: finalSlug,
          status: "COMPLETED",
          manifest: analysis,
          skillUrl: `/skills/${finalSlug}`,
          message: `Successfully imported "${analysis.name}" with ${analysis.actions.length} actions`,
          detectedFeatures: analysis.detectedFeatures,
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      { error: `Source type '${source}' is not yet supported for publishing` },
      { status: 400 }
    )
  } catch (error) {
    console.error("POST /api/import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
