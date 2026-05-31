"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  BarChart3,
  MessageSquare,
  Database,
  Code2,
  Wallet,
  FileText,
  Megaphone,
  Zap,
  Search,
  TrendingUp,
  Shield,
  Cpu,
  Puzzle,
  Star,
  ArrowRight,
  CheckCircle2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/utils"

const categoryIcons: Record<string, typeof Star> = {
  ANALYTICS: BarChart3,
  COMMUNICATION: MessageSquare,
  DATA: Database,
  DEVELOPER_TOOLS: Code2,
  FINANCE: Wallet,
  LEGAL: FileText,
  MARKETING: Megaphone,
  PRODUCTIVITY: Zap,
  RESEARCH: Search,
  SALES: TrendingUp,
  SECURITY: Shield,
  AI_ML: Cpu,
  OTHER: Puzzle,
}

interface SkillCardData {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags?: string[]
  author: { id: string; name: string | null; avatarUrl?: string | null }
  trustScore?: {
    score: number
    verified: boolean
    totalExecutions: number
    totalReviews: number
  } | null
}

export default function FeaturedCapabilities() {
  const [skills, setSkills] = useState<SkillCardData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/skills?sort=popularity&limit=6")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills) setSkills(data.skills)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="relative px-4 py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-3"
            >
              Registry
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold tracking-tight sm:text-4xl"
            >
              Featured Capabilities
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mt-3 text-muted-foreground max-w-lg"
            >
              Production-ready skills with verified trust scores, ready for your agents
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link href="/skills">
              <Button variant="outline" className="gap-2 hover:border-blue-500/40">
                View All Skills
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/50 p-6 space-y-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))
            : skills.map((skill, index) => {
                const Icon = categoryIcons[skill.category] ?? Puzzle
                const trustScore = skill.trustScore?.score ?? 0
                const executions = skill.trustScore?.totalExecutions ?? 0
                const isVerified = skill.trustScore?.verified
                return (
                  <motion.div
                    key={skill.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link href={`/skills/${skill.slug}`} className="block h-full">
                      <div className="group relative flex h-full flex-col rounded-xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:bg-card/60 hover:shadow-lg hover:shadow-blue-500/5">
                        {/* Top gradient on hover */}
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                        <div className="flex items-start justify-between mb-4">
                          <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-violet-500/10 ring-1 ring-blue-500/10 transition-all group-hover:ring-blue-500/30">
                            <Icon className="size-5 text-blue-400" />
                          </div>
                          {isVerified && (
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="size-3" />
                              Verified
                            </div>
                          )}
                        </div>

                        <h3 className="text-base font-semibold mb-1.5 group-hover:text-blue-400 transition-colors">
                          {skill.name}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                          {skill.description}
                        </p>

                        {/* Tags */}
                        {skill.tags && skill.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {skill.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] h-5 px-2 font-normal bg-transparent">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Footer stats */}
                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/30 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Shield className={`size-3.5 ${trustScore >= 80 ? "text-blue-400" : "text-muted-foreground"}`} />
                            <span className="font-medium">{Math.round(trustScore)}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Zap className="size-3" />
                            <span>{formatNumber(executions)}</span>
                          </div>
                          <span className="truncate max-w-[80px]">
                            {skill.author.name || "Unknown"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
        </div>
      </div>
    </section>
  )
}
