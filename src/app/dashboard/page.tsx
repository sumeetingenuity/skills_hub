"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Code2,
  Zap,
  Key,
  BarChart3,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react"

interface DashboardData {
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
    _count: {
      skills: number
      executions: number
      reviews: number
      workflows: number
    }
  }
  recentExecutions: Array<{
    id: string
    status: string
    latency: number | null
    createdAt: string
    skill: { name: string; slug: string }
  }>
  mySkills: Array<{
    id: string
    name: string
    slug: string
    published: boolean
    category: string
    _count: { executions: number; actions: number }
    trustScore: { score: number } | null
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard")
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Published Skills", value: data?.user?._count?.skills || 0, icon: Code2, color: "text-neon-blue" },
    { label: "Total Executions", value: data?.user?._count?.executions || 0, icon: Zap, color: "text-emerald-500" },
    { label: "Workflows", value: data?.user?._count?.workflows || 0, icon: Activity, color: "text-violet-500" },
    { label: "Reviews Given", value: data?.user?._count?.reviews || 0, icon: BarChart3, color: "text-amber-500" },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{data?.user?.name ? `, ${data.user.name}` : ""}
          </p>
        </div>
        <Link href="/skills/create">
          <Button className="gap-1.5 bg-neon-blue hover:bg-neon-blue/90 text-white">
            <Plus className="size-3.5" />
            New Skill
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <Icon className={`size-8 ${stat.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Skills */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Skills</CardTitle>
            <Link href="/dashboard/skills">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="size-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data?.mySkills && data.mySkills.length > 0 ? (
              <div className="space-y-3">
                {data.mySkills.slice(0, 5).map((skill) => (
                  <Link
                    key={skill.id}
                    href={`/skills/${skill.slug}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-neon-blue/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {skill.category.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {skill._count.executions} executions
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={skill.published ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {skill.published ? "Public" : "Private"}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Code2 className="size-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No skills published yet</p>
                <Link href="/skills/create">
                  <Button variant="link" size="sm" className="mt-2 gap-1">
                    <Plus className="size-3" /> Publish your first skill
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentExecutions && data.recentExecutions.length > 0 ? (
              <div className="space-y-3">
                {data.recentExecutions.slice(0, 5).map((exec) => (
                  <div
                    key={exec.id}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    {exec.status === "COMPLETED" ? (
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    ) : exec.status === "FAILED" ? (
                      <XCircle className="size-4 text-destructive shrink-0" />
                    ) : (
                      <Clock className="size-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exec.skill.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exec.createdAt).toLocaleDateString()}
                        {exec.latency ? ` · ${exec.latency}ms` : ""}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        exec.status === "COMPLETED"
                          ? "text-emerald-500"
                          : exec.status === "FAILED"
                            ? "text-destructive"
                            : "text-amber-500"
                      }`}
                    >
                      {exec.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Zap className="size-8 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No executions yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
