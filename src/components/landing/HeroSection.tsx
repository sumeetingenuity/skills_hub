"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Sparkles, Terminal, Zap, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const },
  },
}

const codeLines = [
  { text: "GET /api/skills/discover", color: "text-emerald-400" },
  { text: 'Accept: text/amtp+markdown', color: "text-amber-400" },
  { text: 'X-Agent-ID: claude-agent-01', color: "text-amber-400" },
  { text: "", color: "" },
  { text: "200 OK", color: "text-emerald-400" },
  { text: "---", color: "text-muted-foreground" },
  { text: "title: Contract Analyzer", color: "text-blue-400" },
  { text: "trust_score: 94", color: "text-blue-400" },
  { text: "actions: [analyze, extract, compare]", color: "text-violet-400" },
  { text: "---", color: "text-muted-foreground" },
]

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4 py-20">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.15),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

        {/* Animated orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.08, 0.12, 0.08] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[100px]"
        />
      </div>

      <div className="mx-auto max-w-7xl w-full">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col"
          >
            <motion.div
              variants={itemVariants}
              className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 px-4 py-1.5 text-sm text-blue-400"
            >
              <Sparkles className="size-3.5" />
              <span>The Operating System for AI Agents</span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
            >
              The Capability Layer
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                for AI Agents
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground"
            >
              Discover, publish, execute and compose AI capabilities using AMTP. 
              The world's first Capability Registry where agents can understand, verify, and trust skills natively.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link href="/skills">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/20"
                >
                  Browse Registry
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/skills/create">
                <Button size="lg" variant="outline" className="gap-2 border-border/80 hover:border-blue-500/40 hover:bg-blue-500/5">
                  Publish Skill
                  <Zap className="size-4" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-500" />
                SSRF Protected
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-500" />
                HMAC Signed
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-500" />
                Rate Limited
              </span>
              <span className="flex items-center gap-1.5">
                <Shield className="size-3.5 text-emerald-500" />
                Circuit Breaking
              </span>
            </motion.div>
          </motion.div>

          {/* Right: Code visualization */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl shadow-blue-500/5 overflow-hidden">
              {/* Terminal header */}
              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-red-500/70" />
                  <div className="size-2.5 rounded-full bg-amber-500/70" />
                  <div className="size-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <div className="flex items-center gap-1.5 ml-3 text-xs text-muted-foreground">
                  <Terminal className="size-3" />
                  <span>AMTP Agent Discovery</span>
                </div>
              </div>

              {/* Code content */}
              <div className="p-5 font-mono text-[13px] leading-relaxed space-y-0.5">
                {codeLines.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    className={line.color}
                  >
                    {line.text || "\u00A0"}
                  </motion.div>
                ))}
              </div>

              {/* Glow effect */}
              <div className="absolute -inset-[1px] -z-10 rounded-xl bg-gradient-to-b from-blue-500/20 via-transparent to-violet-500/10 blur-sm" />
            </div>

            {/* Floating badges */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 -right-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 backdrop-blur-sm"
            >
              Trust Score: 94%
            </motion.div>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-3 -left-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 backdrop-blur-sm"
            >
              3 actions available
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
