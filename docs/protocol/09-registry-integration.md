# SkillHub Registry Integration

The SkillHub platform implements the full AMTP protocol stack and serves as the reference registry implementation.

---

## AMTP Endpoints

| Endpoint | AMTP Feature |
|----------|-------------|
| `GET /api/skills` | Registry discovery — list/search skills |
| `GET /api/skills/[id]` | Skill detail with content negotiation |
| `GET /api/skills/vector-search` | Semantic search |
| `POST /api/execute` | Action execution |
| `GET /api/analytics` | Execution analytics |
| `GET /api/metrics` | Ecosystem metrics |
| `GET /api/categories` | Category discovery |

---

## Content Negotiation

The skill detail endpoint performs AMTP content negotiation:

```typescript
// src/app/api/skills/[id]/route.ts
const accept = request.headers.get("accept") || "";
if (accept.includes("text/amtp+markdown")) {
  const md = generateAmtpMarkdown(skill);
  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/amtp+markdown; charset=utf-8",
    },
  });
}
```

An agent can fetch a skill's full AMTP manifest:

```bash
curl -H "Accept: text/amtp+markdown" \
  https://skillhub.io/api/skills/contract-analyzer
```

Returns:

```markdown
# Contract Analyzer

Analyzes legal contracts for risks, clauses, and compliance issues.

**Version**: 1.0.0
**Protocol**: amtp-2025-01
...
```

---

## Data Model

Skills are stored with their full AMTP manifest:

```prisma
model Skill {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String
  category    SkillCategory
  version     String   @default("1.0.0")
  protocol    String   @default("amtp-2025-01")
  manifest    Json     // Full AMTP manifest (actions, permissions, policies)
  embedding   Unsupported("vector(768)")?  // Semantic search vector
  // ... relations to actions, permissions, policies
}
```

---

## Publishing Flow

```
Publisher → Create Skill → Define Actions → Set Permissions → Publish
  → Registry stores manifest
  → Embedding generated for semantic search
  → Skill available for discovery
  → Agents can now discover and execute
```

### Via Import Engine

Skills can be imported from:
- **GitHub repos** — via the GitHub analyzer
- **AMTP Markdown** — direct manifest upload
- **MCP servers** — MCP-to-AMTP adapter
- **OpenAPI specs** — OpenAPI-to-AMTP converter

---

## Execution Flow

```
Agent → POST /api/execute
  → Registry validates against manifest schema
  → Registry checks agent permissions
  → Registry enforces rate limits
  → Registry executes action (direct or proxy)
  → Registry records execution (for analytics)
  → Registry returns result
```

### Recording

Every execution is recorded for:

- **Analytics** — Execution counts, latency, success rates
- **Trust scores** — Reliability metrics
- **Billing** — Usage tracking (future)

### Rate Limiting

Rate limits from the AMTP manifest are enforced:

```typescript
const action = skill.actions.find(a => a.id === actionId);
if (action?.rateLimit) {
  const recent = await db.execution.count({
    where: {
      skillId: skill.id,
      action: actionId,
      startedAt: { gte: new Date(Date.now() - windowMs) }
    }
  });
  if (recent >= action.rateLimit.requests) {
    return NextResponse.json({ error: { code: "RATE_LIMITED", ... } }, { status: 429 });
  }
}
```

---

## Semantic Search

SkillHub uses vector embeddings for semantic search:

1. Skill text (name + description + actions) is embedded using `nomic-embed-text`
2. Query text is embedded at search time
3. PostgreSQL pgvector performs cosine similarity search
4. Results are ranked by similarity score

```sql
SELECT id, name, description, 1 - (embedding <=> $1::vector) AS similarity
FROM "Skill"
WHERE 1 - (embedding <=> $1::vector) > $2
ORDER BY similarity DESC
LIMIT $3;
```

---

## Analytics

All execution data feeds into per-skill analytics:

| Metric | Source |
|--------|--------|
| Total Executions | Execution table count |
| Success Rate | Success/failure ratio |
| Average Latency | Execution timing |
| Active Agents | Unique agent count |
| Growth Rate | Week-over-week change |
