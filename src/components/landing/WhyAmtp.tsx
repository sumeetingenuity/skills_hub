"use client"

import { motion } from "framer-motion"
import { CheckCircle2, XCircle, Minus, Globe, Code2, Zap } from "lucide-react"

const approaches = [
  {
    name: "Browser Automation",
    icon: Globe,
    description: "Screen scraping and UI interaction",
    color: "text-red-400",
    borderColor: "border-red-500/20",
    bgColor: "bg-red-500/5",
    features: [
      { label: "Reliability", status: "bad" },
      { label: "Discovery", status: "bad", note: "UI Parsing" },
      { label: "Speed", status: "bad", note: "Slow" },
      { label: "Schema Validation", status: "bad" },
      { label: "Permission Model", status: "bad" },
      { label: "Composability", status: "bad" },
    ],
  },
  {
    name: "Traditional APIs",
    icon: Code2,
    description: "REST/GraphQL integration work",
    color: "text-amber-400",
    borderColor: "border-amber-500/20",
    bgColor: "bg-amber-500/5",
    features: [
      { label: "Reliability", status: "mid" },
      { label: "Discovery", status: "mid", note: "Manual" },
      { label: "Speed", status: "mid", note: "Complex" },
      { label: "Schema Validation", status: "mid" },
      { label: "Permission Model", status: "mid" },
      { label: "Composability", status: "mid" },
    ],
  },
  {
    name: "AMTP",
    icon: Zap,
    description: "Agent-native capability protocol",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
    highlight: true,
    features: [
      { label: "Reliability", status: "good" },
      { label: "Discovery", status: "good", note: "Native" },
      { label: "Speed", status: "good", note: "Agent-First" },
      { label: "Schema Validation", status: "good" },
      { label: "Permission Model", status: "good" },
      { label: "Composability", status: "good" },
    ],
  },
]

function StatusIcon({ status }: { status: string }) {
  if (status === "good") return <CheckCircle2 className="size-4 text-emerald-400" />
  if (status === "bad") return <XCircle className="size-4 text-red-400/70" />
  return <Minus className="size-4 text-amber-400/70" />
}

export default function WhyAmtp() {
  return (
    <section className="relative px-4 py-28 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(59,130,246,0.04),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-3"
          >
            Comparison
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Why AMTP?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Purpose-built for the agent era. Not a retrofit, not a wrapper - native capability infrastructure.
          </motion.p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {approaches.map((approach, index) => {
            const Icon = approach.icon
            return (
              <motion.div
                key={approach.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.12 }}
                className={`relative rounded-2xl border ${approach.borderColor} ${approach.bgColor} p-6 transition-all duration-300 ${
                  approach.highlight
                    ? "ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/5"
                    : ""
                }`}
              >
                {approach.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Recommended
                  </div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${approach.bgColor} ring-1 ring-inset ring-white/5`}>
                    <Icon className={`size-5 ${approach.color}`} />
                  </div>
                  <div>
                    <h3 className={`font-semibold ${approach.color}`}>{approach.name}</h3>
                    <p className="text-xs text-muted-foreground">{approach.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {approach.features.map((feature) => (
                    <div
                      key={feature.label}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-muted-foreground">{feature.label}</span>
                      <div className="flex items-center gap-2">
                        {feature.note && (
                          <span className={`text-xs ${approach.color} opacity-70`}>
                            {feature.note}
                          </span>
                        )}
                        <StatusIcon status={feature.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
