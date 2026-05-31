# Core Concepts

## Skill

A **Skill** is the fundamental unit of capability in AMTP. It represents a discrete, executable function that an AI agent can discover, understand, and use.

```typescript
interface Skill {
  id: string;
  name: string;
  description?: string;
  actions: Action[];
  permissions?: Permission[];
  policies?: Policy[];
  requires?: string[];     // prerequisite skill IDs
  metadata?: Record<string, unknown>;
}
```

### Skill Properties

| Property | Description |
|----------|-------------|
| `id` | Unique identifier (e.g., `contract-analyzer`) |
| `name` | Human-readable name |
| `description` | What the skill does, when to use it |
| `actions` | Typed operations the skill exposes |
| `permissions` | Permission model for access control |
| `policies` | Policy bindings for roles and conditions |
| `requires` | Prerequisite skills (composition) |
| `metadata` | Pricing, categories, tags, trust score |

### Skill Manifest

In the SkillHub registry, every skill publishes an AMTP manifest:

```json
{
  "name": "Contract Analyzer",
  "description": "Analyzes legal contracts for risks, clauses, and compliance issues",
  "version": "1.0.0",
  "protocol": "amtp-2025-01",
  "actions": [...],
  "permissions": {...},
  "policies": {...}
}
```

---

## Action

An **Action** is a typed, executable operation exposed by a skill. Actions are the primary way agents interact with capabilities.

```typescript
interface Action {
  id: string;
  label?: string;
  description?: string;
  method: HTTPMethod;
  endpoint: string;
  parameters?: ActionParameter[];
  requiresAuthentication?: boolean;
  idempotent?: boolean;
  timeoutMs?: number;
  expectedOutcomes?: string[];
  rateLimit?: RateLimit;
  permissions?: string[];
}
```

### Action Parameters

Parameters are typed and validated:

```typescript
interface ActionParameter {
  name: string;
  type: ParameterType;  // string, number, boolean, email, url, date, enum, object, array, file
  required?: boolean;
  description?: string;
  default?: unknown;
  enum?: string[];
  min?: number;
  max?: number;
  pattern?: string;
}
```

### Risk Levels

Actions can be annotated with risk levels (SkillHub extension):

| Level | Color | Example |
|-------|-------|---------|
| Low | Green | Search, read operations |
| Medium | Yellow | Data transformation |
| High | Orange | Data modification |
| Critical | Red | Financial transactions, deletion |

---

## Permission

A **Permission** grants the right to perform actions on a resource.

```typescript
interface Permission {
  id: string;
  name: string;
  description?: string;
  resource: string;       // "contract:*", "invoice:read"
  actions: string[];      // action IDs this permission allows
  constraints?: Record<string, unknown>;
}
```

---

## Policy

A **Policy** binds permissions to roles and conditions.

```typescript
interface Policy {
  id: string;
  name: string;
  description?: string;
  permissions: string[];  // permission IDs
  roles?: string[];       // role names, empty = all authenticated
  conditions?: PolicyCondition[];
  priority?: number;      // higher priority overrides lower
}

interface PolicyCondition {
  field: string;
  operator: "eq" | "neq" | "in" | "gt" | "lt" | "contains" | "exists";
  value?: unknown;
}
```

---

## Capability Contract

A **Capability Contract** is the full, structured description of what a skill offers. It bundles:

- **Actions** — what you can do
- **Permissions** — what access is needed
- **Policies** — who can do what
- **Trust Score** — how reliable the skill is
- **Compatibility** — which agents can use it

This is the "documentation" an agent reads before deciding to use a skill.

---

## Compatibility Matrix

The **Compatibility Matrix** defines which AI agents can use a given skill based on:

- **Maximum risk level** the agent supports
- **Capability requirements** (streaming, file upload, etc.)
- **Authentication methods** the agent supports

| Compatibility | Meaning |
|--------------|---------|
| Full | Agent can use all actions |
| Partial | Some actions limited by risk level or capability gap |
| Limited | Agent can only use basic read actions |
