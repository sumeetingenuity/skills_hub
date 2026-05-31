import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"
import { slugify } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")))
    const skip = (page - 1) * limit

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where: { published: true },
        include: {
          skills: {
            include: { skill: { select: { id: true, name: true, slug: true } } },
            orderBy: { order: "asc" },
          },
          author: { select: { name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workflow.count({ where: { published: true } }),
    ])

    return NextResponse.json({ workflows, total, page, limit })
  } catch (error) {
    console.error("GET /api/workflows error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const clerkAuth = await auth()
    const clerkId = clerkAuth.userId
    if (!clerkId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    let user = await prisma.user.findUnique({ where: { clerkId } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          clerkId,
          email: `user-${clerkId}@skillhub.dev`,
          name: "User",
        },
      })
    }

    const body = await request.json()
    const { name, description, skillIds } = body

    if (!name || !skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return NextResponse.json(
        { error: "name and skillIds (non-empty array) are required" },
        { status: 400 }
      )
    }

    const baseSlug = slugify(name)
    const existing = await prisma.workflow.findUnique({ where: { slug: baseSlug } })
    const slug = existing ? `${baseSlug}-${Date.now()}` : baseSlug

    const workflow = await prisma.workflow.create({
      data: {
        name,
        description: description || "",
        slug,
        published: true,
        authorId: user.id,
        skills: {
          create: skillIds.map((skillId: string, index: number) => ({
            skillId,
            order: index,
          })),
        },
      },
      include: {
        skills: {
          include: { skill: { select: { id: true, name: true, slug: true } } },
          orderBy: { order: "asc" },
        },
        author: { select: { name: true, avatarUrl: true } },
      },
    })

    return NextResponse.json(workflow, { status: 201 })
  } catch (error) {
    console.error("POST /api/workflows error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
