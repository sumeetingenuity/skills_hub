# AMTP Protocol Documentation

The Agent Markdown Transfer Protocol (AMTP) is the foundation of the SkillHub platform. This directory contains the comprehensive protocol specification and integration guides.

## Index

| Document | Description |
|----------|-------------|
| [01-overview.md](01-overview.md) | What is AMTP, vision, principles, versioning |
| [02-core-concepts.md](02-core-concepts.md) | Skills, Actions, Permissions, Policies, Contracts |
| [03-protocol-spec.md](03-protocol-spec.md) | HTTP methods, content negotiation, request/response |
| [04-markdown-format.md](04-markdown-format.md) | AMTP markdown blocks (meta, action, permission, policy) |
| [05-discovery.md](05-discovery.md) | How agents discover capabilities |
| [06-execution.md](06-execution.md) | Action execution flow, validation, streaming |
| [07-security.md](07-security.md) | Auth, authorization, rate limiting, best practices |
| [08-capability-contracts.md](08-capability-contracts.md) | Capability Contract specification |
| [09-registry-integration.md](09-registry-integration.md) | How SkillHub implements AMTP |
| [10-integration-guide.md](10-integration-guide.md) | Guides for publishers, agents, server, frontend devs |

## Quick Start

```bash
# Browse the registry
curl https://skillhub.io/api/skills

# Fetch a skill's AMTP manifest
curl -H "Accept: text/amtp+markdown" https://skillhub.io/api/skills/contract-analyzer

# Semantic search
curl "https://skillhub.io/api/skills/vector-search?q=analyze+contracts"
```

## Related Packages

| Package | Description |
|---------|-------------|
| `@amtp/protocol` | Core protocol implementation (server, client, crawler, CLI) |
| `@amtp/sdk` (in-repo) | SkillHub-specific SDK (client, publisher, React hooks) |
