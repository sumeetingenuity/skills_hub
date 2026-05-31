# Action Execution

Once an agent discovers a skill and reads its capability contract, it executes actions against the skill's endpoints.

---

## Execution Flow

```
Agent → POST /api/execute { action, parameters, sessionId }
  → Server validates parameters
  → Server checks permissions
  → Server enforces rate limits
  → Server executes action
  → Server records execution with timing
  → Agent receives result
```

---

## Request Format

```
POST /api/execute HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>
X-Session-ID: sess_abc123

{
  "action": "analyze_contract",
  "parameters": {
    "contractText": "This agreement is entered into...",
    "riskThreshold": "medium"
  },
  "metadata": {
    "skillId": "contract-analyzer",
    "version": "1.0.0"
  }
}
```

---

## Response Format

### Success

```json
{
  "status": "success",
  "data": {
    "riskScore": 0.72,
    "clauses": ["indemnification", "termination"],
    "redFlags": [
      { "severity": "high", "clause": "Limitation of Liability", "issue": "Caps liability at $10,000" }
    ],
    "recommendation": "review"
  },
  "execution": {
    "id": "exec_abc123",
    "latency": 1450,
    "startedAt": "2025-01-15T10:30:00Z",
    "completedAt": "2025-01-15T10:30:01.450Z"
  }
}
```

### Validation Error

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required parameter: contractText",
    "details": {
      "field": "contractText",
      "type": "string",
      "required": true
    }
  }
}
```

### Permission Denied

```json
{
  "status": "error",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Agent lacks required permission: contract:analyze"
  }
}
```

### Rate Limited

```json
{
  "status": "error",
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. 100 requests per minute allowed.",
    "details": {
      "retryAfter": 45,
      "limit": 100,
      "window": "minute"
    }
  }
}
```

---

## Parameter Validation

Before execution, the server validates parameters against the action's schema:

| Validation | Rule |
|-----------|------|
| Required | Parameters marked `required: true` must be present |
| Type | Values must match declared `ParameterType` |
| Enum | Values must be in the `enum` list if specified |
| Range | Numeric values must be within `min`/`max` bounds |
| Pattern | String values must match `pattern` regex |

---

## Execution Recording

Every action execution is recorded with:

| Field | Description |
|-------|-------------|
| `id` | Unique execution identifier |
| `action` | Action ID that was executed |
| `parameters` | Input parameters (PII redacted in logs) |
| `status` | `success` or `failed` |
| `result` | Action response data |
| `latency` | Execution time in milliseconds |
| `error` | Error details if failed |
| `startedAt` | Timestamp of execution start |
| `completedAt` | Timestamp of completion |
| `agentId` | Agent that executed the action |

---

## Streaming Execution

For long-running actions, AMTP supports streaming responses:

```
Accept: text/event-stream
```

The server sends SSE updates:

```
event: progress
data: {"progress": 0.3, "status": "analyzing clauses"}

event: progress
data: {"progress": 0.7, "status": "checking compliance"}

event: complete
data: {"riskScore": 0.72, "clauses": [...], "redFlags": [...]}
```

---

## Batch Execution

Multiple actions can be executed in a single request:

```
POST /api/amtp/batch
```

See [Protocol Specification](03-protocol-spec.md#batch-operations) for details.
