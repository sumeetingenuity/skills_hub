import { SkillCategory } from "@/generated/prisma/client"

export interface DefaultSkillTemplate {
  name: string
  slug: string
  description: string
  category: SkillCategory
  tags: string[]
  source: string
  actions: Array<{
    actionId: string
    name: string
    description: string
    endpoint: string | null
    method: string
    parameters: Array<{
      name: string
      type: string
      required: boolean
      description: string
    }>
    riskLevel: string
  }>
  permissions: Array<{
    roles: string[]
    scopes: string[]
    authRequirements: string[]
    approvalRequired: boolean
  }>
  policies: Array<{
    rateLimit: number
    rateLimitWindow: number
    restrictions: Record<string, unknown> | null
    executionConditions: Record<string, unknown> | null
  }>
}

export const DEFAULT_SKILLS: DefaultSkillTemplate[] = [
  {
    name: "Contract Analyzer",
    slug: "contract-analyzer",
    description: "AI-powered legal contract analysis. Extract clauses, identify risks, and summarize agreements in seconds.",
    category: "LEGAL",
    tags: ["legal", "contracts", "analysis", "ai", "documents"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "analyze-contract",
        name: "Analyze Contract",
        description: "Upload and analyze a legal contract for key clauses, risks, and obligations",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "document", type: "string", required: true, description: "Contract text content" },
          { name: "focus_areas", type: "array", required: false, description: "Specific areas to focus on (e.g., liability, termination)" },
          { name: "output_format", type: "string", required: false, description: "Output format: summary, detailed, or structured" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "extract-clauses",
        name: "Extract Clauses",
        description: "Extract specific clause types from a contract",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "document", type: "string", required: true, description: "Contract text" },
          { name: "clause_types", type: "array", required: true, description: "Types of clauses to extract" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "compare-contracts",
        name: "Compare Contracts",
        description: "Compare two contracts and highlight differences",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "contract_a", type: "string", required: true, description: "First contract text" },
          { name: "contract_b", type: "string", required: true, description: "Second contract text" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "user"], scopes: ["contracts:read", "contracts:analyze"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 50, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Flight Search",
    slug: "flight-search",
    description: "Search and compare flights across multiple airlines. Find the best deals with real-time pricing.",
    category: "DATA",
    tags: ["travel", "flights", "search", "booking", "api"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "search-flights",
        name: "Search Flights",
        description: "Search for available flights between two airports",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "origin", type: "string", required: true, description: "Departure airport code (IATA)" },
          { name: "destination", type: "string", required: true, description: "Arrival airport code (IATA)" },
          { name: "departure_date", type: "string", required: true, description: "Departure date (YYYY-MM-DD)" },
          { name: "return_date", type: "string", required: false, description: "Return date for round trips" },
          { name: "passengers", type: "number", required: false, description: "Number of passengers" },
          { name: "class", type: "string", required: false, description: "Cabin class: economy, business, first" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "get-flight-details",
        name: "Get Flight Details",
        description: "Get detailed information about a specific flight",
        endpoint: null,
        method: "GET",
        parameters: [
          { name: "flight_id", type: "string", required: true, description: "Flight identifier" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "track-price",
        name: "Track Price",
        description: "Set up price tracking for a route",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "origin", type: "string", required: true, description: "Origin airport" },
          { name: "destination", type: "string", required: true, description: "Destination airport" },
          { name: "target_price", type: "number", required: true, description: "Target price threshold" },
        ],
        riskLevel: "medium",
      },
    ],
    permissions: [
      { roles: ["agent", "user"], scopes: ["flights:search", "flights:read", "flights:track"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 200, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Code Review Assistant",
    slug: "code-review-assistant",
    description: "Automated code review with security analysis, performance suggestions, and best practices enforcement.",
    category: "DEVELOPER_TOOLS",
    tags: ["code-review", "security", "development", "automation", "ci-cd"],
    source: "GITHUB",
    actions: [
      {
        actionId: "review-pull-request",
        name: "Review Pull Request",
        description: "Analyze a pull request and provide detailed feedback",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "repo_url", type: "string", required: true, description: "Repository URL" },
          { name: "pr_number", type: "number", required: true, description: "Pull request number" },
          { name: "focus", type: "array", required: false, description: "Focus areas: security, performance, style, bugs" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "analyze-code",
        name: "Analyze Code",
        description: "Static analysis of a code snippet or file",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "code", type: "string", required: true, description: "Code to analyze" },
          { name: "language", type: "string", required: true, description: "Programming language" },
          { name: "rules", type: "array", required: false, description: "Custom rules to enforce" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "suggest-fixes",
        name: "Suggest Fixes",
        description: "Generate fix suggestions for identified issues",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "code", type: "string", required: true, description: "Code with issues" },
          { name: "issues", type: "array", required: true, description: "List of issues to fix" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "developer"], scopes: ["code:read", "code:analyze", "repos:read"], authRequirements: ["oauth2"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 30, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Market Intelligence",
    slug: "market-intelligence",
    description: "Real-time market analysis, competitor tracking, and trend identification for business intelligence.",
    category: "ANALYTICS",
    tags: ["market-research", "analytics", "business-intelligence", "competitors", "trends"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "analyze-market",
        name: "Analyze Market",
        description: "Comprehensive market analysis for a given industry or segment",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "industry", type: "string", required: true, description: "Industry or market segment" },
          { name: "region", type: "string", required: false, description: "Geographic region" },
          { name: "timeframe", type: "string", required: false, description: "Analysis timeframe" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "track-competitor",
        name: "Track Competitor",
        description: "Set up monitoring for a competitor's activities",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "company_name", type: "string", required: true, description: "Competitor company name" },
          { name: "signals", type: "array", required: false, description: "Signals to track: pricing, products, hiring, funding" },
        ],
        riskLevel: "medium",
      },
      {
        actionId: "identify-trends",
        name: "Identify Trends",
        description: "Identify emerging trends in a market",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "keywords", type: "array", required: true, description: "Keywords or topics to track" },
          { name: "sources", type: "array", required: false, description: "Data sources to use" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "analyst"], scopes: ["market:read", "market:analyze", "competitors:track"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 100, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Email Composer",
    slug: "email-composer",
    description: "Generate professional emails with appropriate tone, formatting, and follow-up sequences.",
    category: "COMMUNICATION",
    tags: ["email", "writing", "communication", "automation", "outreach"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "compose-email",
        name: "Compose Email",
        description: "Generate a professional email based on context and intent",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "intent", type: "string", required: true, description: "Purpose of the email" },
          { name: "recipient", type: "string", required: false, description: "Recipient context (role, relationship)" },
          { name: "tone", type: "string", required: false, description: "Desired tone: formal, casual, urgent" },
          { name: "context", type: "string", required: false, description: "Additional context" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "create-sequence",
        name: "Create Sequence",
        description: "Generate a multi-email follow-up sequence",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "goal", type: "string", required: true, description: "Goal of the sequence" },
          { name: "steps", type: "number", required: false, description: "Number of emails in sequence" },
          { name: "interval_days", type: "number", required: false, description: "Days between emails" },
        ],
        riskLevel: "medium",
      },
    ],
    permissions: [
      { roles: ["agent", "user"], scopes: ["emails:compose", "emails:sequence"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 50, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Invoice Generator",
    slug: "invoice-generator",
    description: "Create, manage, and track professional invoices with automatic calculations and PDF generation.",
    category: "FINANCE",
    tags: ["invoices", "billing", "finance", "pdf", "payments"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "create-invoice",
        name: "Create Invoice",
        description: "Generate a new invoice with line items",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "client_name", type: "string", required: true, description: "Client/company name" },
          { name: "items", type: "array", required: true, description: "Invoice line items with description, quantity, rate" },
          { name: "currency", type: "string", required: false, description: "Currency code (USD, EUR, etc.)" },
          { name: "due_date", type: "string", required: false, description: "Payment due date" },
          { name: "notes", type: "string", required: false, description: "Additional notes" },
        ],
        riskLevel: "medium",
      },
      {
        actionId: "calculate-totals",
        name: "Calculate Totals",
        description: "Calculate invoice totals with tax and discounts",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "items", type: "array", required: true, description: "Line items" },
          { name: "tax_rate", type: "number", required: false, description: "Tax rate percentage" },
          { name: "discount", type: "number", required: false, description: "Discount amount or percentage" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "user"], scopes: ["invoices:create", "invoices:read", "invoices:calculate"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 30, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "SEO Optimizer",
    slug: "seo-optimizer",
    description: "Analyze and optimize web content for search engines. Keyword research, meta tags, and content scoring.",
    category: "MARKETING",
    tags: ["seo", "marketing", "content", "optimization", "keywords"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "analyze-page",
        name: "Analyze Page",
        description: "Full SEO analysis of a web page",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "url", type: "string", required: true, description: "URL to analyze" },
          { name: "target_keywords", type: "array", required: false, description: "Target keywords to check" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "research-keywords",
        name: "Research Keywords",
        description: "Find relevant keywords for a topic",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "topic", type: "string", required: true, description: "Topic or seed keyword" },
          { name: "intent", type: "string", required: false, description: "Search intent: informational, transactional, navigational" },
          { name: "competitors", type: "array", required: false, description: "Competitor URLs to analyze" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "optimize-content",
        name: "Optimize Content",
        description: "Suggest SEO improvements for content",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "content", type: "string", required: true, description: "Content to optimize" },
          { name: "keywords", type: "array", required: true, description: "Target keywords" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "marketer"], scopes: ["seo:analyze", "seo:research", "content:optimize"], authRequirements: ["api-key"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 60, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
  {
    name: "Security Scanner",
    slug: "security-scanner",
    description: "Automated security vulnerability scanning for web applications, APIs, and infrastructure.",
    category: "SECURITY",
    tags: ["security", "scanning", "vulnerabilities", "compliance", "pentesting"],
    source: "GITHUB",
    actions: [
      {
        actionId: "scan-endpoint",
        name: "Scan Endpoint",
        description: "Security scan of an API endpoint",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "url", type: "string", required: true, description: "Endpoint URL to scan" },
          { name: "method", type: "string", required: false, description: "HTTP method" },
          { name: "headers", type: "object", required: false, description: "Custom headers to include" },
        ],
        riskLevel: "high",
      },
      {
        actionId: "check-dependencies",
        name: "Check Dependencies",
        description: "Scan project dependencies for known vulnerabilities",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "manifest", type: "string", required: true, description: "Package manifest content (package.json, requirements.txt, etc.)" },
          { name: "ecosystem", type: "string", required: true, description: "Package ecosystem: npm, pip, cargo, go" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "generate-report",
        name: "Generate Report",
        description: "Generate a security assessment report",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "scan_results", type: "array", required: true, description: "Previous scan results to compile" },
          { name: "format", type: "string", required: false, description: "Report format: pdf, markdown, json" },
        ],
        riskLevel: "low",
      },
    ],
    permissions: [
      { roles: ["agent", "security-analyst"], scopes: ["security:scan", "security:report"], authRequirements: ["oauth2"], approvalRequired: true },
    ],
    policies: [
      { rateLimit: 10, rateLimitWindow: 60, restrictions: { "require_consent": true }, executionConditions: { "max_scan_depth": 3 } },
    ],
  },
  {
    name: "Data Pipeline Builder",
    slug: "data-pipeline-builder",
    description: "Create and manage ETL pipelines. Transform, validate, and route data between systems.",
    category: "DATA",
    tags: ["etl", "data", "pipelines", "integration", "transformation"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "create-pipeline",
        name: "Create Pipeline",
        description: "Define a new data pipeline with source, transforms, and sink",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "name", type: "string", required: true, description: "Pipeline name" },
          { name: "source", type: "object", required: true, description: "Data source configuration" },
          { name: "transforms", type: "array", required: false, description: "Transformation steps" },
          { name: "sink", type: "object", required: true, description: "Data sink/destination configuration" },
        ],
        riskLevel: "high",
      },
      {
        actionId: "validate-schema",
        name: "Validate Schema",
        description: "Validate data against a schema definition",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "data", type: "object", required: true, description: "Data to validate" },
          { name: "schema", type: "object", required: true, description: "Schema definition" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "transform-data",
        name: "Transform Data",
        description: "Apply transformations to a dataset",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "data", type: "array", required: true, description: "Input data" },
          { name: "operations", type: "array", required: true, description: "Transformation operations to apply" },
        ],
        riskLevel: "medium",
      },
    ],
    permissions: [
      { roles: ["agent", "data-engineer"], scopes: ["pipelines:create", "data:transform", "data:validate"], authRequirements: ["oauth2"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 20, rateLimitWindow: 60, restrictions: null, executionConditions: { "max_data_size_mb": 100 } },
    ],
  },
  {
    name: "Meeting Scheduler",
    slug: "meeting-scheduler",
    description: "Intelligent meeting scheduling with calendar integration, timezone handling, and availability matching.",
    category: "PRODUCTIVITY",
    tags: ["meetings", "scheduling", "calendar", "productivity", "coordination"],
    source: "AMTP_MARKDOWN",
    actions: [
      {
        actionId: "find-time",
        name: "Find Available Time",
        description: "Find mutually available time slots for all participants",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "participants", type: "array", required: true, description: "List of participant emails or IDs" },
          { name: "duration_minutes", type: "number", required: true, description: "Meeting duration in minutes" },
          { name: "date_range", type: "object", required: false, description: "Date range to search within" },
          { name: "timezone", type: "string", required: false, description: "Preferred timezone" },
        ],
        riskLevel: "low",
      },
      {
        actionId: "schedule-meeting",
        name: "Schedule Meeting",
        description: "Create and send a meeting invitation",
        endpoint: null,
        method: "POST",
        parameters: [
          { name: "title", type: "string", required: true, description: "Meeting title" },
          { name: "participants", type: "array", required: true, description: "Participant emails" },
          { name: "datetime", type: "string", required: true, description: "Meeting start time (ISO 8601)" },
          { name: "duration_minutes", type: "number", required: true, description: "Duration in minutes" },
          { name: "agenda", type: "string", required: false, description: "Meeting agenda" },
        ],
        riskLevel: "medium",
      },
    ],
    permissions: [
      { roles: ["agent", "user"], scopes: ["calendar:read", "calendar:write", "meetings:create"], authRequirements: ["oauth2"], approvalRequired: false },
    ],
    policies: [
      { rateLimit: 30, rateLimitWindow: 60, restrictions: null, executionConditions: null },
    ],
  },
]

export function getSkillBySlug(slug: string): DefaultSkillTemplate | undefined {
  return DEFAULT_SKILLS.find((s) => s.slug === slug)
}

export function getSkillsByCategory(category: string): DefaultSkillTemplate[] {
  return DEFAULT_SKILLS.filter((s) => s.category === category)
}

export function searchSkills(query: string): DefaultSkillTemplate[] {
  const q = query.toLowerCase()
  return DEFAULT_SKILLS.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.includes(q))
  )
}
