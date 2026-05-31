"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SkillCard, type Skill } from "@/components/skills/SkillCard"
import {
  Code2,
  Zap,
  Star,
  Calendar,
  Shield,
  Award,
} from "lucide-react"

interface ProfileData {
  user: {
    id: string
    name: string | null
    email: string
    avatarUrl: string | null
    bio: string | null
    createdAt: string
    _count: {
      skills: number
      executions: number
      reviews: number
    }
  }
  skills: Skill[]
  badges: Array<{
    id: string
    badge: { type: string; name: string; description: string | null }
  }>
}

export default function ProfilePage() {
  const params = useParams()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/profile/${params.id}`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchProfile()
  }, [params.id])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex gap-6 mb-8">
          <Skeleton className="size-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!data?.user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    )
  }

  const { user, skills, badges } = data

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <Avatar className="size-20 border-2 border-border">
          <AvatarImage src={user.avatarUrl || undefined} />
          <AvatarFallback className="text-2xl bg-neon-blue/20 text-neon-blue">
            {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.name || "Anonymous"}</h1>
          {user.bio && <p className="text-muted-foreground mt-1">{user.bio}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Code2 className="size-3.5" /> {user._count.skills} skills
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="size-3.5" /> {user._count.executions} executions
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="size-3.5" /> {user._count.reviews} reviews
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" /> Joined {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {badges.map((b) => (
                <Badge key={b.id} variant="secondary" className="gap-1">
                  <Award className="size-3" />
                  {b.badge.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Published Skills */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Published Skills</h2>
        {skills.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No published skills yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
