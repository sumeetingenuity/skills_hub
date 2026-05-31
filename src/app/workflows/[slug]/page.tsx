"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Play, Loader2, CheckCircle2, XCircle, ArrowDown } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { formatDate } from "@/lib/utils"

interface WorkflowDetail {
  id: string
  name: string
  description: string
  slug: string
  createdAt: string
  author: { name: string; avatarUrl: string | null }
  skills: Array<{
    id: string
    order: number
    skill: {
      id: string
      name: string
      slug: string
      description: string
      author: { name: string }
      trustScore: { score: number; verified: boolean } | null
    }
  }>
}

interface ExecutionResult {
  skillName: string
  actionName: string
  status: string
  output: unknown
  latency: number
}

export default function WorkflowDetailPage() {
  const params = useParams()
  const slug = params.slug as string
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [results, setResults] = useState<ExecutionResult[] | null>(null)

  useEffect(() => {
    fetch(`/api/workflows/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setWorkflow(data)
      })
      .catch(() => toast.error("Failed to load workflow"))
      .finally(() => setLoading(false))
  }, [slug])

  const handleExecute = async () => {
    if (!workflow) return
    setExecuting(true)
    setResults(null)

    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      })

      if (!res.ok) throw new Error("Execution failed")

      const data = await res.json()
      setResults(data.results)

      if (data.status === "COMPLETED") {
        toast.success("Workflow executed successfully")
      } else {
        toast.warning("Some steps failed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Execution failed")
    } finally {
      setExecuting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-4 w-96 mb-8" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="text-xl font-semibold">Workflow not found</h2>
        <Link href="/workflows" className="text-sm text-neon-blue underline mt-2 inline-block">
          Back to workflows
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/workflows">
        <Button variant="ghost" size="sm" className="gap-1 mb-4">
          <ArrowLeft className="size-4" />
          Back to Workflows
        </Button>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{workflow.name}</h1>
        {workflow.description && (
          <p className="mt-2 text-muted-foreground">{workflow.description}</p>
        )}
        <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
          <span>By {workflow.author?.name || "Anonymous"}</span>
          <span>·</span>
          <span>{workflow.skills.length} skills</span>
          <span>·</span>
          <span>{formatDate(workflow.createdAt)}</span>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {workflow.skills.map((ws, idx) => (
              <div key={ws.id}>
                <Link href={`/skills/${ws.skill.slug}`}>
                  <Card className="border-border/50 hover:border-neon-blue/30 transition-colors cursor-pointer">
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neon-blue/10 text-xs font-bold text-neon-blue">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ws.skill.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ws.skill.description}
                        </p>
                      </div>
                      {ws.skill.trustScore && (
                        <Badge variant="outline" className="text-xs">
                          Trust {ws.skill.trustScore.score}%
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
                {idx < workflow.skills.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="size-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 mb-6">
        <Button onClick={handleExecute} disabled={executing} className="gap-2">
          {executing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {executing ? "Executing..." : "Execute Workflow"}
        </Button>
      </div>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-3 ${
                  result.status === "COMPLETED"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : result.status === "SKIPPED"
                      ? "border-yellow-500/20 bg-yellow-500/5"
                      : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {result.status === "COMPLETED" ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : result.status === "SKIPPED" ? (
                    <XCircle className="size-4 text-yellow-500" />
                  ) : (
                    <XCircle className="size-4 text-destructive" />
                  )}
                  <span className="text-sm font-medium">{result.skillName}</span>
                  <span className="text-xs text-muted-foreground">
                    ({result.latency}ms)
                  </span>
                </div>
                <pre className="mt-1 text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(result.output, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
