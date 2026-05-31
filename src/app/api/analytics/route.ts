import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const skillId = searchParams.get("skillId")
    const days = Math.min(90, Math.max(1, parseInt(searchParams.get("days") || "30")))

    const where = skillId ? { skillId } : {}

    // Get execution stats
    const executions = await prisma.execution.findMany({
      where,
      select: { status: true, latency: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    })

    const totalExecutions = executions.length
    const completed = executions.filter((e) => e.status === "COMPLETED").length
    const failed = executions.filter((e) => e.status === "FAILED").length
    const successRate = totalExecutions > 0 ? (completed / totalExecutions) * 100 : 0
    const avgLatency = executions.length > 0
      ? Math.round(executions.reduce((sum, e) => sum + (e.latency || 0), 0) / executions.length)
      : 0

    // Daily breakdown for charts
    const dailyMap = new Map<string, { executions: number; latency: number[]; success: number; total: number }>()
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      dailyMap.set(key, { executions: 0, latency: [], success: 0, total: 0 })
    }

    for (const exec of executions) {
      const key = exec.createdAt.toISOString().slice(0, 10)
      const entry = dailyMap.get(key)
      if (entry) {
        entry.executions++
        if (exec.latency) entry.latency.push(exec.latency)
        if (exec.status === "COMPLETED") entry.success++
        entry.total++
      }
    }

    const daily = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      executions: data.executions,
      avgLatency: data.latency.length > 0
        ? Math.round(data.latency.reduce((a, b) => a + b, 0) / data.latency.length)
        : 0,
      successRate: data.total > 0 ? Math.round((data.success / data.total) * 100) : 100,
    }))

    // Aggregate skill stats
    const skillStats = skillId
      ? await prisma.analytics.aggregate({
          where: { skillId },
          _sum: { executions: true, activeAgents: true },
        })
      : null

    return NextResponse.json({
      totalExecutions,
      completed,
      failed,
      successRate: Math.round(successRate * 10) / 10,
      avgLatencyMs: avgLatency,
      activeAgents: skillStats?._sum.activeAgents || 0,
      daily,
      growth: daily.length >= 7
        ? Math.round(((daily[daily.length - 1].executions - daily[daily.length - 7].executions) / Math.max(daily[daily.length - 7].executions, 1)) * 100)
        : 0,
    })
  } catch (error) {
    console.error("GET /api/analytics error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
