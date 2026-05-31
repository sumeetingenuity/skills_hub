import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth, currentUser } from "@clerk/nextjs/server"

export async function GET() {
  try {
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let user = await prisma.user.findUnique({
      where: { clerkId: clerkAuth.userId },
      include: {
        _count: {
          select: {
            skills: true,
            executions: true,
            reviews: true,
            workflows: true,
          },
        },
        badges: { include: { badge: true } },
        organizations: { include: { organization: true } },
      },
    })

    if (!user) {
      const clerkUser = await currentUser()
      user = await prisma.user.create({
        data: {
          clerkId: clerkAuth.userId,
          email: clerkUser?.emailAddresses?.[0]?.emailAddress || `${clerkAuth.userId}@skillhub.local`,
          name: clerkUser?.fullName || clerkUser?.firstName || null,
          avatarUrl: clerkUser?.imageUrl || null,
        },
        include: {
          _count: {
            select: {
              skills: true,
              executions: true,
              reviews: true,
              workflows: true,
            },
          },
          badges: { include: { badge: true } },
          organizations: { include: { organization: true } },
        },
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("GET /api/auth/me error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
