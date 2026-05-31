"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GitBranch,
  Globe,
  FileJson,
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Lightbulb,
} from "lucide-react"

type SourceType = "github" | "mcp" | "openapi" | "amtp-markdown" | "upload"

const sourceOptions: { value: SourceType; label: string; icon: React.ReactNode }[] = [
  { value: "github", label: "GitHub Repository", icon: <GitBranch className="size-4" /> },
  { value: "mcp", label: "MCP Server", icon: <Globe className="size-4" /> },
  { value: "openapi", label: "OpenAPI Spec", icon: <FileJson className="size-4" /> },
  { value: "amtp-markdown", label: "AMTP Markdown", icon: <FileText className="size-4" /> },
  { value: "upload", label: "Upload File", icon: <Upload className="size-4" /> },
]

interface DetectedFeature {
  label: string
  found: boolean
}

export default function ImportPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [sourceType, setSourceType] = useState<SourceType>("github")
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState(false)
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [features, setFeatures] = useState<string[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const comingSoon = false // All sources now supported

  const handleAnalyze = async () => {
    if (sourceType === "upload") {
      const file = fileInputRef.current?.files?.[0]
      if (!file) {
        setError("Please select a file to upload")
        return
      }
      const text = await file.text()
      setError(null)
      setAnalyzing(true)
      setPublished(false)
      setAnalyzed(false)

      try {
        const parsed = JSON.parse(text)
        setManifest(parsed)
        setFeatures(parsed.detectedFeatures || [])
        setAnalyzed(true)
      } catch {
        setError("Failed to parse file as JSON")
      } finally {
        setAnalyzing(false)
      }
      return
    }

    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }
    setError(null)
    setAnalyzing(true)
    setPublished(false)
    setAnalyzed(false)

    try {
      const res = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceType.toUpperCase(),
          sourceUrl: url,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed")
      }

      setManifest(data.manifest || data)
      setFeatures(data.detectedFeatures || [])
      setAnalyzed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  const handlePublish = async () => {
    if (!manifest) return
    setPublishing(true)
    setError(null)

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: sourceType.toUpperCase(),
          sourceUrl: url || fileName || "local-file",
          manifest,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Publish failed")
      }

      setPublished(true)
      setPublishedSlug(data.slug || data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  const handleReset = () => {
    setUrl("")
    setAnalyzed(false)
    setPublished(false)
    setPublishedSlug(null)
    setManifest(null)
    setError(null)
    setFeatures([])
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Import Capability
        </h1>
        <p className="mt-2 text-muted-foreground">
          Publish a new capability to the AMTP registry from any supported
          source.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Source Type
              </label>
              <Select
                value={sourceType}
                onValueChange={(v) => {
                  setSourceType(v as SourceType)
                  setAnalyzed(false)
                  setPublished(false)
                  setManifest(null)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {sourceType === "github"
                    ? "GitHub URL"
                    : sourceType === "mcp"
                      ? "MCP Server URL"
                      : sourceType === "openapi"
                        ? "OpenAPI Spec URL"
                        : "AMTP Markdown URL"}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={
                      sourceType === "github"
                        ? "https://github.com/username/repository"
                        : "https://example.com/spec.json"
                    }
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Upload File
                </label>
                <div
                  className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:border-neon-blue/30"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-center">
                    <Upload className="mx-auto size-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {fileName ? fileName : "Drop a file here or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports AMTP manifests, OpenAPI specs, and MCP configs
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

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <AlertCircle className="size-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || (!url.trim() && sourceType !== "upload")}
              className="gap-2"
            >
              {analyzing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {analyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </CardContent>
        </Card>

        {analyzed && manifest && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileJson className="size-4" />
                    Analysis Result
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-emerald-500/10 text-emerald-500"
                  >
                    <CheckCircle2 className="size-3" />
                    Analyzed
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-black/50 p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {manifest.name as string}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {manifest.description as string}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {(manifest.actions as Array<Record<string, unknown>>)?.map(
                      (action: Record<string, unknown>, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {action.name as string}
                        </Badge>
                      )
                    )}
                  </div>

                  {features.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {features.map((f, i) => (
                        <Badge
                          key={i}
                          className="bg-neon-blue/10 text-neon-blue text-xs"
                        >
                          <Lightbulb className="size-3 mr-1 inline" />
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <pre className="rounded-lg border border-border bg-black/50 p-4 text-xs font-mono text-green-400 overflow-x-auto max-h-80">
                  {JSON.stringify(manifest, null, 2)}
                </pre>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePublish}
                    disabled={publishing || published}
                    className="gap-2"
                  >
                    {publishing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : published ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {publishing
                      ? "Publishing..."
                      : published
                        ? "Published"
                        : "Publish to Registry"}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Reset
                  </Button>
                </div>

                {published && publishedSlug && (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    <p className="text-sm text-emerald-500 flex-1">
                      Capability published successfully!
                    </p>
                    <Button
                      variant="link"
                      className="gap-1 text-emerald-500 h-auto p-0"
                      onClick={() => router.push(`/skills/${publishedSlug}`)}
                    >
                      View in Registry
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!analyzed && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground font-normal">
                After analyzing, you will be able to review and edit the
                generated AMTP manifest before publishing.
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
