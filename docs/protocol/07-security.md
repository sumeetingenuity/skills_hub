# Security Model

AMTP includes built-in security features for authentication, authorization, and protection.

---

## Authentication

AMTP supports multiple authentication methods:

| Method | Header | Use Case |
|--------|--------|----------|
| Bearer Token | `Authorization: Bearer <token>` | API clients |
| JWT | `Authorization: Bearer <jwt>` | Distributed auth |
| API Key | `X-API-Key: <key>` | Service-to-service |
| Session Token | `X-Session-ID: <sess_id>` | Stateful sessions |
| Basic Auth | `Authorization: Basic <base64>` | Legacy clients |

### Session Management

Sessions persist state across requests:

```http
POST /api/execute
X-Session-ID: sess_abc123
```

Session data includes:

```json
{
  "sessionId": "sess_abc123",
  "userId": "user_xyz",
  "capabilities": ["actions", "streaming"],
  "permissions": ["contract:analyze", "invoice:generate"],
  "expiresAt": "2025-01-15T11:00:00Z"
}
```

---

## Authorization

AMTP uses a policy-based access control model:

### Permission Check Flow

1. Agent sends an action request with a session
2. Server looks up the session's permissions
3. Server finds policies matching the session's role
4. Server evaluates policy conditions
5. Server checks if all required permissions are granted
6. Action is allowed or denied

### Role-Based Access

Policies bind permissions to roles:

```json
{
  "id": "admin-policy",
  "permissions": ["contract:analyze", "contract:delete"],
  "roles": ["admin"]
}
```

### Condition-Based Access

Conditions provide fine-grained control:

```json
{
  "id": "limited-policy",
  "permissions": ["contract:analyze"],
  "conditions": [
    { "field": "request.parameters.riskThreshold", "operator": "eq", "value": "low" }
  ]
}
```

---

## Rate Limiting

Rate limits are defined per action:

```json
{
  "rateLimit": {
    "requests": 100,
    "window": "minute",
    "burst": 20
  }
}
```

When exceeded, the server returns HTTP 429 with retry information:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": { "retryAfter": 45 }
  }
}
```

## CSRF Protection

AMTP servers implement CSRF protection via:
- Token-based CSRF validation
- Origin/Referer header checking
- SameSite cookie attributes

## Input Validation

All parameters are validated before execution:

| Risk | Prevention |
|------|------------|
| Injection | Type validation, pattern matching, parameterized queries |
| XSS | Output encoding, content-type enforcement |
| Path Traversal | Endpoint whitelisting, parameter sanitization |
| DoS | Rate limiting, timeout enforcement, max body size |

## Transport Security

- **HTTPS required** in production
- **HSTS** headers for strict transport security
- **CORS** configuration for cross-origin requests
- **Compression** via gzip/brotli for efficiency

## Best Practices

### For Skill Publishers

1. Use the principle of least privilege for permissions
2. Set appropriate rate limits for each action
3. Validate all input parameters
4. Use idempotent methods (GET, PUT) for read operations
5. Set reasonable timeouts for action execution

### For Agent Developers

1. Always authenticate with valid credentials
2. Respect rate limits and implement retry logic
3. Validate responses before processing
4. Use sessions for multi-step workflows
5. Handle permission denied errors gracefully
