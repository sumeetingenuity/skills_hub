# Capability Contracts

A **Capability Contract** is a machine-readable agreement that fully describes what a skill does, how to use it, what access it needs, and what guarantees it provides.

## Purpose

Contracts enable AI agents to make informed decisions about which skills to use:

- **What**: Actions and their parameters
- **How**: Endpoints and protocols
- **Who**: Permissions and authentication
- **When**: Conditions and rate limits
- **Trust**: Reputation and verification

## Contract Structure

```typescript
interface CapabilityContract {
  skill: {
    id: string;
    name: string;
    description: string;
    version: string;
    protocol: string;
    category: string;
    author: string;
    tags: string[];
  };
  actions: ActionContract[];
  permissions: Permission[];
  policies: Policy[];
  trust: TrustScore;
  compatibility: AgentCompatibility[];
}
```

### Action Contract

```typescript
interface ActionContract {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  riskLevel: "low" | "medium" | "high" | "critical";
  parameters: ParameterContract[];
  authentication: {
    required: boolean;
    methods: string[];
  };
  rateLimit: {
    requests: number;
    window: string;
  };
}
```

### Parameter Contract

```typescript
interface ParameterContract {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: unknown;
  constraints?: {
    enum?: string[];
    min?: number;
    max?: number;
    pattern?: string;
  };
}
```

### Trust Score

```typescript
interface TrustScore {
  overall: number;          // 0-100
  verified: boolean;        // Identity verified
  executions: number;       // Total executions
  successRate: number;      // 0-100%
  reviews: number;          // User reviews
  badges: string[];         // Achievement badges
}
```

## Contract Lifecycle

1. **Publish** — Skill publisher creates a capability contract
2. **Discover** — Agent finds the contract via registry search
3. **Evaluate** — Agent reads the contract to determine fitness
4. **Accept** — Agent agrees to the terms and permissions
5. **Execute** — Agent uses the skill within contract bounds
6. **Review** — Agent provides feedback on the skill

## Contract Enforcement

The SkillHub registry enforces contracts at execution time:

1. **Parameter validation** — All inputs are checked against the contract schema
2. **Permission enforcement** — Agent permissions are verified before execution
3. **Rate limiting** — Usage is capped as specified in the contract
4. **Execution recording** — All executions are logged for trust score calculation

## Example Contract

```json
{
  "skill": {
    "id": "contract-analyzer",
    "name": "Contract Analyzer",
    "description": "Analyzes legal contracts for risks and clauses",
    "version": "1.0.0",
    "protocol": "amtp-2025-01",
    "category": "legal",
    "author": "SkillHub",
    "tags": ["legal", "contracts", "analysis", "NLP"]
  },
  "actions": [
    {
      "id": "analyze_contract",
      "name": "Analyze Contract",
      "description": "Analyze a legal contract for risks and key clauses",
      "endpoint": "/api/actions/analyze_contract",
      "method": "POST",
      "riskLevel": "medium",
      "parameters": [
        { "name": "contractText", "type": "string", "required": true, "description": "Full contract text" },
        { "name": "riskThreshold", "type": "string", "required": false, "defaultValue": "medium", "constraints": { "enum": ["low", "medium", "high"] } }
      ],
      "authentication": { "required": true, "methods": ["bearer_token"] },
      "rateLimit": { "requests": 100, "window": "minute" }
    }
  ],
  "trust": {
    "overall": 92,
    "verified": true,
    "executions": 15420,
    "successRate": 98.5,
    "reviews": 234,
    "badges": ["verified-publisher", "top-performer"]
  }
}
```
