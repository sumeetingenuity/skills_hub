import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const skills = await prisma.skill.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { executions: true, actions: true } },
        trustScore: { select: { score: true } },
      },
    })

    return NextResponse.json({ skills })
  } catch (error) {
    console.error("GET /api/dashboard/skills error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
