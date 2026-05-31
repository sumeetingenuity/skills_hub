import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SkillCategory } from "@/generated/prisma/enums"

export async function GET(_request: NextRequest) {
  try {
    const grouped = await prisma.skill.groupBy({
      by: ["category"],
      where: { published: true },
      _count: { category: true },
    })

    const countMap = new Map(grouped.map((g) => [g.category, g._count.category]))

    // Return both formats: a simple string array for dropdowns, and detailed for facets
    const allCategories = Object.values(SkillCategory)
    const detailed = allCategories.map((name) => ({
      name,
      count: countMap.get(name) ?? 0,
    })).sort((a, b) => b.count - a.count)

    // Simple string list (what the UI expects)
    const categories = allCategories.sort()

    return NextResponse.json({ categories, detailed })
  } catch (error) {
    console.error("GET /api/categories error:", error)
    // Fallback with all enum values
    const categories = Object.values(SkillCategory).sort()
    return NextResponse.json({ categories })
  }
}
