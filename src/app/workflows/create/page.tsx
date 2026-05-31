"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SkillComposer } from "@/components/workflows/SkillComposer"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function CreateWorkflowPage() {
  const router = useRouter()

  const handleSave = async (data: { name: string; description: string; skillIds: string[] }) => {
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to create workflow")
      }

      const workflow = await res.json()
      toast.success("Workflow created successfully")
      router.push(`/workflows/${workflow.slug}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workflow")
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6">
        <Link href="/workflows">
          <Button variant="ghost" size="sm" className="gap-1 mb-4">
            <ArrowLeft className="size-4" />
            Back to Workflows
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Create Workflow
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chain skills together to create reusable capability pipelines.
        </p>
      </div>
      <SkillComposer onSave={handleSave} />
    </div>
  )
}
