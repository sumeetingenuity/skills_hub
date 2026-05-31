import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const workflow = await prisma.workflow.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                author: { select: { name: true } },
                trustScore: { select: { score: true, verified: true } },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        author: { select: { name: true, avatarUrl: true } },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("GET /api/workflows/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { name, description, skillIds } = body

    const existing = await prisma.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Delete old skill connections and recreate
    await prisma.workflowSkill.deleteMany({ where: { workflowId: id } })

    const workflow = await prisma.workflow.update({
      where: { id },
      data: {
        name: name || existing.name,
        description: description ?? existing.description,
        skills: {
          create: (skillIds as string[])?.map((skillId: string, index: number) => ({
            skillId,
            order: index,
          })) || [],
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

    return NextResponse.json(workflow)
  } catch (error) {
    console.error("PUT /api/workflows/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { id } = await context.params

    const existing = await prisma.workflow.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    await prisma.workflowSkill.deleteMany({ where: { workflowId: id } })
    await prisma.workflow.delete({ where: { id } })

    return NextResponse.json({ message: "Workflow deleted" })
  } catch (error) {
    console.error("DELETE /api/workflows/[id] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
