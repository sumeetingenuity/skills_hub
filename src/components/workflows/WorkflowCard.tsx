import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { GitBranch, User } from "lucide-react"

export interface WorkflowData {
  id: string
  name: string
  description: string | null
  slug: string
  skills: Array<{ skill: { id: string; name: string; slug: string } }>
  author: { name: string | null } | null
  createdAt: string
}

export function WorkflowCard({ workflow }: { workflow: WorkflowData }) {
  return (
    <Link href={`/workflows/${workflow.slug}`}>
      <Card className="h-full transition-all duration-300 hover:border-neon-blue/30 hover:shadow-[0_0_20px_rgba(0,212,255,0.05)] cursor-pointer">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {workflow.skills.length} skills
            </Badge>
            <GitBranch className="size-4 text-muted-foreground" />
          </div>
          <CardTitle className="mt-2">{workflow.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {workflow.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {workflow.skills.slice(0, 3).map((ws) => (
              <Badge key={ws.skill.id} variant="outline" className="text-[10px] h-4 px-1.5">
                {ws.skill.name}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {workflow.author?.name ?? "Unknown"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
