import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthUser } from "@/lib/auth"
import { randomUUID } from "crypto"
import { hashApiKey, getKeyHint } from "@/lib/api-keys"

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        keyHint: true,
        lastUsed: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error("GET /api/keys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Generate the raw key (shown once to the user)
    const rawKey = `sk_${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "").slice(0, 16)}`

    // Store only the hash
    const keyHash = hashApiKey(rawKey)
    const keyHint = getKeyHint(rawKey)

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key: keyHash,
        keyHint,
        userId: user.id,
      },
    })

    // Return the raw key ONCE — it cannot be retrieved again
    return NextResponse.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyHint: apiKey.keyHint,
        createdAt: apiKey.createdAt,
      },
      key: rawKey,
    }, { status: 201 })
  } catch (error) {
    console.error("POST /api/keys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
