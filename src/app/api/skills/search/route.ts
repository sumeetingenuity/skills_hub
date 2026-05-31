import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get("q") || ""

    if (!q.trim()) {
      return NextResponse.json({ skills: [] })
    }

    const skills = await prisma.skill.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        category: true,
        iconUrl: true,
        version: true,
        createdAt: true,
        author: { select: { id: true, name: true, avatarUrl: true } },
        trustScore: { select: { score: true, verified: true } },
        _count: { select: { actions: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ skills })
  } catch (error) {
    console.error("GET /api/skills/search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
