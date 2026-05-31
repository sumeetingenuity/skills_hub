"use client"

import { motion } from "framer-motion"
import {
  Bot,
  Search,
  FileText,
  ShieldCheck,
  Play,
  CheckCircle2,
} from "lucide-react"

const steps = [
  {
    icon: Bot,
    label: "Identify",
    description: "Agent recognizes a task requiring external capabilities",
    color: "from-blue-500/20 to-blue-600/20",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/20 hover:border-blue-500/40",
  },
  {
    icon: Search,
    label: "Discover",
    description: "Query the AMTP registry for semantically matching skills",
    color: "from-indigo-500/20 to-indigo-600/20",
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-500/20 hover:border-indigo-500/40",
  },
  {
    icon: FileText,
    label: "Understand",
    description: "Read the capability contract: inputs, outputs, schemas",
    color: "from-violet-500/20 to-violet-600/20",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/20 hover:border-violet-500/40",
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    description: "Validate permissions, policies, and trust scores",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    icon: Play,
    label: "Execute",
    description: "Invoke the capability with validated parameters",
    color: "from-amber-500/20 to-amber-600/20",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/20 hover:border-amber-500/40",
  },
  {
    icon: CheckCircle2,
    label: "Receive",
    description: "Get structured, typed results ready for downstream use",
    color: "from-emerald-500/20 to-emerald-600/20",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/20 hover:border-emerald-500/40",
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

export default function WhatIsAmtp() {
  return (
    <section className="relative px-4 py-28" id="how-it-works">
      {/* Subtle background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(99,102,241,0.05),transparent)]" />
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm font-medium uppercase tracking-widest text-blue-400 mb-3"
          >
            Protocol Flow
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            How AMTP Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            From intent to execution in six deterministic steps. No guessing, no scraping, no fragile integrations.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.label}
                variants={itemVariants}
                className={`group relative rounded-xl border ${step.borderColor} bg-card/30 p-6 backdrop-blur-sm transition-all duration-300 hover:bg-card/60`}
              >
                {/* Step number */}
                <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground/40">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className={`mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color}`}>
                  <Icon className={`size-5 ${step.iconColor}`} />
                </div>

                <h3 className="text-base font-semibold mb-1.5">{step.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {/* Connection line (visible on lg) */}
                {index < steps.length - 1 && index !== 2 && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-px bg-gradient-to-r from-border to-transparent" />
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Bottom highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground">
            Every step is{" "}
            <span className="text-blue-400 font-medium">deterministic</span>,{" "}
            <span className="text-indigo-400 font-medium">verifiable</span>, and{" "}
            <span className="text-violet-400 font-medium">auditable</span>.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
