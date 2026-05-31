"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import {
  Package,
  PlayCircle,
  Users,
  Building2,
  Bot,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"

const FALLBACK_METRICS = {
  skills: 2847,
  executions: 142890,
  developers: 12560,
  organizations: 843,
  agents: 49210,
}

const metricsConfig = [
  { key: "skills" as const, label: "Skills Published", icon: Package, suffix: "+" },
  { key: "executions" as const, label: "Total Executions", icon: PlayCircle, suffix: "+" },
  { key: "developers" as const, label: "Developers", icon: Users, suffix: "+" },
  { key: "organizations" as const, label: "Organizations", icon: Building2, suffix: "" },
  { key: "agents" as const, label: "Agents Connected", icon: Bot, suffix: "+" },
]

function Counter({ end, duration = 2 }: { end: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let startTime: number | null = null
    let raf: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setCount(Math.floor(eased * end))
      if (progress < 1) {
        raf = requestAnimationFrame(animate)
      }
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [isInView, end, duration])

  return <span ref={ref}>{formatNumber(count)}</span>
}

export default function EcosystemMetrics() {
  const [counts, setCounts] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch("/api/metrics")
      .then((r) => r.json())
      .then((data) => {
        if (data.skills != null) {
          setCounts({
            skills: data.skills,
            executions: data.executions ?? FALLBACK_METRICS.executions,
            developers: data.developers ?? FALLBACK_METRICS.developers,
            organizations: data.organizations ?? FALLBACK_METRICS.organizations,
            agents: data.agents ?? FALLBACK_METRICS.agents,
          })
        }
      })
      .catch(() => {
        setCounts(FALLBACK_METRICS)
      })
  }, [])

  return (
    <section className="relative px-4 py-28 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-3"
          >
            Growing Ecosystem
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Trusted by Agents Worldwide
          </motion.h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {metricsConfig.map((metric, index) => {
            const Icon = metric.icon
            const end = counts?.[metric.key] ?? 0
            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="group relative flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card/30 p-8 text-center backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:bg-card/60"
              >
                {/* Subtle top gradient */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                
                <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 ring-1 ring-blue-500/10">
                  <Icon className="size-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold tabular-nums tracking-tight">
                  <Counter end={end} />
                  <span className="text-blue-400">{metric.suffix}</span>
                </div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {metric.label}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
