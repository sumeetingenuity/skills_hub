# AMTP: Agent Markdown Transfer Protocol

**AMTP** (Agent Markdown Transfer Protocol) is an open protocol for AI agents to discover, understand, verify, execute, and compose capabilities across the web. It serves as both a content negotiation protocol and a capability description standard.

## Vision

AMTP's vision is to become the **HTTP of the Agentic Web** — a universal layer that lets any AI agent interact with any capability using a consistent, self-describing, and type-safe protocol.

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Markdown-First** | Capabilities are described in structured markdown — human-readable, machine-parseable, and LLM-friendly |
| **Deterministic Structure** | Every capability has a well-defined schema for parameters, permissions, and policies |
| **Token Efficient** | Markdown is ~90% more token-efficient than HTML for LLM consumption |
| **Content Negotiation** | Same URL serves markdown (for agents), JSON (for apps), or HTML (for browsers) via the `Accept` header |
| **Action-Native** | Capabilities declare typed actions with parameters, not DOM clicks or CSS selectors |
| **Session-Aware** | Stateful interactions persist context across requests |

## How AMTP Works

1. **A server advertises capabilities** as AMTP markdown documents
2. **An agent discovers capabilities** via a registry (like SkillHub) or direct content negotiation
3. **The agent reads the capability contract** — actions, parameters, permissions, policies
4. **The agent executes actions** via typed HTTP requests
5. **The server responds** with structured results

## Protocol Versions

| Version | Status | Key Features |
|---------|--------|-------------|
| 1.0 | Current | Core protocol, markdown grammar, actions, forms, sessions, basic streaming |
| 1.1 | Planning | Multimedia support, natural language descriptions, advanced filtering, batch operations |
| 2.0 | Planning | Multi-agent coordination, distributed sessions, advanced caching, webhook support |

## Relationship to Other Protocols

| Protocol | Focus | Relationship to AMTP |
|----------|-------|---------------------|
| **MCP** (Model Context Protocol) | Tool calling for LLMs | AMTP can wrap MCP tools as AMTP skills via adapters |
| **A2A** (Agent-to-Agent) | Inter-agent communication | AMTP provides the capability description layer A2A agents use |
| **ACP** (Agent Communication Protocol) | General agent messaging | AMTP actions can be ACP message payloads |
| **HTTP** | Web transfer | AMTP is built on HTTP, extends it with semantic capability descriptions |

## Core Specification

- **Protocol**: HTTP/1.1+, HTTPS required in production
- **Content Type**: `text/amtp+markdown` (primary), `application/json` (secondary)
- **Version Header**: `X-AMTP-Version`
- **Capability Header**: `X-AMTP-Capabilities`
