# AMTP SkillHub — The Capability Layer for AI Agents

SkillHub is a production-grade **Capability Registry** where AI agents can discover, publish, verify, execute, and compose skills using the **Agent Markdown Transfer Protocol (AMTP)**.

> "GitHub for Capabilities, npm for Agents, and the Operating System of the Agentic Web."

---

## Architecture

```
                   ┌──────────────────────┐
                   │    AI Agents          │
                   │ (Claude / ChatGPT /   │
                   │  Cursor / Custom)     │
                   └──────┬──────┬────────┘
                          │      │
              ┌───────────┘      └───────────┐
              ▼                               ▼
    ┌──────────────────┐          ┌──────────────────────┐
    │   Public API      │          │   Agent-Facing API    │
    │   (REST / JSON)   │          │   (AMTP / Markdown)   │
    └────────┬─────────┘          └──────────┬───────────┘
             │                               │
             └───────────┬───────────────────┘
                         ▼
              ┌──────────────────────┐
              │    Next.js 16 App     │
              │  (API Routes + SSR)   │
              ├──────────────────────┤
              │  Security Layer       │
              │  • SSRF Protection    │
              │  • Rate Limiting       │
              │  • Circuit Breaker     │
              │  • HMAC Signing        │
              │  • PermissionGuard     │
              ├──────────────────────┤
              │  SkillHub SDK         │
              │  (Client / Publisher)  │
              ├──────────────────────┤
              │  Import Engine        │
              │  (GitHub / MCP /      │
              │   OpenAPI / AMTP)     │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
     ┌──────────────┐    ┌──────────────────┐
     │  PostgreSQL   │    │  Vector Store     │
     │  (+ pgvector) │    │  (pgvector)       │
     └──────────────┘    └──────────────────┘
```

---

## Features

### Core Platform
- **Skill Registry** — Browse, search, and discover capabilities via REST or AMTP
- **Skill Detail Pages** — View actions, permissions, policies, trust scores, analytics
- **Execution Playground** — Execute actions directly from the UI with dynamic form generation
- **Workflow Builder** — Compose multi-skill pipelines (visual drag-and-drop composer)
- **Trust & Reputation System** — Scores, badges, verified publishers
- **Analytics Dashboard** — Execution metrics, latency, success rates, growth

### Import Engine
- **GitHub Repositories** — Analyze repo structure, extract actions/commands from README
- **MCP Manifests** — Convert MCP tool definitions into AMTP-native skills
- **OpenAPI Specs** — Import REST APIs as executable capabilities
- **AMTP Markdown** — Direct AMTP manifest upload
- Auto-detect: README actions, prompts, package.json scripts, SKILL.md

### Agent-Facing API
- Content negotiation: `Accept: text/amtp+markdown` for agent-optimized responses
- Semantic (vector) and keyword search
- Capability contracts with permission and policy introspection
- Agent compatibility matrix (ChatGPT, Claude, Cursor)

---

## Security

SkillHub implements a defense-in-depth security model aligned with the AMTP Security Specification:

| Layer | Protection | Implementation |
|-------|-----------|----------------|
| **SSRF** | Server-Side Request Forgery | DNS resolution + IP range blocking: private (10/8, 172.16/12, 192.168/16), loopback (127/8), link-local (169.254/16), IPv6 equivalents. Only ports 80/443 allowed. |
| **Rate Limiting** | Brute force / rogue loop mitigation | Per-IP token bucket (100 req/min) + global limiter (5000 req/min). `X-RateLimit-Remaining` / `Retry-After` headers set on every response. |
| **Circuit Breaker** | Cascading fault protection | Rolling window: 5 consecutive 5xx/timeout failures → 60-second open state. Automatic half-open recovery. |
| **HMAC Integrity** | Payload tamper prevention | `HMAC-SHA256` signature with epoch timestamp anti-replay on all outbound webhook requests via `X-Hub-Signature-256`. |
| **PermissionGuard** | Policy-based access control | AMTP `PermissionGuard` with `denyByDefault: true`. Enforces role/permission policies before action execution. |
| **Input Sanitization** | Injection prevention | `sanitizeActionId`, `sanitizeEndpoint`, `validateUrl` from AMTP protocol. 1MB body size limit. |
| **CORS** | Origin restriction | Dynamic origin allowlisting per request host. No wildcard `*` CORS headers. |
| **Auth** | Request authentication | Clerk authentication required for execution and mutation endpoints. |
| **Timeouts** | Resource exhaustion | 5s hard timeout on all outbound webhook calls via `AbortController`. |

All security utilities are in `src/lib/security/`:
- `ssrf.ts` — DNS-based IP resolution with private range blocking
- `rate-limit.ts` — Per-IP and global token bucket
- `circuit-breaker.ts` — Per-hostname failure tracking
- `hmac.ts` — HMAC-SHA256 signing with timestamp
- `index.ts` — Barrel exports

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** >= 15 (with pgvector extension for semantic search)
- **Docker** (optional, for containerized deployment)

---

## Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd skills_hub
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials (see Configuration below)

# 3. Start PostgreSQL
docker compose up postgres -d

# 4. Run database migrations
npx prisma db push

# 5. Seed sample skills
npm run seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `HUB_SIGNING_SECRET` | No | HMAC-SHA256 secret for outbound webhook signing |
| `GITHUB_TOKEN` | No | GitHub API token (increases rate limits for import) |
| `OPENAI_API_KEY` | No | OpenAI key for vector search embeddings |

---

## Development

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run lint       # ESLint
npm run seed       # Seed database with sample skills
npm run embed      # Generate vector embeddings for skills
```

---

## API Reference

### Public Endpoints (No auth required)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/skills` | List published skills (paginated, filterable) |
| `GET` | `/api/skills/:id` | Skill detail (supports `Accept: text/amtp+markdown`) |
| `GET` | `/api/skills/search` | Keyword search |
| `GET` | `/api/skills/vector-search` | Semantic (vector) search |
| `GET` | `/api/categories` | List skill categories with counts |
| `GET` | `/api/metrics` | Platform-wide metrics |
| `GET` | `/api/workflows` | List published workflows |

### Protected Endpoints (Auth required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/execute` | Execute a skill action (SSRF-protected, rate-limited) |
| `POST` | `/api/import` | Import skill from GitHub/OpenAPI/MCP |
| `POST` | `/api/import/analyze` | Analyze a source URL before importing |
| `GET` | `/api/import/:id` | Get import job status |
| `POST` | `/api/workflows` | Create a workflow |
| `POST` | `/api/workflows/execute` | Execute a workflow pipeline |
| `GET` | `/api/analytics` | Execution analytics |
| `POST` | `/api/skills` | Publish a new skill |

### AMTP Headers

```http
# Request (agent discovery)
Accept: text/amtp+markdown
X-Agent-ID: my-agent-v1
X-AMTP-Version: 1.0

# Response
Content-Type: text/amtp+markdown; charset=utf-8
X-AMTP-Version: 1.0
X-RateLimit-Remaining: 85
```

---

## Docker Deployment

```bash
docker compose up -d
```

Builds the Next.js standalone output and serves it alongside PostgreSQL. Environment variables are read from `.env`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | React 19, TailwindCSS 4, shadcn/ui, Framer Motion |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma 7 |
| Auth | Clerk |
| Package | `@amtp/protocol` (AMTP SDK) |

---

## AMTP Protocol

SkillHub is built on the **Agent Markdown Transfer Protocol (AMTP)** — a markdown-first, action-native protocol for agent-web interactions.

```
# Example AMTP skill document
# Contract Analyzer

Analyze legal contracts for risk, obligations, and key terms.

- **Version:** 1
- **Category:** LEGAL
- **Author:** acme-corp

## Actions

### `analyze-contract`
- **Name:** Analyze Contract
- **Description:** Analyze a contract document
- **Risk Level:** medium

## Permissions
- Roles: developer, agent
  Scopes: document:read

## Policies
- Rate limit: 100 req/60s
```

See [docs/protocol/](./docs/protocol/) for the full specification.

---

## Project Structure

```
src/
├── app/
│   ├── api/           # REST & AMTP API routes
│   ├── skills/        # Skill registry pages
│   ├── workflows/     # Workflow builder pages
│   ├── import/        # Import engine pages
│   └── page.tsx       # Landing page
├── components/
│   ├── skills/        # Skill cards, trust badges, analytics
│   ├── workflows/     # Workflow composer, cards
│   ├── agent/         # Capability contracts, compatibility
│   ├── landing/       # Hero, metrics, featured skills
│   ├── shared/        # Navbar, footer, providers
│   └── ui/            # shadcn/ui primitives
├── lib/
│   ├── amtp/          # AMTP SDK (client, publisher, validation)
│   ├── security/      # SSRF, rate limit, circuit breaker, HMAC
│   ├── import/        # GitHub analyzer, import engine
│   ├── prisma.ts      # Prisma client
│   └── utils.ts       # Utility functions
├── middleware.ts       # Clerk auth, rate limiting, CORS, security headers
└── generated/prisma/  # Auto-generated Prisma client
```

---

## License

MIT
