"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Check, X } from "lucide-react"

interface CompatibilityMatrixProps {
  skillId: string
  actions: Array<{ name: string; riskLevel: string }>
}

const agents = ["ChatGPT", "Claude", "Cursor", "Windsurf", "OpenAI Agents", "Custom Agents"]

export function CompatibilityMatrix({ actions }: CompatibilityMatrixProps) {
  const maxRisk = actions.reduce((max, a) => {
    const levels = { low: 1, medium: 2, high: 3 }
    return Math.max(max, levels[a.riskLevel as keyof typeof levels] || 1)
  }, 1)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Agent Compatibility</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Agent</TableHead>
            <TableHead>Compatible</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents.map((agent) => {
            const compatible = getCompatibility(agent, maxRisk)
            return (
              <TableRow key={agent}>
                <TableCell className="font-medium">{agent}</TableCell>
                <TableCell>
                  {compatible === "full" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 gap-1">
                      <Check className="size-3" /> Full
                    </Badge>
                  ) : compatible === "partial" ? (
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 gap-1">
                      <Check className="size-3" /> Partial
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-destructive border-destructive/30 gap-1">
                      <X className="size-3" /> Limited
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {compatible === "full"
                    ? "All actions supported"
                    : compatible === "partial"
                      ? "Low-risk actions supported"
                      : "Manual approval required"}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function getCompatibility(agent: string, maxRisk: number): "full" | "partial" | "limited" {
  if (["Custom Agents", "OpenAI Agents"].includes(agent)) return "full"
  if (["Claude", "ChatGPT"].includes(agent)) return maxRisk <= 2 ? "full" : "partial"
  return maxRisk <= 1 ? "full" : "limited"
}
