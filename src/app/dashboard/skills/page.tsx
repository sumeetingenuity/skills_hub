"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Globe, Lock } from "lucide-react"
import { toast } from "sonner"

interface UserSkill {
  id: string
  name: string
  slug: string
  published: boolean
  category: string
  createdAt: string
  _count: { executions: number; actions: number }
  trustScore: { score: number } | null
}

export default function MySkillsPage() {
  const [skills, setSkills] = useState<UserSkill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSkills() {
      try {
        const res = await fetch("/api/dashboard/skills")
        if (res.ok) {
          const json = await res.json()
          setSkills(json.skills || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchSkills()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this skill?")) return
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" })
      if (res.ok) {
        setSkills(skills.filter((s) => s.id !== id))
        toast.success("Skill deleted")
      } else {
        toast.error("Failed to delete skill")
      }
    } catch {
      toast.error("Failed to delete skill")
    }
  }

  const handleToggleVisibility = async (id: string, currentlyPublished: boolean) => {
    try {
      const res = await fetch(`/api/skills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !currentlyPublished }),
      })
      if (res.ok) {
        setSkills(skills.map((s) => s.id === id ? { ...s, published: !currentlyPublished } : s))
        toast.success(currentlyPublished ? "Skill set to private" : "Skill published")
      }
    } catch {
      toast.error("Failed to update skill")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Skills</h1>
          <p className="text-muted-foreground mt-1">
            Manage your published capabilities
          </p>
        </div>
        <Link href="/skills/create">
          <Button className="gap-1.5 bg-neon-blue hover:bg-neon-blue/90 text-white">
            <Plus className="size-3.5" />
            New Skill
          </Button>
        </Link>
      </div>

      {skills.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Executions</TableHead>
                  <TableHead>Trust</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow key={skill.id}>
                    <TableCell>
                      <Link href={`/skills/${skill.slug}`} className="font-medium hover:text-neon-blue transition-colors">
                        {skill.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {skill.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={skill.published ? "default" : "secondary"}
                        className="text-xs gap-1"
                      >
                        {skill.published ? (
                          <><Globe className="size-3" /> Public</>
                        ) : (
                          <><Lock className="size-3" /> Private</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {skill._count.actions}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {skill._count.executions}
                    </TableCell>
                    <TableCell>
                      {skill.trustScore ? (
                        <span className="text-sm font-medium text-neon-blue">
                          {Math.round(skill.trustScore.score)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex size-7 items-center justify-center rounded-md hover:bg-accent">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => window.location.href = `/skills/${skill.slug}`}
                            className="gap-2"
                          >
                            <Eye className="size-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleVisibility(skill.id, skill.published)}
                            className="gap-2"
                          >
                            {skill.published ? (
                              <><Lock className="size-4" /> Make Private</>
                            ) : (
                              <><Globe className="size-4" /> Make Public</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(skill.id)}
                            className="gap-2"
                            variant="destructive"
                          >
                            <Trash2 className="size-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">You haven't published any skills yet.</p>
            <Link href="/skills/create">
              <Button className="gap-1.5">
                <Plus className="size-3.5" />
                Publish Your First Skill
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
