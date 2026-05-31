You are a Staff Principal Security and Systems Engineer specializing in Go. Build a high-performance, stateless, production-grade AMTP Capabilities Hub ("Zapier for Agents") in Go that acts as a secure application-layer API Proxy between external autonomous AI agents and developer-registered target apps.

The system must run seamlessly on an Ubuntu server, utilizing Go's native `net/http` package and lightweight concurrency model (`goroutines` and channels). It must prioritize sub-millisecond internal routing, zero cold starts, a scale-to-zero operational footprint, and absolute defensive security.

### 1. Protocol Architecture & Header Surface
The server must implement content negotiation matching the Agent Message Transfer Protocol (AMTP) specification surface:
- Inbound validation for headers: `Accept: text/amtp` and `Content-Type: text/amtp`.
- Inbound requests must supply identification headers: `X-Agent-ID` and `X-AMTP-Version`.
- Responses must return `Content-Type: text/amtp`.
- Intercepted failures must return clean Markdown-wrapped text bodies with custom AMTP response status definitions exposed via a structured front-matter block bounded by triple dashes (`---`).

### 2. High-Performance Stateless API Proxy Engine
- Maintain a local, thread-safe, memory-mapped registry (`sync.Map`) representing registered capabilities. Each item maps a unique capability name to its target URL template, schema validation contracts, and its dedicated cryptographic HMAC secret.
- Incoming agent requests containing an action payload must be intercepted, mapped to the corresponding developer backend webhook URL, and dispatched asynchronously.
- Optimize connection memory footprint: Maintain an explicit, long-lived global `http.Client` reuse topology with tuned `Transport` configurations (`MaxIdleConns: 10000`, `IdleConnTimeout: 90 * time.Second`, `MaxIdleConnsPerHost: 100`).

### 3. Hardened Security & Defensive Blueprint
You must rigorously implement and output complete code handling the following four attack vectors natively within the Go pipeline:

#### A. Advanced SSRF (Server-Side Request Forgery) Circuit Breaking
Implement a custom network Dial wrapper (`net.Dialer`) inside the `http.Transport`. Before executing any HTTP dial out to a developer-specified app URL, resolve the target domain using a strict DNS loop lookup. Block the connection instantly with an explicit `403 Forbidden` string error response if the target ip resolves to any private, loopback, multicast, or link-local network block:
- Loopback: `127.0.0.0/8`, `::1`
- Private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Link-Local: `169.254.0.0/16`, `fe80::/10`
- Block all target ports except explicitly permitted egress web channels (`80`, `443`).

#### B. Hierarchical Token Bucket Rate Limiting (Brute Force/Rogue Loop Mitigation)
Implement a nested rate-limiting mid-tier layer using `golang.org/x/time/rate`. Track limits tracking two independent, fast-lookup dimensions:
- **Global Inbound Per IP/Agent ID:** Cap incoming requests to prevent distributed automated hammering or a rogue agent stuck in an autonomous recursive loop.
- **Outbound Egress Per Developer Target Hook:** Prevent your proxy from unintentionally DOS-ing a developer's application server. If breached, return an immediate AMTP-formatted `429 Too Many Requests` status payload.

#### C. Cryptographic Payload Handshake & Integrity Verification
Every outbound HTTP POST request sent by the hub to a developer's application must feature an immutable tamper-evident payload hash. Generate a cryptographic `HMAC-SHA256` signature using the unique secret token bound to that specific developer capability entry. Transmit this signature in an outbound custom header: `X-Hub-Signature-256`. The signature must hash the raw request body string concatenated with a current epoch millisecond timestamp to permanently eliminate replay attacks.

#### D. Cascading Fault Protection (Context Timeouts & Circuit Breakers)
- Enforce strict, non-negotiable execution limits across the proxy pipeline using Go's `context.WithTimeout`. Every outbound hook is bound to a hard maximum 5-second lifetime context.
- Implement an in-memory rolling Circuit Breaker state machine tracking consecutive target delivery errors. If a target developer webhook records 5 consecutive failures (5xx status or network timeouts), trip the route state to "Open." For the next rolling 60-second window, intercept and fast-reject all incoming agent requests targeting that specific capability with a cached error layout, entirely avoiding network thread depletion.

### 4. Code Generation Deliverables
Generate a single, unified, fully functional `main.go` file containing zero mock functions or omitted block logic. Include:
1. Complete imports and the full initialization layout.
2. The complete custom network Dial proxy implementation mapping out the IP blocklists.
3. The cryptographic signature calculation and middleware rate limit structures.
4. The complete unified HTTP server loop serving the AMTP endpoints.
5. High-fidelity logging blocks capturing trace context for proxy events.
