import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await prisma.user.findFirst({
      where: { OR: [{ id }, { clerkId: id }] },
      include: {
        _count: {
          select: {
            skills: { where: { published: true } },
            executions: true,
            reviews: true,
          },
        },
        badges: { include: { badge: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const skills = await prisma.skill.findMany({
      where: { authorId: user.id, published: true },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        trustScore: { select: { score: true, verified: true, totalExecutions: true, totalReviews: true } },
        _count: { select: { actions: true } },
      },
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        _count: user._count,
      },
      skills,
      badges: user.badges,
    })
  } catch (error) {
    console.error("GET /api/profile/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
