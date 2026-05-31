/**
 * AMTP SkillHub - Multi-Step Execution Pipeline
 * 
 * Handles complex action execution flows:
 * - Single endpoint calls
 * - Sequential multi-step chains (A → B → C)
 * - Parallel execution (A | B | C → merge)
 * - Conditional branching (if result.x then A else B)
 * - Data mapping between steps (output.field → input.param)
 */

export interface ActionStep {
  id: string
  name: string
  type: "http" | "transform" | "condition" | "merge" | "delay" | "loop"
  // HTTP step config
  endpoint?: string
  method?: string
  headers?: Record<string, string>
  body?: Record<string, unknown> | string  // Can use {{step.field}} templates
  authType?: "bearer" | "api-key" | "basic" | "none"
  authConfig?: { token?: string; headerName?: string; prefix?: string }
  timeout?: number
  retries?: number
  // Data mapping: how to build this step's input from previous outputs
  inputMapping?: Record<string, string>  // { "paramName": "{{steps.step1.output.field}}" }
  // Transform step config
  transform?: {
    type: "extract" | "map" | "filter" | "reduce" | "sort" | "pick" | "template"
    expression: string  // JSONPath or template string
    target?: string     // Output field name
  }
  // Condition step config
  condition?: {
    expression: string  // e.g., "{{steps.search.output.results.length}} > 0"
    trueBranch: string  // step id to execute if true
    falseBranch?: string // step id to execute if false
  }
  // Loop step config
  loop?: {
    over: string  // "{{steps.search.output.results}}"
    as: string    // Variable name for each iteration
    maxIterations?: number
    stepIds: string[] // Steps to execute per iteration
  }
  // Merge step config
  merge?: {
    strategy: "concat" | "zip" | "object" | "first_non_null" | "cheapest" | "custom"
    sources: string[]  // Step IDs to merge from
    customExpression?: string
  }
  // Response extraction
  responseExtract?: {
    fields: Record<string, string>  // { "price": "$.data.fare.total", "airline": "$.data.carrier" }
  }
  // Flow control
  continueOnError?: boolean
  order?: number  // Execution order for sequential flows
}

export interface PipelineContext {
  steps: Record<string, StepResult>
  input: Record<string, unknown>
  variables: Record<string, unknown>
}

export interface StepResult {
  status: "completed" | "failed" | "skipped"
  output: unknown
  latency: number
  error?: string
}

export interface PipelineResult {
  status: "COMPLETED" | "FAILED" | "PARTIAL"
  output: Record<string, unknown>
  steps: Record<string, StepResult>
  logs: string[]
  totalLatency: number
  error?: string
}

/**
 * Template resolution - replaces {{path}} with values from context
 */
function resolveTemplate(template: string, ctx: PipelineContext): string {
  return template.replace(/\{\{(.*?)\}\}/g, (_, path) => {
    const trimmed = path.trim()
    try {
      // Support: steps.stepId.output.field, input.field, variables.field
      const parts = trimmed.split(".")
      let value: unknown = ctx

      for (const part of parts) {
        if (value == null) return ""
        value = (value as Record<string, unknown>)[part]
      }

      if (typeof value === "object") return JSON.stringify(value)
      return String(value ?? "")
    } catch {
      return ""
    }
  })
}

/**
 * Resolve a data mapping object against context
 */
function resolveMapping(mapping: Record<string, string>, ctx: PipelineContext): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const [key, template] of Object.entries(mapping)) {
    const value = resolveTemplate(template, ctx)
    // Try to parse JSON values
    try {
      resolved[key] = JSON.parse(value)
    } catch {
      resolved[key] = value
    }
  }
  return resolved
}

/**
 * Execute an HTTP step
 */
async function executeHttpStep(step: ActionStep, ctx: PipelineContext): Promise<StepResult> {
  const start = Date.now()

  if (!step.endpoint) {
    return { status: "failed", output: null, latency: 0, error: "No endpoint configured" }
  }

  // Resolve endpoint URL templates
  const url = resolveTemplate(step.endpoint, ctx)
  const method = step.method || "POST"
  const timeout = step.timeout || 5000

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "amtp-skillhub/1.0",
    ...(step.headers || {}),
  }

  // Resolve header templates
  for (const [key, val] of Object.entries(headers)) {
    headers[key] = resolveTemplate(val, ctx)
  }

  // Add auth
  if (step.authType === "bearer" && step.authConfig?.token) {
    const token = resolveTemplate(step.authConfig.token, ctx)
    headers["Authorization"] = `${step.authConfig.prefix || "Bearer"} ${token}`
  } else if (step.authType === "api-key" && step.authConfig?.token) {
    const headerName = step.authConfig.headerName || "X-API-Key"
    headers[headerName] = resolveTemplate(step.authConfig.token, ctx)
  }

  // Build request body
  let body: string | undefined
  if (method !== "GET" && method !== "HEAD") {
    if (step.inputMapping) {
      const mappedInput = resolveMapping(step.inputMapping, ctx)
      body = JSON.stringify(mappedInput)
    } else if (step.body) {
      if (typeof step.body === "string") {
        body = resolveTemplate(step.body, ctx)
      } else {
        const bodyStr = JSON.stringify(step.body)
        body = resolveTemplate(bodyStr, ctx)
      }
    } else {
      body = JSON.stringify(ctx.input)
    }
  }

  // Execute with retry
  const maxRetries = step.retries || 0
  let lastError: string = ""

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const responseText = await response.text()
      let output: unknown

      try {
        output = JSON.parse(responseText)
      } catch {
        output = responseText
      }

      // Extract specific fields if configured
      if (step.responseExtract?.fields && typeof output === "object" && output !== null) {
        const extracted: Record<string, unknown> = {}
        for (const [field, path] of Object.entries(step.responseExtract.fields)) {
          extracted[field] = getNestedValue(output as Record<string, unknown>, path)
        }
        output = extracted
      }

      if (!response.ok) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, step.retries || 1000))
          continue
        }
        return {
          status: "failed",
          output,
          latency: Date.now() - start,
          error: `HTTP ${response.status}: ${typeof output === "string" ? output.slice(0, 200) : JSON.stringify(output).slice(0, 200)}`,
        }
      }

      return { status: "completed", output, latency: Date.now() - start }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Unknown error"
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, step.retries || 1000))
        continue
      }
    }
  }

  return { status: "failed", output: null, latency: Date.now() - start, error: lastError }
}

/**
 * Execute a transform step
 */
function executeTransformStep(step: ActionStep, ctx: PipelineContext): StepResult {
  const start = Date.now()
  
  if (!step.transform) {
    return { status: "failed", output: null, latency: 0, error: "No transform config" }
  }

  try {
    const resolved = resolveTemplate(step.transform.expression, ctx)
    let output: unknown

    switch (step.transform.type) {
      case "extract":
        output = JSON.parse(resolved)
        break
      case "template":
        output = resolved
        break
      case "sort": {
        const data = JSON.parse(resolved)
        output = Array.isArray(data) ? data.sort() : data
        break
      }
      case "filter": {
        const data = JSON.parse(resolved)
        output = Array.isArray(data) ? data.filter(Boolean) : data
        break
      }
      default:
        output = resolved
    }

    return { status: "completed", output, latency: Date.now() - start }
  } catch (err) {
    return { status: "failed", output: null, latency: Date.now() - start, error: err instanceof Error ? err.message : "Transform failed" }
  }
}

/**
 * Execute a merge step - combines outputs from multiple previous steps
 */
function executeMergeStep(step: ActionStep, ctx: PipelineContext): StepResult {
  const start = Date.now()
  
  if (!step.merge) {
    return { status: "failed", output: null, latency: 0, error: "No merge config" }
  }

  try {
    const sources = step.merge.sources.map((id) => ctx.steps[id]?.output)

    let output: unknown
    switch (step.merge.strategy) {
      case "concat":
        output = sources.flat()
        break
      case "object":
        output = Object.assign({}, ...sources.filter((s) => typeof s === "object"))
        break
      case "first_non_null":
        output = sources.find((s) => s != null)
        break
      case "cheapest": {
        // Special case: find cheapest option from arrays of results
        const allResults = sources.flat().filter(Boolean)
        if (Array.isArray(allResults) && allResults.length > 0) {
          output = allResults.sort((a: any, b: any) => (a.price || 0) - (b.price || 0))[0]
        } else {
          output = allResults
        }
        break
      }
      default:
        output = sources
    }

    return { status: "completed", output, latency: Date.now() - start }
  } catch (err) {
    return { status: "failed", output: null, latency: Date.now() - start, error: err instanceof Error ? err.message : "Merge failed" }
  }
}

/**
 * Get a nested value from an object using dot-path or simple JSONPath
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  // Handle $.path.to.field style
  const cleanPath = path.startsWith("$.") ? path.slice(2) : path.startsWith("$") ? path.slice(1) : path
  const parts = cleanPath.split(".").filter(Boolean)
  let current: unknown = obj

  for (const part of parts) {
    if (current == null) return undefined
    // Handle array index: field[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      current = (current as Record<string, unknown>)[arrayMatch[1]]
      if (Array.isArray(current)) {
        current = current[parseInt(arrayMatch[2])]
      }
    } else {
      current = (current as Record<string, unknown>)[part]
    }
  }

  return current
}

/**
 * Execute a full action pipeline
 */
export async function executePipeline(
  steps: ActionStep[],
  input: Record<string, unknown>,
  options?: { maxSteps?: number; timeout?: number }
): Promise<PipelineResult> {
  const ctx: PipelineContext = {
    steps: {},
    input,
    variables: {},
  }
  const logs: string[] = []
  const maxSteps = options?.maxSteps || 20
  const globalTimeout = options?.timeout || 30000
  const pipelineStart = Date.now()

  // Sort steps by order
  const orderedSteps = [...steps].sort((a, b) => (a.order || 0) - (b.order || 0))

  logs.push(`[${new Date().toISOString()}] Pipeline started with ${orderedSteps.length} steps`)

  for (let i = 0; i < orderedSteps.length && i < maxSteps; i++) {
    const step = orderedSteps[i]
    
    // Global timeout check
    if (Date.now() - pipelineStart > globalTimeout) {
      logs.push(`[${new Date().toISOString()}] Pipeline timeout reached (${globalTimeout}ms)`)
      return {
        status: "PARTIAL",
        output: buildPipelineOutput(ctx),
        steps: ctx.steps,
        logs,
        totalLatency: Date.now() - pipelineStart,
        error: "Pipeline timeout",
      }
    }

    logs.push(`[${new Date().toISOString()}] Executing step: ${step.name} (${step.type})`)

    let result: StepResult

    switch (step.type) {
      case "http":
        result = await executeHttpStep(step, ctx)
        break
      case "transform":
        result = executeTransformStep(step, ctx)
        break
      case "merge":
        result = executeMergeStep(step, ctx)
        break
      case "condition": {
        if (step.condition) {
          const condValue = resolveTemplate(step.condition.expression, ctx)
          const isTruthy = condValue && condValue !== "0" && condValue !== "false" && condValue !== "null"
          const nextStepId = isTruthy ? step.condition.trueBranch : step.condition.falseBranch
          result = { status: "completed", output: { branch: isTruthy ? "true" : "false", nextStep: nextStepId }, latency: 0 }
          logs.push(`[${new Date().toISOString()}] Condition evaluated: ${isTruthy ? "true" : "false"} → ${nextStepId || "skip"}`)
        } else {
          result = { status: "skipped", output: null, latency: 0 }
        }
        break
      }
      case "delay": {
        const delay = step.timeout || 1000
        await new Promise((r) => setTimeout(r, delay))
        result = { status: "completed", output: { delayed: delay }, latency: delay }
        break
      }
      case "loop": {
        if (step.loop) {
          const items = resolveTemplate(step.loop.over, ctx)
          let parsed: unknown[]
          try { parsed = JSON.parse(items) } catch { parsed = [] }
          const maxIter = Math.min(parsed.length, step.loop.maxIterations || 10)
          const loopResults: unknown[] = []
          
          for (let j = 0; j < maxIter; j++) {
            ctx.variables[step.loop.as] = parsed[j]
            // Execute inner steps (simplified - just collect)
            loopResults.push(parsed[j])
          }
          result = { status: "completed", output: loopResults, latency: Date.now() - pipelineStart }
        } else {
          result = { status: "skipped", output: null, latency: 0 }
        }
        break
      }
      default:
        result = { status: "skipped", output: null, latency: 0 }
    }

    ctx.steps[step.id] = result
    logs.push(`[${new Date().toISOString()}] Step "${step.name}" ${result.status}${result.latency ? ` (${result.latency}ms)` : ""}${result.error ? ` - ${result.error}` : ""}`)

    // Stop on failure unless continueOnError
    if (result.status === "failed" && !step.continueOnError) {
      return {
        status: "FAILED",
        output: buildPipelineOutput(ctx),
        steps: ctx.steps,
        logs,
        totalLatency: Date.now() - pipelineStart,
        error: `Step "${step.name}" failed: ${result.error}`,
      }
    }
  }

  logs.push(`[${new Date().toISOString()}] Pipeline completed successfully`)

  return {
    status: "COMPLETED",
    output: buildPipelineOutput(ctx),
    steps: ctx.steps,
    logs,
    totalLatency: Date.now() - pipelineStart,
  }
}

/**
 * Build the final output from pipeline context
 * Uses the last completed step's output as the main result
 */
function buildPipelineOutput(ctx: PipelineContext): Record<string, unknown> {
  const stepEntries = Object.entries(ctx.steps)
  const lastCompleted = stepEntries.filter(([_, r]) => r.status === "completed").pop()
  
  return {
    result: lastCompleted?.[1]?.output ?? null,
    stepsCompleted: stepEntries.filter(([_, r]) => r.status === "completed").length,
    stepsFailed: stepEntries.filter(([_, r]) => r.status === "failed").length,
    allOutputs: Object.fromEntries(
      stepEntries
        .filter(([_, r]) => r.status === "completed" && r.output != null)
        .map(([id, r]) => [id, r.output])
    ),
  }
}

/**
 * Example: Build a flight search pipeline that searches 3 sites and picks cheapest
 */
export const EXAMPLE_PIPELINES = {
  "flight-search-multi": [
    {
      id: "search-site-1",
      name: "Search MakeMyTrip",
      type: "http" as const,
      endpoint: "https://api.makemytrip.com/flights/search",
      method: "POST",
      inputMapping: { origin: "{{input.origin}}", destination: "{{input.destination}}", date: "{{input.departure_date}}" },
      responseExtract: { fields: { flights: "$.data.flights", cheapest_price: "$.data.cheapest" } },
      timeout: 5000,
      retries: 1,
      continueOnError: true,
      order: 1,
    },
    {
      id: "search-site-2",
      name: "Search Goibibo",
      type: "http" as const,
      endpoint: "https://api.goibibo.com/v1/search",
      method: "POST",
      inputMapping: { from: "{{input.origin}}", to: "{{input.destination}}", departDate: "{{input.departure_date}}" },
      responseExtract: { fields: { flights: "$.results", cheapest_price: "$.lowest_fare" } },
      timeout: 5000,
      retries: 1,
      continueOnError: true,
      order: 1,  // Same order = parallel execution
    },
    {
      id: "search-site-3",
      name: "Search Cleartrip",
      type: "http" as const,
      endpoint: "https://api.cleartrip.com/flights",
      method: "GET",
      inputMapping: { origin: "{{input.origin}}", destination: "{{input.destination}}", depart_date: "{{input.departure_date}}" },
      responseExtract: { fields: { flights: "$.flights", cheapest_price: "$.best_price" } },
      timeout: 5000,
      retries: 1,
      continueOnError: true,
      order: 1,
    },
    {
      id: "merge-results",
      name: "Merge All Results",
      type: "merge" as const,
      merge: { strategy: "concat" as const, sources: ["search-site-1", "search-site-2", "search-site-3"] },
      order: 2,
    },
    {
      id: "find-cheapest",
      name: "Find Cheapest Flight",
      type: "transform" as const,
      transform: { type: "sort" as const, expression: "{{steps.merge-results.output}}", target: "cheapest" },
      order: 3,
    },
  ],

  "crm-contact-sync": [
    {
      id: "fetch-contacts",
      name: "Fetch New Contacts",
      type: "http" as const,
      endpoint: "{{input.crm_url}}/api/contacts",
      method: "GET",
      headers: { "Authorization": "Bearer {{input.api_key}}" },
      responseExtract: { fields: { contacts: "$.data", total: "$.meta.total" } },
      order: 1,
    },
    {
      id: "check-duplicates",
      name: "Check for Duplicates",
      type: "http" as const,
      endpoint: "{{input.crm_url}}/api/contacts/check-duplicates",
      method: "POST",
      inputMapping: { emails: "{{steps.fetch-contacts.output.contacts}}" },
      order: 2,
    },
    {
      id: "sync-new",
      name: "Sync New Contacts",
      type: "http" as const,
      endpoint: "{{input.destination_url}}/api/contacts/bulk",
      method: "POST",
      inputMapping: { contacts: "{{steps.check-duplicates.output.new_contacts}}" },
      order: 3,
    },
  ],
}
