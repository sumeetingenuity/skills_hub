"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  Loader2,
  Eye,
  Globe,
  Lock,
  Zap,
  Shield,
  FileJson,
  FileText,
  Rocket,
  X,
  Upload,
  GitBranch,
  Search,
  AlertCircle,
  Lightbulb,
  Wand2,
  PenLine,
} from "lucide-react"
import { toast } from "sonner"

const CATEGORIES = [
  "ANALYTICS",
  "COMMUNICATION",
  "DATA",
  "DEVELOPER_TOOLS",
  "FINANCE",
  "LEGAL",
  "MARKETING",
  "PRODUCTIVITY",
  "RESEARCH",
  "SALES",
  "SECURITY",
  "AI_ML",
  "OTHER",
]

const RISK_LEVELS = ["low", "medium", "high", "critical"]
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"]

interface ActionDef {
  name: string
  description: string
  endpoint: string
  method: string
  riskLevel: string
  parameters: { name: string; type: string; required: boolean; description: string }[]
  // Multi-step pipeline support
  executionMode: "single" | "sequential" | "parallel"
  steps: Array<{
    id: string
    name: string
    type: "http" | "transform" | "merge"
    endpoint: string
    method: string
    order: number
  }>
  // Target service auth
  authType: "none" | "bearer" | "api-key" | "basic" | "oauth2"
  authConfig: Record<string, string>
}

interface PermissionDef {
  roles: string[]
  scopes: string[]
  authRequirements: string[]
  approvalRequired: boolean
}

interface PolicyDef {
  rateLimit: number | null
  rateLimitWindow: number | null
  restrictions: Record<string, unknown> | null
}

type SourceType = "github" | "mcp" | "openapi" | "amtp-markdown" | "upload"

const SOURCE_OPTIONS: { value: SourceType; label: string; icon: React.ReactNode }[] = [
  { value: "github", label: "GitHub Repository", icon: <GitBranch className="size-4" /> },
  { value: "mcp", label: "MCP Server", icon: <Globe className="size-4" /> },
  { value: "openapi", label: "OpenAPI Spec", icon: <FileJson className="size-4" /> },
  { value: "amtp-markdown", label: "AMTP Markdown", icon: <FileText className="size-4" /> },
  { value: "upload", label: "Upload File", icon: <Upload className="size-4" /> },
]

const STEPS = [
  { label: "Start", icon: Wand2 },
  { label: "Metadata", icon: FileJson },
  { label: "Actions", icon: Zap },
  { label: "Security", icon: Shield },
  { label: "Preview", icon: Eye },
  { label: "Publish", icon: Rocket },
]

export default function CreateSkillPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [publishing, setPublishing] = useState(false)

  // Step 0: Source selection (import or manual)
  const [creationMode, setCreationMode] = useState<"import" | "manual" | null>(null)
  const [sourceType, setSourceType] = useState<SourceType>("openapi")
  const [sourceUrl, setSourceUrl] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [importedFeatures, setImportedFeatures] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Metadata
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("OTHER")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [visibility, setVisibility] = useState<"public" | "private">("public")

  // Step 2: Actions
  const [actions, setActions] = useState<ActionDef[]>([
    { name: "", description: "", endpoint: "", method: "POST", riskLevel: "low", parameters: [], executionMode: "single", steps: [], authType: "none", authConfig: {} },
  ])

  // Step 3: Permissions & Policies
  const [permissions, setPermissions] = useState<PermissionDef>({
    roles: ["agent"],
    scopes: [],
    authRequirements: ["api-key"],
    approvalRequired: false,
  })
  const [policy, setPolicy] = useState<PolicyDef>({
    rateLimit: 100,
    rateLimitWindow: 60,
    restrictions: null,
  })
  const [scopeInput, setScopeInput] = useState("")

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({})

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const addAction = () => {
    setActions([
      ...actions,
      { name: "", description: "", endpoint: "", method: "POST", riskLevel: "low", parameters: [], executionMode: "single", steps: [], authType: "none", authConfig: {} },
    ])
  }

  const removeAction = (idx: number) => {
    if (actions.length > 1) {
      setActions(actions.filter((_, i) => i !== idx))
    }
  }

  const updateAction = (idx: number, field: keyof ActionDef, value: any) => {
    const updated = [...actions]
    ;(updated[idx] as any)[field] = value
    setActions(updated)
  }

  const addParameter = (actionIdx: number) => {
    const updated = [...actions]
    updated[actionIdx].parameters.push({ name: "", type: "string", required: false, description: "" })
    setActions(updated)
  }

  const removeParameter = (actionIdx: number, paramIdx: number) => {
    const updated = [...actions]
    updated[actionIdx].parameters = updated[actionIdx].parameters.filter((_, i) => i !== paramIdx)
    setActions(updated)
  }

  const updateParameter = (actionIdx: number, paramIdx: number, field: string, value: any) => {
    const updated = [...actions]
    ;(updated[actionIdx].parameters[paramIdx] as any)[field] = value
    setActions(updated)
  }

  const addScope = () => {
    const s = scopeInput.trim()
    if (s && !permissions.scopes.includes(s)) {
      setPermissions({ ...permissions, scopes: [...permissions.scopes, s] })
    }
    setScopeInput("")
  }

  // Import: analyze source and pre-fill form
  const handleAnalyze = async () => {
    if (sourceType === "upload") {
      const file = fileInputRef.current?.files?.[0]
      if (!file) {
        setAnalyzeError("Please select a file to upload")
        return
      }
      const text = await file.text()
      setAnalyzeError(null)
      setAnalyzing(true)
      try {
        const parsed = JSON.parse(text)
        prefillFromManifest(parsed)
        setImportedFeatures(parsed.detectedFeatures || [])
        toast.success("File analyzed! Form has been pre-filled.")
        setStep(1)
      } catch {
        setAnalyzeError("Failed to parse file as JSON")
      } finally {
        setAnalyzing(false)
      }
      return
    }

    if (!sourceUrl.trim()) {
      setAnalyzeError("Please enter a URL")
      return
    }
    setAnalyzeError(null)
    setAnalyzing(true)

    try {
      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceType.toUpperCase(),
          sourceUrl: sourceUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      const manifest = data.manifest || data
      prefillFromManifest(manifest)
      setImportedFeatures(data.detectedFeatures || [])
      toast.success("Source analyzed! Form has been pre-filled. Review and edit below.")
      setStep(1)
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  // Map analyzed manifest to form fields
  const prefillFromManifest = (manifest: Record<string, unknown>) => {
    if (manifest.name) setName(manifest.name as string)
    if (manifest.description) setDescription(manifest.description as string)
    if (manifest.category) setCategory(manifest.category as string)
    if (manifest.tags && Array.isArray(manifest.tags)) setTags(manifest.tags as string[])

    // Map actions
    const manifestActions = manifest.actions as Array<Record<string, unknown>> | undefined
    if (manifestActions && manifestActions.length > 0) {
      const mappedActions: ActionDef[] = manifestActions.map((a) => ({
        name: (a.name as string) || "",
        description: (a.description as string) || "",
        endpoint: (a.endpoint as string) || "",
        method: (a.method as string) || "POST",
        riskLevel: (a.riskLevel as string) || "low",
        parameters: Array.isArray(a.parameters)
          ? a.parameters.map((p: Record<string, unknown>) => ({
              name: (p.name as string) || "",
              type: (p.type as string) || "string",
              required: (p.required as boolean) || false,
              description: (p.description as string) || "",
            }))
          : [],
        executionMode: (a.executionMode as "single" | "sequential" | "parallel") || "single",
        steps: Array.isArray(a.steps)
          ? a.steps.map((s: Record<string, unknown>, idx: number) => ({
              id: (s.id as string) || `step-${Date.now()}-${idx}`,
              name: (s.name as string) || `Step ${idx + 1}`,
              type: (s.type as "http" | "transform" | "merge") || "http",
              endpoint: (s.endpoint as string) || "",
              method: (s.method as string) || "POST",
              order: (s.order as number) || idx + 1,
            }))
          : [],
        authType: (a.authType as ActionDef["authType"]) || "none",
        authConfig: (a.authConfig as Record<string, string>) || {},
      }))
      setActions(mappedActions)
    }

    // Map permissions
    const manifestPerms = manifest.permissions as Array<Record<string, unknown>> | undefined
    if (manifestPerms && manifestPerms.length > 0) {
      const p = manifestPerms[0]
      setPermissions({
        roles: Array.isArray(p.roles) ? (p.roles as string[]) : ["agent"],
        scopes: Array.isArray(p.scopes) ? (p.scopes as string[]) : [],
        authRequirements: Array.isArray(p.authRequirements) ? (p.authRequirements as string[]) : ["api-key"],
        approvalRequired: (p.approvalRequired as boolean) || false,
      })
    }

    // Map policies
    const manifestPolicies = manifest.policies as Array<Record<string, unknown>> | undefined
    if (manifestPolicies && manifestPolicies.length > 0) {
      const pol = manifestPolicies[0]
      setPolicy({
        rateLimit: (pol.rateLimit as number) || 100,
        rateLimitWindow: (pol.rateLimitWindow as number) || 60,
        restrictions: (pol.restrictions as Record<string, unknown>) || null,
      })
    }
  }

  const validateStep = (stepIdx: number): boolean => {
    const newErrors: Record<string, string> = {}
    if (stepIdx === 0) {
      // Step 0: Source selection - no validation needed, user can skip
      setErrors(newErrors)
      return true
    }
    if (stepIdx === 1) {
      if (!name.trim()) newErrors.name = "Name is required"
      if (!description.trim()) newErrors.description = "Description is required"
      if (name.length > 100) newErrors.name = "Name must be under 100 characters"
      if (description.length < 20) newErrors.description = "Description should be at least 20 characters for agent discoverability"
      // Check slug uniqueness hint
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      if (slug.length < 3) newErrors.name = "Name must produce a slug of at least 3 characters"
    }
    if (stepIdx === 2) {
      actions.forEach((a, i) => {
        if (!a.name.trim()) newErrors[`action_${i}_name`] = "Action name is required"
        if (a.endpoint && !a.endpoint.startsWith("http")) {
          newErrors[`action_${i}_endpoint`] = "Endpoint must be a valid URL"
        }
        // Check for duplicate action names
        const dupes = actions.filter((other, j) => j !== i && other.name.toLowerCase() === a.name.toLowerCase())
        if (dupes.length > 0) newErrors[`action_${i}_name`] = "Duplicate action name"
      })
      if (actions.every((a) => !a.name.trim())) {
        newErrors.actions_global = "At least one action is required"
      }
    }
    if (stepIdx === 3) {
      if (permissions.scopes.length === 0) {
        // Auto-generate scopes from actions
        const autoScopes = actions
          .filter((a) => a.name.trim())
          .map((a) => `${a.name.toLowerCase().replace(/\s+/g, "-")}:execute`)
        setPermissions({ ...permissions, scopes: autoScopes })
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(Math.min(step + 1, STEPS.length - 1))
    }
  }

  const prevStep = () => setStep(Math.max(step - 1, 0))

  const buildManifest = () => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const validActions = actions.filter((a) => a.name.trim())
    
    return {
      name,
      slug,
      description,
      category,
      tags,
      visibility,
      source: creationMode === "import" ? sourceType.toUpperCase() : "LOCAL_UPLOAD" as const,
      sourceUrl: creationMode === "import" ? (sourceUrl || fileName || null) : null,
      actions: validActions.map((a) => ({
        actionId: a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: a.name,
        description: a.description,
        endpoint: a.endpoint || null,
        method: a.method,
        riskLevel: a.riskLevel,
        parameters: a.parameters.filter((p) => p.name.trim()),
        executionMode: a.executionMode,
        steps: a.executionMode !== "single" ? a.steps.filter((s) => s.name.trim()) : undefined,
        authType: a.authType !== "none" ? a.authType : undefined,
        authConfig: a.authType !== "none" && Object.keys(a.authConfig).length > 0 ? a.authConfig : undefined,
      })),
      permissions: [{
        ...permissions,
        scopes: permissions.scopes.length > 0
          ? permissions.scopes
          : validActions.map((a) => `${a.name.toLowerCase().replace(/\s+/g, "-")}:execute`),
      }],
      policies: [policy],
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const manifest = buildManifest()
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manifest),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish skill")
      }
      toast.success("Skill published successfully!")
      router.push(`/skills/${data.slug}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          <span className="text-gradient">Create a Skill</span>
        </h1>
        <p className="mt-2 text-muted-foreground">
          Import from an existing API or build a new AMTP capability from scratch.
        </p>
      </div>

      {/* Step Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isCompleted = i < step
            return (
              <div key={i} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                      isCompleted
                        ? "border-neon-blue bg-neon-blue text-white"
                        : isActive
                          ? "border-neon-blue text-neon-blue"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="size-4" /> : <Icon className="size-4" />}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:block ${
                      isActive ? "text-neon-blue" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 flex-1 rounded transition-colors ${
                      i < step ? "bg-neon-blue" : "bg-border"
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>How do you want to start?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Two option cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div
                    onClick={() => setCreationMode("import")}
                    className={`cursor-pointer rounded-lg border-2 p-6 transition-all hover:border-neon-blue/50 ${
                      creationMode === "import"
                        ? "border-neon-blue bg-neon-blue/5"
                        : "border-border"
                    }`}
                  >
                    <Wand2 className={`size-8 mb-3 ${creationMode === "import" ? "text-neon-blue" : "text-muted-foreground"}`} />
                    <h3 className="font-semibold mb-1">Import from Source</h3>
                    <p className="text-sm text-muted-foreground">
                      Auto-detect actions from an OpenAPI spec, GitHub repo, MCP server, or file upload.
                    </p>
                  </div>
                  <div
                    onClick={() => setCreationMode("manual")}
                    className={`cursor-pointer rounded-lg border-2 p-6 transition-all hover:border-neon-blue/50 ${
                      creationMode === "manual"
                        ? "border-neon-blue bg-neon-blue/5"
                        : "border-border"
                    }`}
                  >
                    <PenLine className={`size-8 mb-3 ${creationMode === "manual" ? "text-neon-blue" : "text-muted-foreground"}`} />
                    <h3 className="font-semibold mb-1">Start from Scratch</h3>
                    <p className="text-sm text-muted-foreground">
                      Manually define your skill metadata, actions, and security settings.
                    </p>
                  </div>
                </div>

                {/* Import source form */}
                {creationMode === "import" && (
                  <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
                    <div className="space-y-2">
                      <Label>Source Type</Label>
                      <Select
                        value={sourceType}
                        onValueChange={(v) => setSourceType(v as SourceType)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <span className="flex items-center gap-2">
                                {opt.icon}
                                {opt.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {sourceType !== "upload" ? (
                      <div className="space-y-2">
                        <Label>
                          {sourceType === "github"
                            ? "GitHub URL"
                            : sourceType === "mcp"
                              ? "MCP Server URL"
                              : sourceType === "openapi"
                                ? "OpenAPI Spec URL"
                                : "AMTP Markdown URL"}
                        </Label>
                        <Input
                          placeholder={
                            sourceType === "github"
                              ? "https://github.com/username/repository"
                              : sourceType === "openapi"
                                ? "https://api.example.com/openapi.json"
                                : "https://example.com/spec"
                          }
                          value={sourceUrl}
                          onChange={(e) => setSourceUrl(e.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Upload File</Label>
                        <div
                          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:border-neon-blue/30"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="text-center">
                            <Upload className="mx-auto size-6 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              {fileName ? fileName : "Drop a file here or click to browse"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Supports AMTP manifests, OpenAPI specs (.json, .yaml, .yml, .md)
                            </p>
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,.yaml,.yml,.md"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              setFileName(f ? f.name : null)
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {analyzeError && (
                      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <AlertCircle className="size-4 text-destructive shrink-0" />
                        <p className="text-sm text-destructive">{analyzeError}</p>
                      </div>
                    )}

                    {importedFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {importedFeatures.map((f, i) => (
                          <Badge key={i} className="bg-neon-blue/10 text-neon-blue text-xs">
                            <Lightbulb className="size-3 mr-1 inline" />
                            {f}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing || (!sourceUrl.trim() && sourceType !== "upload")}
                      className="gap-2"
                    >
                      {analyzing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                      {analyzing ? "Analyzing..." : "Analyze & Pre-fill"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Skill Metadata</CardTitle>
                {importedFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-xs gap-1">
                      <Wand2 className="size-3" />
                      Pre-filled from import
                    </Badge>
                    {importedFeatures.map((f, i) => (
                      <Badge key={i} className="bg-neon-blue/10 text-neon-blue text-xs">
                        <Lightbulb className="size-3 mr-1 inline" />
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Contract Analyzer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this capability does for AI agents..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => setCategory(v ?? "OTHER")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Visibility</Label>
                    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {visibility === "public" ? (
                        <Globe className="size-4 text-neon-blue" />
                      ) : (
                        <Lock className="size-4 text-amber-500" />
                      )}
                      <span className="flex-1 text-sm">
                        {visibility === "public" ? "Public" : "Private"}
                      </span>
                      <Switch
                        checked={visibility === "public"}
                        onCheckedChange={(checked) =>
                          setVisibility(checked ? "public" : "private")
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addTag()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag} size="sm">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <X
                            className="size-3 cursor-pointer"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Actions</CardTitle>
                  <Button variant="outline" size="sm" onClick={addAction} className="gap-1.5">
                    <Plus className="size-3.5" />
                    Add Action
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {actions.map((action, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Action {idx + 1}
                      </h4>
                      {actions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => removeAction(idx)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Action Name *</Label>
                        <Input
                          placeholder="e.g., analyze-contract"
                          value={action.name}
                          onChange={(e) => updateAction(idx, "name", e.target.value)}
                          className={errors[`action_${idx}_name`] ? "border-destructive" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Endpoint URL</Label>
                        <Input
                          placeholder="https://api.example.com/analyze"
                          value={action.endpoint}
                          onChange={(e) => updateAction(idx, "endpoint", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="What does this action do?"
                        value={action.description}
                        onChange={(e) => updateAction(idx, "description", e.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Method</Label>
                        <Select
                          value={action.method}
                          onValueChange={(v) => updateAction(idx, "method", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {METHODS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Risk Level</Label>
                        <Select
                          value={action.riskLevel}
                          onValueChange={(v) => updateAction(idx, "riskLevel", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RISK_LEVELS.map((r) => (
                              <SelectItem key={r} value={r}>
                                <span className="capitalize">{r}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Parameters</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => addParameter(idx)}
                        >
                          <Plus className="size-3 mr-1" />
                          Add Param
                        </Button>
                      </div>
                      {action.parameters.map((param, pidx) => (
                        <div key={pidx} className="flex gap-2 items-center">
                          <Input
                            placeholder="name"
                            className="flex-1 h-8 text-xs"
                            value={param.name}
                            onChange={(e) => updateParameter(idx, pidx, "name", e.target.value)}
                          />
                          <Select
                            value={param.type}
                            onValueChange={(v) => updateParameter(idx, pidx, "type", v)}
                          >
                            <SelectTrigger className="w-24 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">string</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                              <SelectItem value="object">object</SelectItem>
                              <SelectItem value="array">array</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={param.required}
                              onChange={(e) => updateParameter(idx, pidx, "required", e.target.checked)}
                              className="size-3"
                            />
                            req
                          </label>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground"
                            onClick={() => removeParameter(idx, pidx)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Execution Mode */}
                    <div className="space-y-2 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Execution Mode</Label>
                        <Select
                          value={action.executionMode}
                          onValueChange={(v) => updateAction(idx, "executionMode", v || "single")}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">Single Endpoint</SelectItem>
                            <SelectItem value="sequential">Multi-Step (Sequential)</SelectItem>
                            <SelectItem value="parallel">Multi-Step (Parallel)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {action.executionMode !== "single" && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                              {action.executionMode === "sequential"
                                ? "Steps execute in order. Each step can use outputs from previous steps."
                                : "Steps execute in parallel. Results are merged at the end."}
                            </p>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => {
                                const newStep = {
                                  id: `step-${Date.now()}`,
                                  name: `Step ${action.steps.length + 1}`,
                                  type: "http" as const,
                                  endpoint: "",
                                  method: "POST",
                                  order: action.steps.length + 1,
                                }
                                updateAction(idx, "steps", [...action.steps, newStep])
                              }}
                            >
                              <Plus className="size-3 mr-1" />
                              Add Step
                            </Button>
                          </div>
                          {action.steps.map((step, sidx) => (
                            <div key={step.id} className="flex gap-2 items-center">
                              <span className="text-[10px] text-muted-foreground w-4">{sidx + 1}.</span>
                              <Input
                                placeholder="Step name"
                                className="flex-1 h-7 text-xs"
                                value={step.name}
                                onChange={(e) => {
                                  const newSteps = [...action.steps]
                                  newSteps[sidx] = { ...newSteps[sidx], name: e.target.value }
                                  updateAction(idx, "steps", newSteps)
                                }}
                              />
                              <Input
                                placeholder="https://api.example.com/endpoint"
                                className="flex-[2] h-7 text-xs"
                                value={step.endpoint}
                                onChange={(e) => {
                                  const newSteps = [...action.steps]
                                  newSteps[sidx] = { ...newSteps[sidx], endpoint: e.target.value }
                                  updateAction(idx, "steps", newSteps)
                                }}
                              />
                              <Select
                                value={step.method}
                                onValueChange={(v) => {
                                  const newSteps = [...action.steps]
                                  newSteps[sidx] = { ...newSteps[sidx], method: v || "POST" }
                                  updateAction(idx, "steps", newSteps)
                                }}
                              >
                                <SelectTrigger className="w-20 h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {METHODS.map((m) => (
                                    <SelectItem key={m} value={m}>{m}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-6 text-muted-foreground"
                                onClick={() => {
                                  updateAction(idx, "steps", action.steps.filter((_, i) => i !== sidx))
                                }}
                              >
                                <X className="size-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Target Service Auth */}
                    <div className="space-y-2 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Target Service Auth</Label>
                        <Select
                          value={action.authType}
                          onValueChange={(v) => {
                            updateAction(idx, "authType", v || "none")
                            // Reset authConfig when type changes
                            updateAction(idx, "authConfig", {})
                          }}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="api-key">API Key</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                            <SelectItem value="oauth2">OAuth2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {action.authType === "bearer" && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                          <div className="space-y-1">
                            <Label className="text-xs">Bearer Token</Label>
                            <Input
                              type="password"
                              placeholder="eyJhbGciOi..."
                              className="h-7 text-xs font-mono"
                              value={action.authConfig.token || ""}
                              onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, token: e.target.value })}
                            />
                          </div>
                        </div>
                      )}
                      {action.authType === "api-key" && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Header Name</Label>
                              <Input
                                placeholder="X-API-Key"
                                className="h-7 text-xs"
                                value={action.authConfig.headerName || ""}
                                onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, headerName: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Key Value</Label>
                              <Input
                                type="password"
                                placeholder="your-api-key"
                                className="h-7 text-xs font-mono"
                                value={action.authConfig.key || ""}
                                onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, key: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {action.authType === "basic" && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Username</Label>
                              <Input
                                placeholder="username"
                                className="h-7 text-xs"
                                value={action.authConfig.username || ""}
                                onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, username: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Password</Label>
                              <Input
                                type="password"
                                placeholder="password"
                                className="h-7 text-xs"
                                value={action.authConfig.password || ""}
                                onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, password: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      {action.authType === "oauth2" && (
                        <div className="space-y-2 rounded-lg border border-dashed border-border p-3 bg-muted/20">
                          <div className="space-y-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Token URL</Label>
                              <Input
                                placeholder="https://auth.example.com/oauth/token"
                                className="h-7 text-xs"
                                value={action.authConfig.tokenUrl || ""}
                                onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, tokenUrl: e.target.value })}
                              />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Client ID</Label>
                                <Input
                                  placeholder="client_id"
                                  className="h-7 text-xs"
                                  value={action.authConfig.clientId || ""}
                                  onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, clientId: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Client Secret</Label>
                                <Input
                                  type="password"
                                  placeholder="client_secret"
                                  className="h-7 text-xs font-mono"
                                  value={action.authConfig.clientSecret || ""}
                                  onChange={(e) => updateAction(idx, "authConfig", { ...action.authConfig, clientSecret: e.target.value })}
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            SkillHub will use client credentials flow to obtain an access token before proxying requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Security & Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Permissions</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Auth Requirements</Label>
                      <Select
                        value={permissions.authRequirements[0] || "api-key"}
                        onValueChange={(v) =>
                          setPermissions({ ...permissions, authRequirements: [v || "api-key"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api-key">API Key</SelectItem>
                          <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                          <SelectItem value="bearer-token">Bearer Token</SelectItem>
                          <SelectItem value="none">None (Public)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Approval Required</Label>
                      <div className="flex items-center gap-3 rounded-lg border border-border p-3 h-9">
                        <span className="flex-1 text-sm">
                          {permissions.approvalRequired ? "Yes" : "No"}
                        </span>
                        <Switch
                          checked={permissions.approvalRequired}
                          onCheckedChange={(checked) =>
                            setPermissions({ ...permissions, approvalRequired: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Scopes</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., contracts:read"
                        value={scopeInput}
                        onChange={(e) => setScopeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addScope()
                          }
                        }}
                        className="h-8 text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={addScope} className="h-8">
                        Add
                      </Button>
                    </div>
                    {permissions.scopes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {permissions.scopes.map((scope) => (
                          <Badge key={scope} variant="outline" className="gap-1 text-xs">
                            {scope}
                            <X
                              className="size-3 cursor-pointer"
                              onClick={() =>
                                setPermissions({
                                  ...permissions,
                                  scopes: permissions.scopes.filter((s) => s !== scope),
                                })
                              }
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium">Rate Limiting</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Max Requests</Label>
                      <Input
                        type="number"
                        value={policy.rateLimit || ""}
                        onChange={(e) =>
                          setPolicy({ ...policy, rateLimit: parseInt(e.target.value) || null })
                        }
                        placeholder="100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Window (seconds)</Label>
                      <Input
                        type="number"
                        value={policy.rateLimitWindow || ""}
                        onChange={(e) =>
                          setPolicy({
                            ...policy,
                            rateLimitWindow: parseInt(e.target.value) || null,
                          })
                        }
                        placeholder="60"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="size-4" />
                  Preview AMTP Manifest
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-black/50 p-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold">{name || "Untitled Skill"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="secondary">{category.replace(/_/g, " ")}</Badge>
                      <Badge variant={visibility === "public" ? "default" : "outline"}>
                        {visibility === "public" ? (
                          <><Globe className="size-3 mr-1" /> Public</>
                        ) : (
                          <><Lock className="size-3 mr-1" /> Private</>
                        )}
                      </Badge>
                      {tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <pre className="text-xs font-mono text-green-400 overflow-x-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(buildManifest(), null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="size-4 text-neon-blue" />
                  Ready to Publish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-neon-blue/20 bg-neon-blue/5 p-6 text-center">
                  <Rocket className="size-12 mx-auto text-neon-blue mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{name}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{description}</p>
                  <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                    <span>{actions.filter((a) => a.name).length} action(s)</span>
                    <span>{visibility === "public" ? "Public" : "Private"}</span>
                    <span>{category.replace(/_/g, " ")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="flex-1 gap-2 bg-neon-blue hover:bg-neon-blue/90 text-white"
                    size="lg"
                  >
                    {publishing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Rocket className="size-4" />
                    )}
                    {publishing ? "Publishing..." : "Publish to Registry"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 0}
          className="gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          Back
        </Button>
        {step === 0 && creationMode === "manual" && (
          <Button onClick={() => setStep(1)} className="gap-1.5">
            Start from Scratch
            <ArrowRight className="size-3.5" />
          </Button>
        )}
        {step > 0 && step < STEPS.length - 1 && (
          <Button onClick={nextStep} className="gap-1.5">
            Next
            <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
