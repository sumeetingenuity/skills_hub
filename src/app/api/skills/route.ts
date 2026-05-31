import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { DEFAULT_SKILLS } from "@/lib/default-skills"
import { createSkillSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const sort = searchParams.get("sort") || "newest"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))
    const skip = (page - 1) * limit

    const where: Prisma.SkillWhereInput = { published: true }

    if (category && category !== "undefined" && category !== "all") {
      where.category = category as any
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const orderBy: Prisma.SkillOrderByWithRelationInput =
      sort === "popularity"
        ? { executions: { _count: "desc" } }
        : sort === "trust"
          ? { trustScore: { score: "desc" } }
          : { createdAt: "desc" }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
          trustScore: { select: { score: true, verified: true, totalExecutions: true, totalReviews: true } },
          _count: { select: { actions: true } },
        },
      }),
      prisma.skill.count({ where }),
    ])

    // Fallback to default skills when database is empty
    if (total === 0 && !search && !category) {
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
        trustScore: { score: 82 + (i * 3) % 15, verified: i % 2 === 0, totalExecutions: 1200 + i * 430, totalReviews: 10 + i * 5 },
        _count: { actions: s.actions.length },
      }))
      return NextResponse.json({ skills: defaults.slice(skip, skip + limit), total: defaults.length, page, limit })
    }

    return NextResponse.json({ skills, total, page, limit })
  } catch (error) {
    console.error("GET /api/skills error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { auth: clerkAuth } = await import("@clerk/nextjs/server")
    const authResult = await clerkAuth()
    if (!authResult.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { getAuthUser } = await import("@/lib/auth")
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 })
    }

    const body = await request.json()
    const parsed = createSkillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) },
        { status: 400 }
      )
    }

    const { name, description, category, tags, actions, permissions, policies, visibility, sourceUrl, source } = parsed.data
    const published = parsed.data.published

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    const existingSkill = await prisma.skill.findUnique({ where: { slug } })
    if (existingSkill) {
      return NextResponse.json({ error: "A skill with this name already exists" }, { status: 409 })
    }

    const isPublic = visibility !== "private"

    const skill = await prisma.skill.create({
      data: {
        name,
        slug,
        description,
        category: category || "OTHER",
        tags: tags || [],
        published: isPublic && (published !== false),
        source: source || null,
        sourceUrl: sourceUrl || null,
        authorId: user.id,
        actions: actions?.length ? {
          create: actions.map((action: any) => ({
            actionId: action.actionId || action.id || action.name.toLowerCase().replace(/\s+/g, "-"),
            name: action.name,
            description: action.description || null,
            endpoint: action.endpoint || null,
            method: action.method || "POST",
            parameters: action.parameters || null,
            riskLevel: action.riskLevel || "low",
            steps: action.steps || null,
            executionMode: action.executionMode || "single",
            authType: action.authType || null,
            authConfig: action.authConfig || null,
            headers: action.headers || null,
          } as any)),
        } : undefined,
        permissions: permissions?.length ? {
          create: permissions.map((perm: any) => ({
            roles: perm.roles || [],
            scopes: perm.scopes || [],
            authRequirements: perm.authRequirements || [],
            approvalRequired: perm.approvalRequired || false,
          })),
        } : undefined,
        policies: policies?.length ? {
          create: policies.map((pol: any) => ({
            rateLimit: pol.rateLimit || null,
            rateLimitWindow: pol.rateLimitWindow || null,
            restrictions: pol.restrictions || null,
            executionConditions: pol.executionConditions || null,
          })),
        } : undefined,
        trustScore: {
          create: {
            score: 50,
            successRate: 1.0,
            uptime: 1.0,
            verified: false,
            totalExecutions: 0,
            totalReviews: 0,
          },
        },
        versions: {
          create: {
            version: 1,
            changelog: "Initial version",
            manifest: JSON.parse(JSON.stringify({
              name,
              description,
              category,
              tags: tags || [],
              actions: actions || [],
              permissions: permissions || [],
              policies: policies || [],
            })),
          },
        },
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        actions: true,
        trustScore: true,
      },
    })

    // Generate embedding for semantic search
    try {
      const { generateEmbedding } = await import("@/lib/vector-search")
      const text = `${skill.name} ${description} ${tags?.join(" ") || ""} ${category}`
      const embedding = await generateEmbedding(text)
      const embStr = `[${embedding.join(",")}]`
      await prisma.$queryRawUnsafe(
        `UPDATE public."Skill" SET embedding = $1::vector WHERE id = $2`,
        embStr,
        skill.id
      )
    } catch {
      console.log("Embedding generation skipped for new skill")
    }

    return NextResponse.json({ skill, slug: skill.slug }, { status: 201 })
  } catch (error) {
    console.error("POST /api/skills error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
