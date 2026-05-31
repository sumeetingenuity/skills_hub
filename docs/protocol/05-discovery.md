# Capability Discovery

AMTP supports multiple discovery mechanisms for agents to find capabilities.

---

## 1. Registry-Based Discovery (Primary)

The **SkillHub registry** is the primary discovery mechanism. Agents query the registry API to find skills by keyword, category, or semantic similarity.

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/skills` | List skills with search, filter, sort, pagination |
| `GET /api/skills/vector-search?q=...` | Semantic search by natural language |
| `GET /api/skills/[id]` | Get skill detail with full manifest |
| `GET /api/categories` | List all categories with skill counts |
| `GET /api/metrics` | Ecosystem statistics |

### Discovery Flow

```
Agent → Registry Search → Skill List → Select Skill → Get Manifest → Read Contract → Execute
```

1. Agent sends a search query to `/api/skills?q=analyze+contracts`
2. Registry returns matching skills with summaries
3. Agent selects a skill and fetches `GET /api/skills/contract-analyzer`
4. With the `Accept: text/amtp+markdown` header, the full AMTP manifest is returned
5. Agent reads the capability contract (actions, parameters, permissions)
6. Agent executes actions against the skill's endpoint

### Semantic Search

The registry supports semantic (vector) search using embeddings:

```
GET /api/skills/vector-search?q=find+legal+risks+in+contracts&limit=10
```

This returns skills ranked by cosine similarity to the query embedding.

---

## 2. Direct Content Negotiation

Agents can discover capabilities from any AMTP-enabled server via HTTP content negotiation:

```
GET / HTTP/1.1
Host: skills.example.com
Accept: text/amtp+markdown
```

The server responds with its root AMTP document, which links to available capabilities.

```
GET /skills HTTP/1.1
Host: skills.example.com
Accept: text/amtp+markdown
```

Returns a directory of available skills as an AMTP document.

---

## 3. Static Manifest Files

Skills can be discovered via static AMTP manifest files:

- `/.well-known/amtp` — Well-known URI for AMTP discovery
- `/amtp-manifest.json` — JSON manifest at the application root
- `AMTP.md` — Markdown manifest at any path

### Well-Known Discovery

```
GET /.well-known/amtp HTTP/1.1
Host: example.com
```

Returns a JSON object pointing to the AMTP entry point:

```json
{
  "version": "1.0",
  "entryPoint": "/api/amtp",
  "skills": ["/skills/contract-analyzer", "/skills/invoice-generator"]
}
```

---

## 4. Crawler-Based Discovery

The **AMTP Crawler** can discover capabilities by crawling AMTP-enabled sites:

```typescript
const crawler = new AMTPCrawler({
  baseUrl: "https://registry.example.com",
  maxPages: 100,
  maxDepth: 3,
});

const skills = await crawler.crawl();
```

The crawler follows AMTP links, collects skill manifests, and builds a searchable index.

---

## 5. DNS-Based Discovery (Future)

Planned support for DNS SRV records to discover AMTP registries:

```
_amtp._tcp.example.com.  SRV 10 5 443 amtp.example.com.
```
