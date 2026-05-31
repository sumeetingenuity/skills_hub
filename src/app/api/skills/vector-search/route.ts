import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const category = searchParams.get("category") || undefined
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)))

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: "Query parameter q is required" }, { status: 400 })
    }

    const { vectorSearch } = await import("@/lib/vector-search")
    const result = await vectorSearch(query.trim(), { limit, category })

    const response = NextResponse.json(result)
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch (error) {
    console.error("GET /api/skills/vector-search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
