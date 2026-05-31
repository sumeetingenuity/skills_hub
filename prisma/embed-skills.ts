import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { generateEmbedding } from "../src/lib/vector-search"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const skills = await prisma.skill.findMany({
    select: { id: true, name: true, description: true, tags: true, category: true },
  })

  console.log(`Generating embeddings for ${skills.length} skills...`)

  for (let i = 0; i < skills.length; i++) {
    const s = skills[i]
    const text = `${s.name} ${s.description} ${s.tags?.join(" ") || ""} ${s.category}`
    const embedding = await generateEmbedding(text)
    const pgvector = require("pgvector")
    const embSql = pgvector.toSql(embedding)

    await prisma.$queryRawUnsafe(
      `UPDATE public."Skill" SET embedding = $1::vector WHERE id = $2`,
      embSql,
      s.id
    )

    console.log(`  [${i + 1}/${skills.length}] ${s.name}`)
  }

  console.log("Done!")
}

main()
  .catch((e) => {
    console.error("Failed:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
