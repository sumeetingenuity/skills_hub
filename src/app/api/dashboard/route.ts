import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [fullUser, mySkills, recentExecutions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        include: {
          _count: {
            select: {
              skills: true,
              executions: true,
              reviews: true,
              workflows: true,
            },
          },
        },
      }),
      prisma.skill.findMany({
        where: { authorId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          _count: { select: { executions: true, actions: true } },
          trustScore: { select: { score: true } },
        },
      }),
      prisma.execution.findMany({
        where: { userId: user.clerkId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          skill: { select: { name: true, slug: true } },
        },
      }),
    ])

    return NextResponse.json({
      user: fullUser,
      mySkills,
      recentExecutions,
    })
  } catch (error) {
    console.error("GET /api/dashboard error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
