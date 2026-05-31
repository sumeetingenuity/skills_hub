# Protocol Specification

## HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Retrieve an AMTP document or resource | Yes |
| `POST` | Execute an action, submit a form | No |
| `PUT` | Create or replace a resource | Yes |
| `PATCH` | Partially update a resource | No |
| `DELETE` | Remove a resource | Yes |

## Content Negotiation

AMTP uses HTTP content negotiation to serve multiple representations of the same resource.

### Accept Header

| Accept Value | Response Format | Consumer |
|-------------|----------------|----------|
| `text/amtp+markdown` | AMTP markdown document | AI agents |
| `text/markdown` | Standard markdown | Humans / tools |
| `application/json` | JSON representation | API clients |
| `text/html` | HTML page | Web browsers |

### Content-Type Header

Responses include the appropriate content type:

```
Content-Type: text/amtp+markdown; charset=utf-8
```

### Version Negotiation

```
Accept: text/amtp+markdown; version=2.0
X-AMTP-Version: 2.0
```

---

## Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Accept` | Yes | Desired response format |
| `X-AMTP-Version` | Recommended | Protocol version |
| `X-AMTP-Capabilities` | Optional | Agent capability declaration |
| `X-Session-ID` | Conditional | Session identifier |
| `X-Agent-Identity` | Optional | Agent identifier |
| `Authorization` | Conditional | Bearer token, API key, JWT |
| `User-Agent` | Recommended | Agent identifier string |

### Capabilities Declaration

Agents declare their capabilities to let servers adapt responses:

```
X-AMTP-Capabilities: actions,streaming,forms,tools,pagination,multimodal
```

| Capability | Description |
|------------|-------------|
| `actions` | Can execute typed actions |
| `streaming` | Supports SSE/WebSocket streams |
| `forms` | Can submit complex forms |
| `tools` | Can integrate external tools |
| `pagination` | Supports cursor/offset pagination |
| `multimodal` | Can handle images, files |
| `sessions` | Supports stateful sessions |
| `file_upload` | Can upload files |

---

## Response Headers

| Header | Description |
|--------|-------------|
| `Content-Type` | Response format (e.g., `text/amtp+markdown`) |
| `X-AMTP-Version` | Protocol version used |
| `X-Session-ID` | Current session identifier |
| `Cache-Control` | Caching policy |
| `ETag` | Resource version for caching |
| `X-AMTP-Next-Action` | Suggested next action |

---

## Response Format

### Success Response

```json
{
  "status": "success",
  "data": { ... },
  "metadata": { ... }
}
```

### Error Response

```json
{
  "status": "error",
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient permissions",
    "details": { ... },
    "requestId": "req_abc123",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid parameters |
| `AUTH_REQUIRED` | 401 | Authentication needed |
| `PERMISSION_DENIED` | 403 | Not authorized |
| `RESOURCE_NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal error |
| `SERVICE_UNAVAILABLE` | 503 | Temporarily unavailable |

---

## Batch Operations

AMTP supports batch action execution via a single endpoint:

```
POST /api/amtp/batch
```

```json
{
  "batchId": "batch_abc",
  "actions": [
    { "requestId": "req_1", "action": "search", "parameters": { "q": "contracts" } },
    { "requestId": "req_2", "action": "analyze", "parameters": { "id": "doc_123" } }
  ],
  "options": {
    "atomic": false,
    "continueOnError": true
  }
}
```

Response:

```json
{
  "batchId": "batch_abc",
  "status": "partial",
  "results": [
    { "actionId": "search", "status": "success", "result": { ... } },
    { "actionId": "analyze", "status": "error", "error": { "code": "RATE_LIMITED", ... } }
  ]
}
```
