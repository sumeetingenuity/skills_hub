"use client"

import { useState, useEffect, useCallback } from "react"
import { SkillHubClient } from "./client"
import type {
  SkillSummary,
  CapabilityContract,
  ExecutionResult,
  AnalyticsData,
} from "./types"

const defaultClient = typeof window !== "undefined"
  ? new SkillHubClient({
      registryUrl: window.location.origin,
    })
  : null

function getClient(): SkillHubClient {
  if (!defaultClient) {
    throw new Error("SkillHubClient is not available server-side")
  }
  return defaultClient
}

export function useSkill(slugOrId: string) {
  const [skill, setSkill] = useState<SkillSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getClient()
      .getSkill(slugOrId)
      .then((data) => {
        if (!cancelled) {
          setSkill(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slugOrId])

  return { skill, loading, error }
}

export function useCapabilityContract(slugOrId: string) {
  const [contract, setContract] = useState<CapabilityContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getClient()
      .getCapabilityContract(slugOrId)
      .then((data) => {
        if (!cancelled) {
          setContract(data)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slugOrId])

  return { contract, loading, error }
}

export function useExecuteAction() {
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [executing, setExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (
      skillId: string,
      action: string,
      parameters?: Record<string, unknown>
    ) => {
      setExecuting(true)
      setError(null)

      try {
        const res = await getClient().executeAction({
          skillId,
          action,
          parameters,
        })
        setResult(res)
        return res
      } catch (err: any) {
        setError(err.message)
        return null
      } finally {
        setExecuting(false)
      }
    },
    []
  )

  return { execute, result, executing, error }
}

export function useSkillSearch() {
  const [results, setResults] = useState<SkillSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(
    async (
      query?: string,
      options?: {
        category?: string
        sort?: "newest" | "popularity" | "trust"
        page?: number
        limit?: number
      }
    ) => {
      setLoading(true)
      setError(null)

      try {
        const res = await getClient().searchSkills(query, options)
        setResults(res.skills)
        setTotal(res.total)
        return res
      } catch (err: any) {
        setError(err.message)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { results, total, loading, error, search }
}

export function useAnalytics(skillId: string, days?: number) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getClient()
      .getAnalytics(skillId, days)
      .then((analytics) => {
        if (!cancelled) {
          setData(analytics)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [skillId, days])

  return { data, loading, error }
}
