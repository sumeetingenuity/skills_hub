import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { MIMEType } from "@amtp/protocol"
import { DEFAULT_SKILLS } from "@/lib/default-skills"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get("q") || ""
    const category = searchParams.get("category")
    const verified = searchParams.get("verified")
    const source = searchParams.get("source")
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || []
    const minTrust = parseInt(searchParams.get("min_trust") || "0", 10)
    const sort = searchParams.get("sort") || "relevance"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: any = { published: true }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q.toLowerCase()] } },
      ]
    }

    if (category && category !== "undefined" && category !== "all") where.category = category
    if (source && source !== "undefined") where.source = source
    if (tags.length > 0) where.tags = { hasSome: tags }

    if (verified === "true") {
      where.trustScore = { verified: true }
    }

    if (minTrust > 0) {
      where.trustScore = { ...(where.trustScore || {}), score: { gte: minTrust } }
    }

    const orderBy: any =
      sort === "popularity"
        ? { executions: { _count: "desc" } }
        : sort === "trust"
          ? { trustScore: { score: "desc" } }
          : sort === "newest"
            ? { createdAt: "desc" }
            : sort === "name"
              ? { name: "asc" }
              : { createdAt: "desc" }

    const [skills, total, facets] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          trustScore: { select: { score: true, verified: true, totalExecutions: true } },
          _count: { select: { actions: true, executions: true } },
        },
      }),
      prisma.skill.count({ where }),
      prisma.skill.groupBy({
        by: ["category"],
        where: { published: true },
        _count: { _all: true },
      }),
    ])

    // If database is empty, return default skill templates as fallback
    if (total === 0 && !q && !category) {
      const defaults = DEFAULT_SKILLS.map((s, i) => ({
        id: s.slug,
        slug: s.slug,
        name: s.name,
        description: s.description,
        category: s.category,
        tags: s.tags,
        published: true,
        version: 1,
        author: { id: "system", name: "AMTP Team", avatarUrl: null },
        trustScore: { score: 82 + (i * 3) % 15, verified: i % 2 === 0, totalExecutions: 1200 + i * 430 },
        _count: { actions: s.actions.length, executions: 1200 + i * 430 },
      }))
      return NextResponse.json({
        skills: defaults.slice(skip, skip + limit),
        total: defaults.length,
        page,
        limit,
        facets: { categories: [] },
        _fallback: true,
      })
    }

    const accept = request.headers.get("accept") || ""
    if (accept.includes(MIMEType.AMTP_MARKDOWN) || accept.includes("text/amtp")) {
      const md = generateDiscoveryMarkdown(skills, total, page, limit)
      return new NextResponse(md, {
        headers: {
          "Content-Type": `${MIMEType.AMTP_MARKDOWN}; charset=utf-8`,
          "X-AMTP-Version": "1.0",
          "X-Total-Count": total.toString(),
          "X-Page": page.toString(),
        },
      })
    }

    return NextResponse.json({
      skills,
      total,
      page,
      limit,
      facets: {
        categories: facets.map((f) => ({ category: f.category, count: f._count._all })),
      },
    })
  } catch (error) {
    console.error("GET /api/skills/discover error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateDiscoveryMarkdown(skills: any[], total: number, page: number, limit: number): string {
  const lines: string[] = []
  lines.push("---")
  lines.push("type: discovery")
  lines.push(`total: ${total}`)
  lines.push(`page: ${page}`)
  lines.push(`limit: ${limit}`)
  lines.push("---")
  lines.push("")
  lines.push("# AMTP Capability Discovery")
  lines.push("")
  lines.push(`Found ${total} capabilities.`)
  lines.push("")
  for (const skill of skills) {
    lines.push(`## ${skill.name}`)
    lines.push(`- **Slug:** ${skill.slug}`)
    lines.push(`- **Category:** ${skill.category}`)
    lines.push(`- **Trust:** ${skill.trustScore?.score || 0}${skill.trustScore?.verified ? " (verified)" : ""}`)
    lines.push(`- **Actions:** ${skill._count.actions}`)
    lines.push(`- **Executions:** ${skill._count.executions}`)
    lines.push(`- **Tags:** ${skill.tags.join(", ")}`)
    lines.push(`- **URL:** /api/skills/${skill.slug}`)
    lines.push("")
  }
  return lines.join("\n")
}
