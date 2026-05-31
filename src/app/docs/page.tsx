"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Key,
  Search,
  Zap,
  Shield,
  Globe,
  Code2,
  Copy,
  Check,
} from "lucide-react"

type Section = "overview" | "authentication" | "discovery" | "execution" | "auth-flow" | "api-reference"

const sections: { id: Section; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <BookOpen className="size-4" /> },
  { id: "authentication", label: "Authentication", icon: <Key className="size-4" /> },
  { id: "discovery", label: "Discovery & Indexing", icon: <Search className="size-4" /> },
  { id: "execution", label: "Execution", icon: <Zap className="size-4" /> },
  { id: "auth-flow", label: "Skill Auth Flow", icon: <Shield className="size-4" /> },
  { id: "api-reference", label: "API Reference", icon: <Code2 className="size-4" /> },
]

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="rounded-lg border border-border bg-black/60 p-4 text-xs font-mono text-green-400 overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 size-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      </Button>
    </div>
  )
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<Section>("overview")

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Documentation</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Learn how to integrate with AMTP SkillHub as an agent developer or skill publisher.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar navigation */}
        <nav className="lg:w-64 shrink-0">
          <div className="sticky top-20 space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeSection === s.id
                    ? "bg-neon-blue/10 text-neon-blue font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeSection === "overview" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>How SkillHub Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    AMTP SkillHub is a registry where developers publish API capabilities as <strong className="text-foreground">Skills</strong>, and AI agents discover and execute them programmatically.
                  </p>
                  <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
                    <h4 className="text-foreground font-medium">The flow:</h4>
                    <ol className="list-decimal list-inside space-y-2">
                      <li><strong className="text-foreground">Publish</strong> — Developer creates a skill with actions, parameters, and auth config</li>
                      <li><strong className="text-foreground">Discover</strong> — Agent searches the registry or fetches a skill manifest by slug</li>
                      <li><strong className="text-foreground">Authenticate</strong> — Agent presents its API key (<code className="text-neon-blue">X-API-Key: sk_...</code>)</li>
                      <li><strong className="text-foreground">Execute</strong> — Agent calls an action with parameters; SkillHub proxies to the target service</li>
                      <li><strong className="text-foreground">Respond</strong> — SkillHub returns the result, logs execution, updates trust scores</li>
                    </ol>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary">Public Skills = discoverable by all agents</Badge>
                    <Badge variant="secondary">Private Skills = visible only to the author</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Start</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Get started in 3 steps:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neon-blue text-white text-xs font-bold">1</div>
                      <div>
                        <p className="text-sm font-medium">Create an API Key</p>
                        <p className="text-xs text-muted-foreground">Go to Dashboard &rarr; API Keys &rarr; Create New Key</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neon-blue text-white text-xs font-bold">2</div>
                      <div>
                        <p className="text-sm font-medium">Discover a skill</p>
                        <CopyBlock code={`curl https://your-domain.com/api/skills/contract-analyzer \\
  -H "Accept: application/json"`} />
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-neon-blue text-white text-xs font-bold">3</div>
                      <div>
                        <p className="text-sm font-medium">Execute an action</p>
                        <CopyBlock code={`curl -X POST https://your-domain.com/api/execute \\
  -H "X-API-Key: sk_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "skillId": "contract-analyzer",
    "actionId": "analyze-contract",
    "parameters": {
      "contractText": "This agreement is entered into..."
    }
  }'`} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "authentication" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Authentication Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <p className="text-muted-foreground">
                    SkillHub supports two authentication methods depending on the client type:
                  </p>

                  <div className="space-y-4">
                    <div className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-neon-blue/10 text-neon-blue">Recommended for Agents</Badge>
                      </div>
                      <h4 className="font-medium">API Key Authentication</h4>
                      <p className="text-muted-foreground">
                        For programmatic access (agents, scripts, CI/CD). Pass your API key in the <code>X-API-Key</code> header. Works for both skill discovery (private skills) and execution.
                      </p>
                      <CopyBlock code={`# Execute a skill action
curl -X POST /api/execute \\
  -H "X-API-Key: sk_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"skillId": "my-skill", "actionId": "my-action", "input": {}}'

# Access your private skills
curl /api/skills/my-private-skill \\
  -H "X-API-Key: sk_your_api_key_here"`} />
                    </div>

                    <div className="rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Browser Sessions</Badge>
                      </div>
                      <h4 className="font-medium">Session Authentication (Clerk)</h4>
                      <p className="text-muted-foreground">
                        For the web UI. Handled automatically via cookies when signed in through the browser.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                    <h4 className="font-medium text-amber-500">API Key Security</h4>
                    <ul className="text-muted-foreground list-disc list-inside space-y-1">
                      <li>Keys are <strong className="text-foreground">hashed (SHA-256)</strong> before storage &mdash; even a database breach won&apos;t expose raw keys</li>
                      <li>Each key is tied to your user account &mdash; executions are attributed to you</li>
                      <li>Keys are shown <strong className="text-foreground">only once</strong> at creation time &mdash; save them immediately</li>
                      <li>Revoke compromised keys instantly from the dashboard</li>
                      <li>Optional expiration dates for time-limited access</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Managing API Keys</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Navigate to <strong className="text-foreground">Dashboard &rarr; API Keys</strong></li>
                    <li>Click <strong className="text-foreground">Create New Key</strong></li>
                    <li>Give it a descriptive name (e.g., &quot;Production Agent&quot;, &quot;Dev Testing&quot;)</li>
                    <li>Copy the key immediately &mdash; it won&apos;t be shown again (only a hint of the last 8 characters is stored)</li>
                  </ol>
                  <p>
                    Keys use the format <code className="text-neon-blue">sk_&lt;uuid&gt;</code> and can be revoked at any time.
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "discovery" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>How Agents Discover Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <p className="text-muted-foreground">
                    When an agent needs a capability, it queries the registry. The response includes all actions available for that skill, allowing the agent to decide which action to invoke.
                  </p>

                  <div className="space-y-4">
                    <h4 className="font-medium">1. Search the Registry</h4>
                    <CopyBlock code={`# Keyword search
GET /api/skills?q=booking&category=PRODUCTIVITY

# Semantic search (natural language)
GET /api/skills/vector-search?q=I need to book a dental appointment

# Full discovery with facets
GET /api/skills/discover?q=booking&verified=true&sort=trust`} />

                    <h4 className="font-medium">2. Fetch a Skill Manifest (Index)</h4>
                    <p className="text-muted-foreground">
                      Once an agent finds a skill, it fetches the full manifest to see all available actions, parameters, and auth requirements. This is the &quot;indexing&quot; step.
                    </p>
                    <CopyBlock code={`# Get full skill manifest
GET /api/skills/dental-booking

# Response includes:
{
  "id": "cmptn...",
  "name": "Dental Booking",
  "description": "Appointment booking for dental clinic",
  "actions": [
    {
      "actionId": "check-availability",
      "name": "Check Availability",
      "endpoint": "https://dentalclinic.com/check",
      "method": "GET",
      "parameters": [{"name": "date", "type": "string", "required": true}]
    },
    {
      "actionId": "book-appointment",
      "name": "Book Appointment",
      "endpoint": "https://dentalclinic.com/book",
      "method": "POST",
      "parameters": [
        {"name": "name", "type": "string", "required": true},
        {"name": "date", "type": "string", "required": true}
      ]
    }
  ],
  "permissions": [...],
  "trustScore": {"score": 85, "verified": true}
}`} />

                    <h4 className="font-medium">3. AMTP Markdown Format</h4>
                    <p className="text-muted-foreground">
                      For LLM-native agents, request the manifest in AMTP markdown format:
                    </p>
                    <CopyBlock code={`GET /api/skills/dental-booking
Accept: text/amtp+markdown`} />
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Globe className="size-4 text-neon-blue" />
                      Public vs Private Access Model
                    </h4>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li><strong className="text-foreground">Public skills</strong> appear in search results and can be discovered by any agent (no auth needed for browsing)</li>
                      <li><strong className="text-foreground">Private skills</strong> are completely hidden from search and return 404 to other users</li>
                      <li>Execution of any skill requires authentication (API key or session)</li>
                      <li>Private skills are accessible <strong className="text-foreground">only by the author</strong> using their API key or session</li>
                    </ul>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-medium">4. Accessing Private Skills</h4>
                    <p className="text-muted-foreground">
                      An agent using the skill author&apos;s API key can fetch and execute private (unpublished) skills by slug. Other users will receive a 404.
                    </p>
                    <CopyBlock code={`# Author's agent fetching their own private skill:
curl /api/skills/my-internal-tool \\
  -H "X-API-Key: sk_authors_key"
# → 200 OK (full manifest returned)

# Another user's agent trying the same:
curl /api/skills/my-internal-tool \\
  -H "X-API-Key: sk_other_users_key"
# → 404 Not Found

# Author's agent executing their private skill:
curl -X POST /api/execute \\
  -H "X-API-Key: sk_authors_key" \\
  -H "Content-Type: application/json" \\
  -d '{"skillId": "my-internal-tool", "actionId": "run", "input": {}}'
# → 200 OK (execution proceeds normally)`} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "execution" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Executing Skill Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <p className="text-muted-foreground">
                    After discovering a skill and reading its manifest, agents execute specific actions by calling the execute endpoint.
                  </p>

                  <div className="space-y-4">
                    <h4 className="font-medium">Basic Execution</h4>
                    <CopyBlock code={`POST /api/execute
X-API-Key: sk_your_key
Content-Type: application/json

{
  "skillId": "dental-booking",
  "actionId": "book-appointment",
  "input": {
    "name": "John Doe",
    "date": "2025-02-15T10:00:00Z"
  }
}`} />

                    <h4 className="font-medium">Execution Flow</h4>
                    <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2 text-muted-foreground">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Agent sends request with API key (<code>X-API-Key</code> header)</li>
                        <li>SkillHub validates the key (SHA-256 hash lookup) and resolves the user</li>
                        <li>Request body is validated against a strict schema (Zod)</li>
                        <li>Skill is looked up; if private, only the author&apos;s key can access it</li>
                        <li>Permission guard checks if the user/agent has required scopes</li>
                        <li>Rate limiter checks policy (e.g., 100 req/min per skill)</li>
                        <li>Target service auth headers are injected (Bearer, API key, Basic, OAuth2)</li>
                        <li>If action has a multi-step pipeline, steps execute in order</li>
                        <li>For single-endpoint actions, SkillHub proxies to the target service (with SSRF protection)</li>
                        <li>Response is returned to the agent</li>
                        <li>Execution is logged (for analytics and trust scoring)</li>
                      </ol>
                    </div>

                    <h4 className="font-medium">Input Validation</h4>
                    <p className="text-muted-foreground">
                      All inputs are validated before execution. Invalid requests receive a 400 response with details:
                    </p>
                    <CopyBlock code={`// Invalid request (missing required fields):
POST /api/execute
{"skillId": ""}

// Response:
{
  "error": "Invalid request",
  "details": ["String must contain at least 1 character(s)"]
}`} />

                    <h4 className="font-medium">Multi-Step Pipelines</h4>
                    <p className="text-muted-foreground">
                      Skills with <code>executionMode: &quot;sequential&quot;</code> execute multiple steps in order. The agent doesn&apos;t need to orchestrate these &mdash; SkillHub handles the pipeline internally.
                    </p>
                    <CopyBlock code={`// Agent just calls the top-level action:
POST /api/execute
{
  "skillId": "dental-booking",
  "actionId": "dental-booking",
  "input": { "name": "Jane", "date": "2025-03-01" }
}

// SkillHub internally executes:
// Step 1: GET https://dentalclinic.com/check?date=2025-03-01
// Step 2: POST https://dentalclinic.com/book (with name + date)`} />

                    <h4 className="font-medium">Response Format</h4>
                    <CopyBlock code={`{
  "id": "exec_abc123",
  "status": "COMPLETED",
  "output": {
    "appointmentId": "apt_123",
    "status": "confirmed",
    "dateTime": "2025-03-01T10:00:00Z"
  },
  "logs": "[2025-03-01T10:00:00Z] Execution started...",
  "latency": 1250
}`} />

                    <h4 className="font-medium">Error Responses</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3">Status</th>
                            <th className="text-left py-2 px-3">Meaning</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono">400</td>
                            <td className="py-2 px-3">Invalid request body (validation failed)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono">401</td>
                            <td className="py-2 px-3">Missing or invalid API key</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono">403</td>
                            <td className="py-2 px-3">Skill is private (not your key), or permission denied</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono">404</td>
                            <td className="py-2 px-3">Skill or action not found</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono">429</td>
                            <td className="py-2 px-3">Rate limit exceeded</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "auth-flow" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Skill-Level Authentication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <p className="text-muted-foreground">
                    There are <strong className="text-foreground">two layers</strong> of authentication:
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-neon-blue/30 bg-neon-blue/5 p-4 space-y-2">
                      <h4 className="font-medium text-neon-blue">Layer 1: Registry Auth</h4>
                      <p className="text-muted-foreground text-xs">
                        How the agent authenticates to SkillHub itself.
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>API Key (<code>X-API-Key: sk_...</code>)</li>
                        <li>Required for all execution requests</li>
                        <li>Managed in Dashboard &rarr; API Keys</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                      <h4 className="font-medium text-amber-500">Layer 2: Target Service Auth</h4>
                      <p className="text-muted-foreground text-xs">
                        How SkillHub authenticates to the skill&apos;s target API when proxying requests.
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>Configured per action during skill creation</li>
                        <li>Supports: API Key, Bearer Token, OAuth2, Basic Auth, None</li>
                        <li>Credentials are stored securely and injected at execution time</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">How Target Service Auth is Configured</h4>
                    <p className="text-muted-foreground">
                      When creating a skill, each action can specify its authentication type and credentials for the external service. This is set in the <strong className="text-foreground">Security</strong> step of the skill creation wizard.
                    </p>
                    <CopyBlock code={`// Action with auth config (stored in the Action model)
{
  "actionId": "get-appointments",
  "endpoint": "https://dentalclinic.com/api/appointments",
  "method": "GET",
  "authType": "bearer",        // "bearer" | "api-key" | "oauth2" | "basic" | "none"
  "authConfig": {
    "token": "eyJhbGciOi..."   // The actual credential
  }
}`} />
                    <p className="text-muted-foreground">
                      At execution time, SkillHub reads the action&apos;s <code>authType</code> and <code>authConfig</code>, then injects the appropriate headers when proxying to the target endpoint:
                    </p>
                    <CopyBlock code={`// What SkillHub sends to the target service:
GET https://dentalclinic.com/api/appointments
Authorization: Bearer eyJhbGciOi...
X-Hub-Signature-256: sha256=<hmac>   // payload integrity
Content-Type: application/json`} />
                  </div>

                  <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2">
                    <h4 className="font-medium">OAuth2 Flow (for user-context skills)</h4>
                    <p className="text-muted-foreground">
                      For skills that need to act on behalf of an end-user (e.g., Google Calendar, Slack), the OAuth2 flow works as follows:
                    </p>
                    <ol className="text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Skill publisher registers an OAuth2 app with the target service</li>
                      <li>Publisher stores client_id, client_secret, and token_url in the action&apos;s <code>authConfig</code></li>
                      <li>When an agent executes the skill, SkillHub uses client credentials or stored refresh tokens to get an access token</li>
                      <li>The access token is injected into the proxied request</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "api-reference" && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium">Method</th>
                          <th className="text-left py-2 px-3 font-medium">Endpoint</th>
                          <th className="text-left py-2 px-3 font-medium">Auth</th>
                          <th className="text-left py-2 px-3 font-medium">Description</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/skills</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                          <td className="py-2 px-3">List/search skills</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/skills/[slug]</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public*</Badge></td>
                          <td className="py-2 px-3">Get skill manifest (+ API Key for private skills)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/skills/discover</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                          <td className="py-2 px-3">Rich discovery with facets</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/skills/vector-search</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                          <td className="py-2 px-3">Semantic search (embeddings)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">POST</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/execute</td>
                          <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-500">API Key</Badge></td>
                          <td className="py-2 px-3">Execute a skill action</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">POST</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/skills</td>
                          <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-500">Session</Badge></td>
                          <td className="py-2 px-3">Create/publish a skill</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/categories</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                          <td className="py-2 px-3">List all categories</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/.well-known/amtp</td>
                          <td className="py-2 px-3"><Badge variant="secondary" className="text-xs">Public</Badge></td>
                          <td className="py-2 px-3">AMTP discovery document</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">POST</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/keys</td>
                          <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-500">Session</Badge></td>
                          <td className="py-2 px-3">Create API key</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 px-3"><Badge variant="outline" className="text-xs">GET</Badge></td>
                          <td className="py-2 px-3 font-mono text-xs">/api/keys</td>
                          <td className="py-2 px-3"><Badge className="text-xs bg-amber-500/10 text-amber-500">Session</Badge></td>
                          <td className="py-2 px-3">List your API keys</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="font-medium">Query Parameters for Discovery</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium">Param</th>
                            <th className="text-left py-2 px-3 font-medium">Type</th>
                            <th className="text-left py-2 px-3 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-muted-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">q</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">Search query (keyword or natural language)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">category</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">Filter by category (e.g., FINANCE, LEGAL)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">verified</td>
                            <td className="py-2 px-3">boolean</td>
                            <td className="py-2 px-3">Only verified skills</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">sort</td>
                            <td className="py-2 px-3">string</td>
                            <td className="py-2 px-3">newest, popularity, trust</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">page</td>
                            <td className="py-2 px-3">number</td>
                            <td className="py-2 px-3">Page number (default: 1)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 px-3 font-mono text-xs">limit</td>
                            <td className="py-2 px-3">number</td>
                            <td className="py-2 px-3">Results per page (default: 20, max: 100)</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
