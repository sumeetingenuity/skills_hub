"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Code2, Zap, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CtaSection() {
  return (
    <section className="relative px-4 py-28 overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(59,130,246,0.08),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl border border-blue-500/20 bg-gradient-to-b from-blue-500/5 via-card/50 to-violet-500/5 p-10 sm:p-16 text-center backdrop-blur-sm"
        >
          {/* Glow effect */}
          <div className="absolute -inset-[1px] -z-10 rounded-2xl bg-gradient-to-b from-blue-500/10 to-violet-500/10 blur-xl opacity-50" />

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl mb-4"
          >
            Ready to publish your first{" "}
            <span className="text-gradient">capability</span>?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Join thousands of developers making their tools accessible to AI agents. 
            Import from GitHub, MCP servers, or OpenAPI specs in seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/skills/create">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/20"
              >
                Publish a Skill
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/import">
              <Button size="lg" variant="outline" className="gap-2 hover:border-blue-500/40">
                <GitBranch className="size-4" />
                Import from GitHub
              </Button>
            </Link>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1">
              <Code2 className="size-3.5 text-blue-400" />
              npm install @amtp/protocol
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1">
              <Zap className="size-3.5 text-amber-400" />
              Sub-millisecond routing
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-border/50 px-3 py-1">
              <GitBranch className="size-3.5 text-emerald-400" />
              Open protocol
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
