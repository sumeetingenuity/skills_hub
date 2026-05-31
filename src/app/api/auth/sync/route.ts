import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { email, name, avatarUrl } = body

    const user = await prisma.user.upsert({
      where: { clerkId: clerkAuth.userId },
      update: { name, avatarUrl, email },
      create: {
        clerkId: clerkAuth.userId,
        email: email || `${clerkAuth.userId}@skillhub.local`,
        name,
        avatarUrl,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("POST /api/auth/sync error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
