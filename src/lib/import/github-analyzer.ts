export interface RepoFile {
  name: string
  path: string
  type: "file" | "dir"
  downloadUrl?: string
  content?: string
}

export interface AnalysisResult {
  name: string
  description: string
  source: string
  tags: string[]
  actions: ActionDef[]
  permissions: PermissionDef[]
  policies: PolicyDef[]
  readmeContent?: string
  detectedFeatures: string[]
}

export interface ActionDef {
  name: string
  description: string
  input: Record<string, unknown>
  output: Record<string, unknown>
}

export interface PermissionDef {
  resource: string
  action: string
}

export interface PolicyDef {
  name: string
  description: string
  effect: string
}

const GITHUB_API = "https://api.github.com"

class GitHubApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = "GitHubApiError"
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new GitHubApiError(
      res.status,
      `GitHub API returned non-JSON (status ${res.status}). ${text.slice(0, 200)}`
    )
  }
}

async function fetchRepoContents(
  owner: string,
  repo: string,
  path = ""
): Promise<RepoFile[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`

  const { checkSsrf } = await import("@/lib/security")
  const ssrfCheck = await checkSsrf(url)
  if (!ssrfCheck.allowed) {
    throw new GitHubApiError(403, `SSRF blocked GitHub API request: ${ssrfCheck.reason}`)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "amtp-skillhub",
      },
      signal: controller.signal,
    })

    if (!res.ok) {
      if (res.status === 404) {
        throw new GitHubApiError(
          404,
          `Repository "${owner}/${repo}" not found. Make sure the URL is correct and the repository is public.`
        )
      }
      if (res.status === 403) {
        throw new GitHubApiError(
          403,
          "GitHub API rate limit exceeded. Try again later or add a GITHUB_TOKEN to your .env file."
        )
      }
      if (res.status === 301 || res.status === 302) {
        throw new GitHubApiError(
          res.status,
          `Repository moved. The URL may need updating.`
        )
      }
      throw new GitHubApiError(
        res.status,
        `GitHub API error: ${res.status} ${res.statusText}`
      )
    }

    const data = await safeJson(res)
    if (!Array.isArray(data)) return []

    return data.map((item: Record<string, unknown>) => ({
      name: item.name as string,
      path: item.path as string,
      type: item.type as "file" | "dir",
      downloadUrl: item.download_url as string | undefined,
    }))
  } finally {
    clearTimeout(timeoutId)
  }
}

async function fetchFileContent(url: string): Promise<string> {
  const { checkSsrf } = await import("@/lib/security")
  const ssrfCheck = await checkSsrf(url)
  if (!ssrfCheck.allowed) {
    console.warn(`SSRF blocked fetch to ${url}: ${ssrfCheck.reason}`)
    return ""
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5_000)

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "amtp-skillhub" },
      signal: controller.signal,
    })
    if (!res.ok) return ""
    return res.text()
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  const cleaned = url.replace(/\/$/, "").replace(/\.git$/, "")
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+?)(?:\/|$)/,
    /github\.com\/([^/]+)\/([^/]+)/,
  ]

  for (const pattern of patterns) {
    const match = cleaned.match(pattern)
    if (match && match[2]) {
      return { owner: match[1], repo: match[2] }
    }
  }

  const orgMatch = cleaned.match(/github\.com\/([^/]+)$/)
  if (orgMatch) {
    throw new Error(
      `"${orgMatch[1]}" is a GitHub user/organization, not a repository. Provide a full URL like "https://github.com/${orgMatch[1]}/repo-name".`
    )
  }

  return null
}

async function readFileIfExists(
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const files = await fetchRepoContents(owner, repo)
    const found = files.find(
      (f) => f.path.toLowerCase() === path.toLowerCase()
    )
    if (found && found.downloadUrl) {
      return await fetchFileContent(found.downloadUrl)
    }
    return null
  } catch {
    return null
  }
}

function extractActionsFromReadme(readme: string): ActionDef[] {
  const actions: ActionDef[] = []

  const toolRegex =
    /##\s*(?:Tool|Action|Command)[:\s]+(.+?)(?:\n([\s\S]*?))?(?=\n##|\n---|$)/gi
  let match: RegExpExecArray | null
  while ((match = toolRegex.exec(readme)) !== null) {
    const name = match[1].trim().toLowerCase().replace(/\s+/g, "-")
    const body = match[2]?.trim() || ""
    const descMatch = body.match(
      /^(.*?)(?:\n\s*\n|\n\s*- |\n\s*\* |$)/
    )
    actions.push({
      name,
      description: descMatch ? descMatch[1].trim() : body.slice(0, 100),
      input: { type: "object", properties: {} },
      output: { type: "object", properties: {} },
    })
  }

  const cliRegex = /###\s+(?:`)?(\w+(?:-\w+)*)(?:`)?\s*\n([\s\S]*?)(?=\n###|\n---|$)/gi
  while ((match = cliRegex.exec(readme)) !== null) {
    const name = match[1].trim()
    if (!actions.find((a) => a.name === name)) {
      actions.push({
        name,
        description: match[2]?.trim().slice(0, 100) || `Execute ${name}`,
        input: { type: "object", properties: {} },
        output: { type: "object", properties: {} },
      })
    }
  }

  return actions
}

function extractPromptsFromReadme(readme: string): string[] {
  const prompts: string[] = []
  const promptRegex =
    /(?:Prompt|Prompt Template|User Prompt)[:\s]+(?:```)?\s*([\s\S]*?)(?:```|$)/gi
  let match: RegExpExecArray | null
  while ((match = promptRegex.exec(readme)) !== null) {
    const content = match[1].trim()
    if (content.length > 20) {
      prompts.push(content)
    }
  }
  return prompts
}

function extractPermissionsFromReadme(
  readme: string
): PermissionDef[] {
  const permissions: PermissionDef[] = []

  if (/auth|token|api.?key|credential/i.test(readme)) {
    permissions.push({ resource: "authentication", action: "require" })
  }
  if (/network|http|fetch|curl|request/i.test(readme)) {
    permissions.push({ resource: "network", action: "allow" })
  }
  if (/file|read|write|fs|storage/i.test(readme)) {
    permissions.push({ resource: "filesystem", action: "read" })
  }
  if (/database|db|sql|query/i.test(readme)) {
    permissions.push({ resource: "database", action: "query" })
  }

  return permissions
}

function extractTags(readme: string, actions: ActionDef[]): string[] {
  const tags = new Set<string>()

  if (actions.length > 5) tags.add("multi-action")
  if (/ai|llm|gpt|claude|openai|model/i.test(readme)) tags.add("ai")
  if (/cli|command|terminal|shell/i.test(readme)) tags.add("cli")
  if (/api|rest|graphql|endpoint/i.test(readme)) tags.add("api")
  if (/data|analytics|analysis|chart/i.test(readme)) tags.add("data")
  if (/dev|developer|code|build/i.test(readme)) tags.add("developer-tools")
  if (/auth|security|oauth|jwt/i.test(readme)) tags.add("security")

  return Array.from(tags)
}

export async function analyzeGitHubRepo(
  url: string
): Promise<AnalysisResult> {
  const parsed = parseRepoUrl(url)
  if (!parsed) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/owner/repo"
    )
  }

  const { owner, repo } = parsed
  const detectedFeatures: string[] = []

  const readme = await readFileIfExists(owner, repo, "README.md")
  const skillMd = await readFileIfExists(owner, repo, "SKILL.md")

  const actions: ActionDef[] = []
  const prompts: string[] = []

  if (skillMd) {
    detectedFeatures.push("SKILL.md")
  }

  if (readme) {
    detectedFeatures.push("README.md")
    actions.push(...extractActionsFromReadme(readme))
    prompts.push(...extractPromptsFromReadme(readme))
  }

  const rootFiles = await fetchRepoContents(owner, repo)

  const promptsDir = rootFiles.find(
    (f) => f.name.toLowerCase() === "prompts" && f.type === "dir"
  )
  if (promptsDir) {
    detectedFeatures.push("prompts directory")
    const promptFiles = await fetchRepoContents(owner, repo, "prompts")
    for (const pf of promptFiles) {
      if (pf.type === "file" && pf.downloadUrl) {
        const content = await fetchFileContent(pf.downloadUrl)
        if (content.length > 20) prompts.push(content)
      }
    }
  }

  const mcpManifest = rootFiles.find(
    (f) =>
      f.name === "mcp.json" ||
      f.name === "mcp-manifest.json" ||
      (f.name.endsWith(".mcp") && f.type === "file")
  )
  if (mcpManifest) {
    detectedFeatures.push("MCP manifest")
    let mcpJson: Record<string, unknown> | null = null
    try {
      mcpJson = mcpManifest.downloadUrl
        ? (JSON.parse(await fetchFileContent(mcpManifest.downloadUrl)) as Record<string, unknown>)
        : null
    } catch {
      // invalid MCP JSON
    }
    const mcpTools = mcpJson?.tools as Array<Record<string, unknown>> | undefined
    if (mcpTools) {
      for (const rawTool of mcpTools) {
        const t = rawTool as { name?: string; id?: string; description?: string; summary?: string; inputSchema?: Record<string, unknown>; parameters?: Record<string, unknown>; outputSchema?: Record<string, unknown> }
        actions.push({
          name: t.name || t.id || "mcp-tool",
          description: t.description || t.summary || `MCP tool: ${t.name || "unknown"}`,
          input: t.inputSchema || t.parameters || { type: "object", properties: {} },
          output: t.outputSchema || { type: "object", properties: {} },
        })
      }
    }
  }

  const openapiFile = rootFiles.find(
    (f) =>
      f.name.match(/openapi\.ya?ml/i) ||
      f.name.match(/swagger\.ya?ml/i) ||
      f.name.match(/openapi\.json/i)
  )
  if (openapiFile) {
    detectedFeatures.push("OpenAPI spec")
    if (openapiFile.downloadUrl) {
      const spec = await fetchFileContent(openapiFile.downloadUrl)
      try {
        const parsed = JSON.parse(spec)
        const paths = parsed.paths || {}
        for (const [path, methods] of Object.entries(paths)) {
          const methodObj = methods as Record<string, unknown>
          for (const [method, details] of Object.entries(methodObj)) {
            if (["get", "post", "put", "delete", "patch"].includes(method)) {
              const d = details as { summary?: string; operationId?: string }
              actions.push({
                name:
                  d.operationId ||
                  `${method}-${path.replace(/[^a-zA-Z0-9]/g, "-")}`,
                description: d.summary || `${method.toUpperCase()} ${path}`,
                input: { type: "object", properties: {} },
                output: { type: "object", properties: {} },
              })
            }
          }
        }
      } catch {
        detectedFeatures.pop()
      }
    }
  }

  const packageJson = rootFiles.find(
    (f) => f.name === "package.json"
  )
  if (packageJson && packageJson.downloadUrl) {
    detectedFeatures.push("package.json")
    let pkg: Record<string, unknown> = {}
    try {
      pkg = JSON.parse(await fetchFileContent(packageJson.downloadUrl)) as Record<string, unknown>
    } catch {
      // invalid package.json
    }
    const pkgBin = pkg.bin as Record<string, string> | undefined
    const pkgScripts = pkg.scripts as Record<string, string> | undefined
    if (pkgBin || pkgScripts) {
      const scripts = { ...pkgBin, ...pkgScripts }
      for (const [name, _cmd] of Object.entries(scripts)) {
        if (!actions.find((a) => a.name === name)) {
          actions.push({
            name: name.replace(/[^a-zA-Z0-9-]/g, ""),
            description: `${name} script/command`,
            input: { type: "object", properties: {} },
            output: { type: "object", properties: {} },
          })
        }
      }
    }
  }

  let repoDescription = ""
  const repoName = repo
  let topics: string[] = []

  try {
    const repoInfoUrl = `${GITHUB_API}/repos/${owner}/${repo}`
    const { checkSsrf } = await import("@/lib/security")
    const ssrfCheck = await checkSsrf(repoInfoUrl)
    if (ssrfCheck.allowed) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10_000)
      try {
        const repoRes = await fetch(repoInfoUrl, {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "amtp-skillhub",
          },
          signal: controller.signal,
        })

        if (repoRes.ok) {
          const repoData = (await safeJson(repoRes)) as {
            description?: string
            topics?: string[]
            language?: string
          }
          repoDescription = repoData.description || ""
          topics = repoData.topics || []
          if (repoData.language) detectedFeatures.push(repoData.language)
        }
      } finally {
        clearTimeout(timeoutId)
      }
    }
  } catch {
    // repo info is non-critical
  }

  const allTags = [
    ...topics,
    ...extractTags(readme || "", actions),
  ]

  let description = repoDescription
  if (!description && readme) {
    const firstLine = readme.split("\n")[0]?.replace(/^#\s*/, "").trim()
    const secondLine = readme.split("\n")[1]?.trim()
    description = secondLine || firstLine || repoName
  }
  if (!description) {
    description = `Auto-analyzed capability from GitHub: ${owner}/${repo}`
  }

  const permissions = extractPermissionsFromReadme(readme || "")

  const hasPromptActions = prompts.length > 0
  if (hasPromptActions && actions.length === 0) {
    actions.push({
      name: "generate",
      description: "Generate output using the available prompts",
      input: { type: "object", properties: { input: { type: "string" } } },
      output: { type: "object", properties: { result: { type: "string" } } },
    })
  }

  if (actions.length === 0) {
    actions.push({
      name: "execute",
      description: `Execute the ${repoName} capability`,
      input: { type: "object", properties: {} },
      output: { type: "object", properties: {} },
    })
  }

  const policies: PolicyDef[] = [
    {
      name: "timeout",
      description: "Max execution time (30s)",
      effect: "enforce",
    },
  ]

  return {
    name: repoName,
    description,
    source: url,
    tags: [...new Set(allTags)],
    actions,
    permissions,
    policies,
    readmeContent: readme || undefined,
    detectedFeatures,
  }
}
