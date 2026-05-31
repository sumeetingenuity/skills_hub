# AMTP Markdown Format

AMTP documents extend standard markdown with structured blocks for machine parsing. All blocks use fenced code blocks with language identifiers.

---

## Metadata Block

Documents begin with an optional metadata block:

```markdown
```amtp-meta
{
  "pageId": "skill-contract-analyzer",
  "pageType": "skill",
  "version": "1.0",
  "sessionRequired": false,
  "updatedAt": "2025-01-15T10:00:00Z"
}
```
```

---

## Action Definition Block

Structured action definitions with typed parameters:

```markdown
```amtp-action
[
  {
    "id": "analyze_contract",
    "label": "Analyze Contract",
    "description": "Analyze a legal contract for risks and clauses",
    "method": "POST",
    "endpoint": "/api/actions/analyze_contract",
    "permissions": ["contract:analyze"],
    "parameters": [
      { "name": "contractText", "type": "string", "required": true, "description": "Full contract text" },
      { "name": "riskThreshold", "type": "string", "required": false, "default": "medium", "enum": ["low", "medium", "high"] }
    ],
    "rateLimit": { "requests": 100, "window": "minute" }
  }
]
```
```

### Simple Action Notation

For simple cases, inline action tokens are supported:

```markdown
## Actions

[ANALYZE] — Analyze a contract
[EXTRACT] — Extract clauses
[COMPARE] — Compare two contracts
```

---

## Permissions Block

```markdown
```amtp-permissions
[
  {
    "id": "contract:analyze",
    "name": "Analyze Contracts",
    "resource": "contract:*",
    "actions": ["analyze_contract", "extract_clauses"]
  },
  {
    "id": "contract:delete",
    "name": "Delete Contracts",
    "resource": "contract:*",
    "actions": ["delete_contract"]
  }
]
```
```

---

## Policy Block

```markdown
```amtp-policy
[
  {
    "id": "admin-policy",
    "name": "Admin Access",
    "permissions": ["contract:analyze", "contract:delete"],
    "roles": ["admin"],
    "priority": 100
  },
  {
    "id": "analyst-policy",
    "name": "Analyst Access",
    "permissions": ["contract:analyze"],
    "roles": ["analyst"]
  }
]
```
```

---

## Skill Block

```markdown
```amtp-skill
[
  {
    "id": "contract-manager",
    "name": "Contract Management",
    "actions": ["analyze_contract", "extract_clauses", "delete_contract"],
    "permissions": ["contract:analyze", "contract:delete"],
    "requires": ["authentication"]
  }
]
```
```

---

## Form Definition

```markdown
## Search Contracts
ACTION: search_contracts
METHOD: POST
ENDPOINT: /api/actions/search_contracts
FIELD: query
TYPE: text
REQUIRED: true
LABEL: Search Query
FIELD: dateFrom
TYPE: date
REQUIRED: false
LABEL: From Date
```

---

## Structured Data

```markdown
```amtp-data
{
  "@type": "ContractAnalysis",
  "riskScore": 0.72,
  "clauses": ["indemnification", "termination", "liability"],
  "recommendation": "review"
}
```
```

---

## Links

```markdown
[View Contract](/contracts/doc_123) — View the full contract
[Related Skills](/skills?category=legal) — Browse legal skills
```

---

## Pagination

```markdown
```amtp-pagination
{
  "pageInfo": {
    "hasNextPage": true,
    "endCursor": "cursor_abc"
  },
  "nextCursor": "cursor_abc",
  "totalItems": 42
}
```
```

---

## Complete Document Example

```markdown
# Contract Analyzer

Analyzes legal contracts for risks, clauses, and compliance issues.

**Version**: 1.0.0
**Protocol**: amtp-2025-01
**Category**: Legal
**Author**: SkillHub

```amtp-meta
{
  "pageId": "contract-analyzer",
  "pageType": "skill",
  "version": "1.0",
  "sessionRequired": false
}
```

## Description

This skill processes legal contract text and returns:
- Risk assessment scores
- Key clause identification
- Compliance recommendations
- Red-flag detection

## Actions

[ANALYZE] — Analyze a contract for risks
[EXTRACT] — Extract specific clauses
[COMPARE] — Compare two contracts

```amtp-action
[
  {
    "id": "analyze_contract",
    "label": "Analyze Contract",
    "method": "POST",
    "endpoint": "/api/actions/analyze_contract",
    "parameters": [
      { "name": "contractText", "type": "string", "required": true },
      { "name": "riskThreshold", "type": "string", "enum": ["low", "medium", "high"], "default": "medium" }
    ]
  }
]
```

## Permissions

```amtp-permissions
[
  { "id": "contract:analyze", "name": "Analyze Contracts", "resource": "contract:*", "actions": ["analyze_contract"] }
]
```

## Policies

```amtp-policy
[
  { "id": "default-policy", "name": "Default Access", "permissions": ["contract:analyze"], "roles": [] }
]
```

## Related Skills

- [Patent Search](/skills/patent-search)
- [Legal Research](/skills/legal-research)
```
