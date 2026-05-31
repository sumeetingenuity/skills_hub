# Integration Guide

## For Skill Publishers

### Publishing a Skill

1. **Define your capability contract**
2. **Create a manifest** in AMTP markdown or JSON format
3. **Publish to SkillHub** via the import API or web UI
4. **Verify** your skill appears in search results

### Writing an AMTP Manifest

Create a `skill.amtp.md` file:

```markdown
# My Skill Name

Description of what this skill does.

```amtp-action
[
  {
    "id": "my_action",
    "label": "My Action",
    "method": "POST",
    "endpoint": "/api/actions/my_action",
    "parameters": [
      { "name": "input", "type": "string", "required": true }
    ]
  }
]
```
```

### Using the Publisher SDK

```typescript
import { SkillHubPublisher } from "@amtp/sdk";

const publisher = new SkillHubPublisher({
  registryUrl: "https://skillhub.io",
  apiKey: "sk_...",
});

const skill = await publisher.publish({
  name: "My Skill",
  description: "Does something useful",
  category: "general",
  actions: [
    {
      id: "my_action",
      label: "My Action",
      method: "POST",
      parameters: [
        { name: "input", type: "string", required: true }
      ],
    },
  ],
});
```

---

## For Agent Developers

### Discovering Skills

```typescript
import { SkillHubClient } from "@amtp/sdk";

const client = new SkillHubClient({
  registryUrl: "https://skillhub.io",
});

// Keyword search
const skills = await client.searchSkills("analyze contracts");

// Semantic search
const results = await client.semanticSearch("find legal risks in contracts");

// Filter by category
const legalSkills = await client.searchSkills("", { category: "legal" });
```

### Reading a Capability Contract

```typescript
const contract = await client.getCapabilityContract("contract-analyzer");

console.log(contract.actions);
// [{ id: "analyze_contract", parameters: [...], riskLevel: "medium" }]

console.log(contract.trust);
// { overall: 92, verified: true, successRate: 98.5 }
```

### Executing an Action

```typescript
const result = await client.executeAction("contract-analyzer", "analyze_contract", {
  contractText: "This agreement is entered into...",
  riskThreshold: "medium",
});

console.log(result.data);
// { riskScore: 0.72, clauses: [...], recommendation: "review" }
```

---

## For Server Developers

### Building an AMTP-Enabled Server

Using the `@amtp/protocol` package:

```typescript
import { AMTPServer } from "@amtp/protocol";

const server = new AMTPServer({ port: 3000 });

server.register("GET", "/", async (req, res) => {
  const doc = {
    type: "document",
    title: "My AMTP Server",
    actions: [
      { id: "greet", label: "Greet", method: "POST", endpoint: "/api/greet" },
    ],
    links: [
      { text: "Skills", url: "/skills", type: "internal" },
    ],
  };
  res.json(doc);
});

server.start();
```

### Running the Reference Server

```bash
cd reference/server
npm install
npx tsx server.ts
```

---

## For Frontend Developers

Using the React SDK:

```tsx
import { useSkill, useExecuteAction } from "@amtp/sdk/react";

function SkillPage() {
  const { skill, loading } = useSkill("contract-analyzer");

  const { execute, result, executing } = useExecuteAction();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{skill.name}</h1>
      <p>{skill.description}</p>
      {skill.actions.map(action => (
        <button
          key={action.id}
          onClick={() => execute(skill.id, action.id, {})}
          disabled={executing}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

---

## API Reference

### SkillHub Registry API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/skills` | List skills with search |
| `GET` | `/api/skills/[id]` | Get skill detail |
| `GET` | `/api/skills/vector-search` | Semantic search |
| `POST` | `/api/execute` | Execute an action |
| `GET` | `/api/analytics` | Execution analytics |
| `GET` | `/api/metrics` | Ecosystem metrics |
| `GET` | `/api/categories` | List categories |
| `POST` | `/api/import` | Import a skill |
| `POST` | `/api/import/analyze` | Analyze source |

### Query Parameters

#### `GET /api/skills`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Search query |
| `category` | string | Category filter |
| `sort` | `newest`/`popularity`/`trust` | Sort order |
| `page` | number | Page number |
| `limit` | number | Items per page |

#### `GET /api/skills/vector-search`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Natural language query |
| `category` | string | Category filter |
| `limit` | number | Max results |
