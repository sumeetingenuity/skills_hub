export interface MCPToolDefinition {
  name: string
  description: string
  inputSchema?: {
    type: string
    properties?: Record<string, { type: string; description?: string }>
    required?: string[]
  }
}

export interface MCPAnalysisResult {
  name: string
  description: string
  tools: MCPToolDefinition[]
  detectedFeatures: string[]
}

export async function analyzeMCPServer(url: string): Promise<MCPAnalysisResult> {
  // Attempt to fetch the MCP server manifest or tools list
  const toolsUrl = url.endsWith("/") ? `${url}tools/list` : `${url}/tools/list`
  
  try {
    const res = await fetch(toolsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error(`MCP server returned ${res.status}`)
    }

    const data = await res.json()
    const tools: MCPToolDefinition[] = data.result?.tools || data.tools || []

    const detectedFeatures: string[] = ["MCP Protocol"]
    if (tools.length > 0) detectedFeatures.push(`${tools.length} Tools`)
    if (tools.some((t) => t.inputSchema)) detectedFeatures.push("Input Schemas")

    // Derive a name from the URL
    const urlObj = new URL(url)
    const name = urlObj.hostname.split(".")[0] || "MCP Server"

    return {
      name: `${name} MCP Tools`,
      description: `MCP tools imported from ${url}`,
      tools,
      detectedFeatures,
    }
  } catch (error) {
    throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function mcpToolsToAmtpActions(tools: MCPToolDefinition[]) {
  return tools.map((tool) => {
    const parameters: Array<{ name: string; type: string; required: boolean; description: string }> = []

    if (tool.inputSchema?.properties) {
      for (const [name, prop] of Object.entries(tool.inputSchema.properties)) {
        parameters.push({
          name,
          type: prop.type || "string",
          required: tool.inputSchema.required?.includes(name) || false,
          description: prop.description || "",
        })
      }
    }

    return {
      actionId: tool.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: tool.name,
      description: tool.description || "",
      endpoint: null,
      method: "POST",
      parameters,
      riskLevel: "medium",
    }
  })
}
