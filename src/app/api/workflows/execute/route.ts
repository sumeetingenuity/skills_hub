import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkSsrf, getCircuitState, recordFailure, recordSuccess, signPayload } from "@/lib/security"
import { auth } from "@clerk/nextjs/server"

const EXECUTION_TIMEOUT_MS = 5_000

export async function POST(request: NextRequest) {
  try {
    const clerkAuth = await auth()
    if (!clerkAuth.userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const body = await request.json()
    const { workflowId, input } = body

    if (!workflowId) {
      return NextResponse.json({ error: "workflowId is required" }, { status: 400 })
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        skills: {
          include: {
            skill: {
              include: {
                actions: { take: 1 },
              },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    })

    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    const results: Array<{ skillName: string; actionName: string; status: string; output: unknown; latency: number }> = []
    let currentInput = input || {}

    for (const ws of workflow.skills) {
      const action = ws.skill.actions[0]
      if (!action) {
        results.push({
          skillName: ws.skill.name,
          actionName: "none",
          status: "SKIPPED",
          output: null,
          latency: 0,
        })
        continue
      }

      const start = Date.now()
      let execOutput: unknown = {}
      let execStatus = "COMPLETED"

      try {
        if (action.endpoint) {
          const ssrfCheck = await checkSsrf(action.endpoint)
          if (!ssrfCheck.allowed) {
            throw new Error(`SSRF blocked: ${ssrfCheck.reason}`)
          }

          const endpointUrl = new URL(action.endpoint)
          const circuitState = getCircuitState(endpointUrl.hostname)
          if (circuitState === "OPEN") {
            throw new Error(`Circuit breaker open for ${endpointUrl.hostname}. Target temporarily blocked.`)
          }

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS)

          try {
            const method = action.method || "POST"
            const fetchOptions: RequestInit = {
              method,
              signal: controller.signal,
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "amtp-skillhub-proxy/1.0",
              },
            }

            const bodyStr = JSON.stringify(currentInput)
            fetchOptions.body = bodyStr

            const secret = process.env.HUB_SIGNING_SECRET || ""
            if (secret) {
              const signature = signPayload(bodyStr, secret)
              ;(fetchOptions.headers as Record<string, string>)["X-Hub-Signature-256"] = signature
            }

            const res = await fetch(action.endpoint, fetchOptions)
            recordSuccess(endpointUrl.hostname)

            const text = await res.text()
            try {
              execOutput = JSON.parse(text)
            } catch {
              execOutput = { result: text }
            }

            if (!res.ok) {
              if (res.status >= 500) {
                recordFailure(endpointUrl.hostname)
              }
              throw new Error(`Endpoint returned ${res.status}`)
            }
          } finally {
            clearTimeout(timeoutId)
          }
        } else {
          execOutput = { received: currentInput, processed: true, result: `Executed ${action.name}` }
        }

        await prisma.execution.create({
          data: {
            status: "COMPLETED",
            input: currentInput as any,
            output: execOutput as any,
            userId: clerkAuth.userId,
            latency: Date.now() - start,
            skillId: ws.skill.id,
          },
        })
      } catch (e) {
        execStatus = "FAILED"
        execOutput = { error: e instanceof Error ? e.message : "Execution failed" }
      }

      results.push({
        skillName: ws.skill.name,
        actionName: action.name,
        status: execStatus,
        output: execOutput,
        latency: Date.now() - start,
      })

      currentInput = execOutput as Record<string, unknown>
    }

    return NextResponse.json({
      workflowId,
      workflowName: workflow.name,
      totalSkills: workflow.skills.length,
      results,
      status: results.every((r) => r.status === "COMPLETED") ? "COMPLETED" : "PARTIAL",
    })
  } catch (error) {
    console.error("POST /api/workflows/execute error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
