"use client"

import { useEffect, useState } from "react"
import { WorkflowCard, WorkflowData } from "@/components/workflows/WorkflowCard"

interface ApiResponse {
  workflows: WorkflowData[]
  total: number
  page: number
  limit: number
}

export default function WorkflowsPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/workflows")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load workflows")
        return res.json()
      })
      .then((json: ApiResponse) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Workflows</h1>
        <p className="mt-2 text-muted-foreground">
          Composable multi-capability workflows built by the community.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
          ))
        ) : error ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            {error}
          </div>
        ) : data?.workflows.length === 0 ? (
          <div className="col-span-full text-center text-muted-foreground py-12">
            No workflows found.
          </div>
        ) : (
          data?.workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))
        )}
      </div>
    </div>
  )
}
