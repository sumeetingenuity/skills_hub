/**
 * Production-grade OpenAPI/Swagger Parser
 * 
 * Supports:
 * - OpenAPI 3.x and Swagger 2.0
 * - JSON and YAML specs (with basic YAML parsing)
 * - $ref resolution (local references)
 * - Request body extraction (application/json schemas)
 * - Security scheme detection and mapping
 * - Server URL extraction with variable substitution
 * - Tag-based action grouping
 * - Path parameter extraction from URL patterns
 * - Full parameter typing from JSON Schema
 */

export interface OpenAPIEndpoint {
  path: string
  method: string
  operationId?: string
  summary?: string
  description?: string
  tags: string[]
  parameters: ParsedParameter[]
  requestBody?: {
    required: boolean
    contentType: string
    schema: Record<string, unknown>
    properties: ParsedParameter[]
  }
  responses: Record<string, { description: string; schema?: Record<string, unknown> }>
  security: string[]
  deprecated: boolean
}

export interface ParsedParameter {
  name: string
  type: string
  format?: string
  required: boolean
  description: string
  in: "query" | "path" | "header" | "cookie" | "body"
  default?: unknown
  enum?: string[]
  example?: unknown
}

export interface SecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect"
  name?: string
  in?: string  // "header" | "query" | "cookie"
  scheme?: string  // "bearer", "basic"
  bearerFormat?: string
  flows?: Record<string, unknown>
}

export interface OpenAPIAnalysisResult {
  name: string
  description: string
  version: string
  baseUrl: string
  servers: Array<{ url: string; description?: string }>
  endpoints: OpenAPIEndpoint[]
  tags: Array<{ name: string; description?: string; endpoints: number }>
  securitySchemes: Record<string, SecurityScheme>
  detectedFeatures: string[]
  totalEndpoints: number
}

/**
 * Minimal YAML parser for simple OpenAPI specs
 * Handles basic key-value, arrays, and nested objects
 */
function parseSimpleYaml(text: string): any {
  // Try JSON first (many "yaml" files are actually JSON)
  try {
    return JSON.parse(text)
  } catch {
    // Basic YAML-like parsing for simple structures
    // This won't handle all YAML but covers most OpenAPI specs
    const lines = text.split("\n")
    const result: any = {}
    const stack: Array<{ obj: any; indent: number }> = [{ obj: result, indent: -1 }]
    
    for (const line of lines) {
      const trimmed = line.replace(/\s+$/, "")
      if (!trimmed || trimmed.startsWith("#")) continue
      
      const indent = line.search(/\S/)
      const content = trimmed.trim()
      
      // Pop stack to find parent
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }
      
      const parent = stack[stack.length - 1].obj
      
      if (content.startsWith("- ")) {
        // Array item
        const value = content.slice(2).trim()
        if (!Array.isArray(parent)) {
          // Convert last key to array
          const keys = Object.keys(parent)
          const lastKey = keys[keys.length - 1]
          if (lastKey && parent[lastKey] === null) {
            parent[lastKey] = [parseYamlValue(value)]
          } else if (lastKey && Array.isArray(parent[lastKey])) {
            parent[lastKey].push(parseYamlValue(value))
          }
        } else {
          parent.push(parseYamlValue(value))
        }
      } else if (content.includes(":")) {
        const colonIdx = content.indexOf(":")
        const key = content.slice(0, colonIdx).trim()
        const value = content.slice(colonIdx + 1).trim()
        
        if (value === "" || value === "|" || value === ">") {
          parent[key] = null // Will be populated by children
          stack.push({ obj: parent, indent })
        } else {
          parent[key] = parseYamlValue(value)
        }
      }
    }
    
    return result
  }
}

function parseYamlValue(value: string): any {
  if (value === "true") return true
  if (value === "false") return false
  if (value === "null" || value === "~") return null
  if (/^-?\d+$/.test(value)) return parseInt(value)
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value)
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  // Inline array: [a, b, c]
  if (value.startsWith("[") && value.endsWith("]")) {
    try { return JSON.parse(value) } catch { return value }
  }
  // Inline object: {a: b}
  if (value.startsWith("{") && value.endsWith("}")) {
    try { return JSON.parse(value) } catch { return value }
  }
  return value
}

/**
 * Resolve $ref references within an OpenAPI spec
 */
function resolveRef(spec: any, ref: string): any {
  if (!ref || !ref.startsWith("#/")) return ref
  const path = ref.slice(2).split("/")
  let current = spec
  for (const segment of path) {
    if (current == null) return {}
    current = current[segment.replace(/~1/g, "/").replace(/~0/g, "~")]
  }
  return current || {}
}

/**
 * Extract parameters from a JSON Schema object (for request bodies)
 */
function schemaToParameters(schema: any, spec: any, location: "body" = "body"): ParsedParameter[] {
  if (!schema) return []
  
  // Resolve ref
  if (schema.$ref) {
    schema = resolveRef(spec, schema.$ref)
  }
  
  const params: ParsedParameter[] = []
  const properties = schema.properties || {}
  const required = schema.required || []
  
  for (const [name, prop] of Object.entries(properties)) {
    const p = prop as any
    // Resolve nested refs
    const resolved = p.$ref ? resolveRef(spec, p.$ref) : p
    
    params.push({
      name,
      type: resolved.type || "string",
      format: resolved.format,
      required: required.includes(name),
      description: resolved.description || "",
      in: location,
      default: resolved.default,
      enum: resolved.enum,
      example: resolved.example,
    })
  }
  
  return params
}

/**
 * Analyze an OpenAPI/Swagger specification
 */
export async function analyzeOpenAPISpec(urlOrContent: string): Promise<OpenAPIAnalysisResult> {
  let spec: any

  // Check if input is a URL or raw content
  if (urlOrContent.startsWith("http://") || urlOrContent.startsWith("https://")) {
    const res = await fetch(urlOrContent, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`Failed to fetch spec: HTTP ${res.status}`)
    
    const contentType = res.headers.get("content-type") || ""
    const text = await res.text()
    
    if (contentType.includes("yaml") || urlOrContent.endsWith(".yaml") || urlOrContent.endsWith(".yml")) {
      spec = parseSimpleYaml(text)
    } else {
      try {
        spec = JSON.parse(text)
      } catch {
        spec = parseSimpleYaml(text)
      }
    }
  } else {
    // Raw content passed directly
    try {
      spec = JSON.parse(urlOrContent)
    } catch {
      spec = parseSimpleYaml(urlOrContent)
    }
  }

  if (!spec || (!spec.openapi && !spec.swagger)) {
    throw new Error("Invalid OpenAPI/Swagger specification - missing openapi or swagger version field")
  }

  const info = spec.info || {}
  const detectedFeatures: string[] = []
  
  // Detect version
  if (spec.openapi?.startsWith("3")) {
    detectedFeatures.push(`OpenAPI ${spec.openapi}`)
  } else if (spec.swagger === "2.0") {
    detectedFeatures.push("Swagger 2.0")
  }

  // Extract servers/base URL
  let baseUrl = ""
  const servers: Array<{ url: string; description?: string }> = []
  
  if (spec.servers && Array.isArray(spec.servers)) {
    for (const server of spec.servers) {
      let url = server.url || ""
      // Substitute server variables with defaults
      if (server.variables) {
        for (const [varName, varDef] of Object.entries(server.variables as Record<string, any>)) {
          url = url.replace(`{${varName}}`, varDef.default || varDef.enum?.[0] || varName)
        }
      }
      servers.push({ url, description: server.description })
    }
    baseUrl = servers[0]?.url || ""
    detectedFeatures.push(`${servers.length} Server(s)`)
  } else if (spec.host) {
    // Swagger 2.0 format
    const scheme = spec.schemes?.[0] || "https"
    const basePath = spec.basePath || ""
    baseUrl = `${scheme}://${spec.host}${basePath}`
    servers.push({ url: baseUrl })
  }

  // Extract security schemes
  const securitySchemes: Record<string, SecurityScheme> = {}
  const secDefs = spec.components?.securitySchemes || spec.securityDefinitions || {}
  
  for (const [name, scheme] of Object.entries(secDefs)) {
    const s = scheme as any
    securitySchemes[name] = {
      type: s.type,
      name: s.name,
      in: s.in,
      scheme: s.scheme,
      bearerFormat: s.bearerFormat,
      flows: s.flows,
    }
  }
  
  if (Object.keys(securitySchemes).length > 0) {
    detectedFeatures.push(`Auth: ${Object.values(securitySchemes).map((s) => s.type).join(", ")}`)
  }

  // Extract endpoints
  const paths = spec.paths || {}
  const endpoints: OpenAPIEndpoint[] = []
  const tagCounts: Record<string, number> = {}

  for (const [path, methods] of Object.entries(paths)) {
    if (typeof methods !== "object" || methods === null) continue
    
    // Path-level parameters
    const pathParams = (methods as any).parameters || []
    
    for (const [method, details] of Object.entries(methods as Record<string, any>)) {
      if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) continue
      if (typeof details !== "object" || details === null) continue

      const tags = details.tags || ["default"]
      for (const tag of tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }

      // Merge path-level and operation-level parameters
      const allParams = [...pathParams, ...(details.parameters || [])]
      const parameters: ParsedParameter[] = allParams.map((p: any) => {
        const resolved = p.$ref ? resolveRef(spec, p.$ref) : p
        const schema = resolved.schema || {}
        return {
          name: resolved.name,
          type: schema.type || resolved.type || "string",
          format: schema.format || resolved.format,
          required: resolved.required || resolved.in === "path",
          description: resolved.description || "",
          in: resolved.in || "query",
          default: schema.default || resolved.default,
          enum: schema.enum || resolved.enum,
          example: schema.example || resolved.example,
        }
      })

      // Extract path parameters from URL pattern
      const pathParamNames = (path.match(/\{(\w+)\}/g) || []).map((p: string) => p.slice(1, -1))
      for (const paramName of pathParamNames) {
        if (!parameters.find((p) => p.name === paramName)) {
          parameters.push({
            name: paramName,
            type: "string",
            required: true,
            description: `Path parameter: ${paramName}`,
            in: "path",
          })
        }
      }

      // Extract request body (OpenAPI 3.x)
      let requestBody: OpenAPIEndpoint["requestBody"] | undefined
      if (details.requestBody) {
        const rb = details.requestBody.$ref ? resolveRef(spec, details.requestBody.$ref) : details.requestBody
        const content = rb.content || {}
        const jsonContent = content["application/json"] || content["*/*"] || Object.values(content)[0]
        
        if (jsonContent?.schema) {
          const schema = jsonContent.schema.$ref ? resolveRef(spec, jsonContent.schema.$ref) : jsonContent.schema
          requestBody = {
            required: rb.required || false,
            contentType: "application/json",
            schema,
            properties: schemaToParameters(schema, spec),
          }
        }
      }
      
      // Swagger 2.0 body parameter
      const bodyParam = allParams.find((p: any) => p.in === "body")
      if (bodyParam && !requestBody) {
        const schema = bodyParam.schema?.$ref ? resolveRef(spec, bodyParam.schema.$ref) : bodyParam.schema
        if (schema) {
          requestBody = {
            required: bodyParam.required || false,
            contentType: "application/json",
            schema,
            properties: schemaToParameters(schema, spec),
          }
        }
      }

      // Extract response schemas
      const responses: Record<string, { description: string; schema?: Record<string, unknown> }> = {}
      for (const [code, resp] of Object.entries(details.responses || {})) {
        const r = (resp as any).$ref ? resolveRef(spec, (resp as any).$ref) : resp as any
        let schema: Record<string, unknown> | undefined
        
        // OpenAPI 3.x
        if (r.content?.["application/json"]?.schema) {
          schema = r.content["application/json"].schema.$ref
            ? resolveRef(spec, r.content["application/json"].schema.$ref)
            : r.content["application/json"].schema
        }
        // Swagger 2.0
        else if (r.schema) {
          schema = r.schema.$ref ? resolveRef(spec, r.schema.$ref) : r.schema
        }
        
        responses[code] = { description: r.description || "", schema }
      }

      // Security requirements
      const security = (details.security || spec.security || [])
        .flatMap((s: Record<string, string[]>) => Object.keys(s))

      endpoints.push({
        path,
        method: method.toUpperCase(),
        operationId: details.operationId,
        summary: details.summary,
        description: details.description,
        tags,
        parameters,
        requestBody,
        responses,
        security,
        deprecated: details.deprecated || false,
      })
    }
  }

  // Build tags summary
  const tagDefs = spec.tags || []
  const tags = Object.entries(tagCounts).map(([name, count]) => ({
    name,
    description: tagDefs.find((t: any) => t.name === name)?.description,
    endpoints: count,
  }))

  detectedFeatures.push(`${endpoints.length} Endpoints`)
  if (tags.length > 1) detectedFeatures.push(`${tags.length} Tags/Groups`)
  if (endpoints.some((e) => e.requestBody)) detectedFeatures.push("Request Bodies")
  if (endpoints.some((e) => Object.keys(e.responses).length > 1)) detectedFeatures.push("Response Schemas")

  return {
    name: info.title || "API",
    description: info.description || "",
    version: info.version || "1.0.0",
    baseUrl,
    servers,
    endpoints,
    tags,
    securitySchemes,
    detectedFeatures,
    totalEndpoints: endpoints.length,
  }
}

/**
 * Convert OpenAPI analysis to AMTP actions with full configuration
 */
export function openAPIToAmtpActions(result: OpenAPIAnalysisResult) {
  return result.endpoints.map((endpoint) => {
    // Build full URL
    const fullEndpoint = result.baseUrl
      ? `${result.baseUrl.replace(/\/$/, "")}${endpoint.path}`
      : endpoint.path

    // Combine query/path params and request body properties
    const parameters: Array<{ name: string; type: string; required: boolean; description: string }> = []
    
    // Query/path/header parameters
    for (const param of endpoint.parameters) {
      if (param.in === "header" && ["authorization", "content-type", "accept"].includes(param.name.toLowerCase())) {
        continue // Skip standard headers
      }
      parameters.push({
        name: param.name,
        type: param.type || "string",
        required: param.required,
        description: param.description || (param.enum ? `Options: ${param.enum.join(", ")}` : ""),
      })
    }

    // Request body properties
    if (endpoint.requestBody?.properties) {
      for (const prop of endpoint.requestBody.properties) {
        parameters.push({
          name: prop.name,
          type: prop.type || "string",
          required: prop.required,
          description: prop.description || "",
        })
      }
    }

    // Determine risk level
    let riskLevel = "low"
    if (endpoint.method === "DELETE") riskLevel = "high"
    else if (endpoint.method === "PUT" || endpoint.method === "PATCH") riskLevel = "medium"
    else if (endpoint.method === "POST" && !endpoint.path.includes("search")) riskLevel = "medium"

    // Determine auth config
    let authType: string | undefined
    let authConfig: Record<string, string> | undefined
    
    if (endpoint.security.length > 0) {
      const schemeName = endpoint.security[0]
      const scheme = result.securitySchemes[schemeName]
      if (scheme) {
        if (scheme.type === "http" && scheme.scheme === "bearer") {
          authType = "bearer"
          authConfig = { token: "{{input.api_token}}", prefix: "Bearer" }
        } else if (scheme.type === "apiKey") {
          authType = "api-key"
          authConfig = { token: "{{input.api_key}}", headerName: scheme.name || "X-API-Key" }
        } else if (scheme.type === "http" && scheme.scheme === "basic") {
          authType = "basic"
        }
      }
    }

    const actionId = endpoint.operationId ||
      `${endpoint.method.toLowerCase()}-${endpoint.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`

    return {
      actionId: actionId.toLowerCase().replace(/[^a-z0-9-]+/g, "-").slice(0, 64),
      name: endpoint.summary || endpoint.operationId || `${endpoint.method} ${endpoint.path}`,
      description: endpoint.description || endpoint.summary || `${endpoint.method} request to ${endpoint.path}`,
      endpoint: fullEndpoint,
      method: endpoint.method,
      parameters,
      riskLevel,
      tags: endpoint.tags,
      deprecated: endpoint.deprecated,
      // Extended fields for the pipeline system
      authType,
      authConfig,
      timeout: 5000,
      retries: endpoint.method === "GET" ? 1 : 0,
    }
  })
}

/**
 * Group actions by their OpenAPI tags for organized skill creation
 */
export function groupActionsByTag(actions: ReturnType<typeof openAPIToAmtpActions>) {
  const groups: Record<string, typeof actions> = {}
  
  for (const action of actions) {
    const tag = action.tags?.[0] || "default"
    if (!groups[tag]) groups[tag] = []
    groups[tag].push(action)
  }

  return Object.entries(groups).map(([tag, tagActions]) => ({
    tag,
    actions: tagActions,
    count: tagActions.length,
  }))
}

/**
 * Generate a complete skill manifest from an OpenAPI spec
 * Can create one skill per tag, or one skill with all endpoints
 */
export function openAPIToSkillManifest(
  result: OpenAPIAnalysisResult,
  options?: { splitByTag?: boolean; maxActionsPerSkill?: number }
) {
  const allActions = openAPIToAmtpActions(result)
  const maxActions = options?.maxActionsPerSkill || 50

  if (options?.splitByTag && result.tags.length > 1) {
    // Create one skill per tag group
    const grouped = groupActionsByTag(allActions)
    return grouped.map((group) => ({
      name: `${result.name} - ${group.tag}`,
      description: `${result.description || result.name} (${group.tag} endpoints)`,
      category: "DATA",
      tags: [group.tag.toLowerCase(), "api", "openapi"],
      baseUrl: result.baseUrl,
      actions: group.actions.slice(0, maxActions),
      permissions: [{
        roles: ["agent", "user"],
        scopes: group.actions.map((a) => `${a.actionId}:execute`),
        authRequirements: Object.keys(result.securitySchemes).length > 0 ? ["api-key"] : ["none"],
        approvalRequired: group.actions.some((a) => a.riskLevel === "high"),
      }],
      policies: [{
        rateLimit: 100,
        rateLimitWindow: 60,
        restrictions: null,
        executionConditions: null,
      }],
    }))
  }

  // Single skill with all endpoints
  return [{
    name: result.name,
    description: result.description || `API skill generated from ${result.name} v${result.version}`,
    category: "DATA",
    tags: ["api", "openapi", ...result.tags.slice(0, 5).map((t) => t.name.toLowerCase())],
    baseUrl: result.baseUrl,
    actions: allActions.slice(0, maxActions),
    permissions: [{
      roles: ["agent", "user"],
      scopes: allActions.slice(0, maxActions).map((a) => `${a.actionId}:execute`),
      authRequirements: Object.keys(result.securitySchemes).length > 0 ? ["api-key"] : ["none"],
      approvalRequired: allActions.some((a) => a.riskLevel === "high"),
    }],
    policies: [{
      rateLimit: 100,
      rateLimitWindow: 60,
      restrictions: null,
      executionConditions: null,
    }],
  }]
}
