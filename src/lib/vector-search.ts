const DIMENSION = 768
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434"
const OLLAMA_MODEL = "nomic-embed-text:latest"

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      input: text.replace(/\n/g, " ").trim(),
    }),
  })

  if (!res.ok) {
    throw new Error(`Ollama embedding failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  const emb: number[] = data.embeddings?.[0]

  if (!emb || !Array.isArray(emb) || emb.length !== DIMENSION) {
    throw new Error(`Expected ${DIMENSION}-dim embedding, got ${emb?.length || "none"}`)
  }

  return emb
}

export async function vectorSearch(
  query: string,
  options: { limit?: number; category?: string } = {}
) {
  const { limit = 20, category } = options
  const embedding = await generateEmbedding(query)
  const embStr = `[${embedding.join(",")}]`

  const params: unknown[] = [embStr]
  let sql = `
    SELECT id, 1 - (embedding <=> $1::vector) AS similarity
    FROM public."Skill"
    WHERE published = true AND embedding IS NOT NULL
  `

  if (category) {
    params.push(category)
    sql += ` AND category = $${params.length}`
  }

  const safeLimit = Math.min(Math.max(1, limit), 100)
  sql += ` ORDER BY similarity DESC LIMIT ${safeLimit}`

  const { prisma } = await import("@/lib/prisma")
  const rows: any[] = await prisma.$queryRawUnsafe(sql, ...params)

  const skillIds: string[] = rows.map((r: any) => r.id)

  if (skillIds.length === 0) {
    return { skills: [], total: 0 }
  }

  const skills = await prisma.skill.findMany({
    where: { id: { in: skillIds } },
    select: {
      id: true, slug: true, name: true, description: true, category: true,
      tags: true, version: true, createdAt: true,
      author: { select: { id: true, name: true, avatarUrl: true } },
      trustScore: { select: { score: true, verified: true, totalExecutions: true } },
      _count: { select: { actions: true } },
    },
  })

  const skillMap = new Map(skills.map((s) => [s.id, s]))
  const ordered = skillIds.map((id: string) => skillMap.get(id)).filter(Boolean)

  return { skills: ordered, total: ordered.length }
}
