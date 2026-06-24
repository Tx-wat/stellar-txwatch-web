import { NextResponse } from 'next/server'
import type { DependencyStatus, HealthStatus } from '@/types'

const TIMEOUT_MS = 5000

async function checkDependency(
  url: string
): Promise<{ status: DependencyStatus; latencyMs?: number; error?: string }> {
  if (!url) return { status: 'unknown', error: 'endpoint not configured' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const start = Date.now()

  try {
    const res = await fetch(url, { signal: controller.signal })
    const latencyMs = Date.now() - start
    return res.ok
      ? { status: 'ok', latencyMs }
      : { status: 'error', latencyMs, error: `HTTP ${res.status}` }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unreachable'
    return { status: 'error', latencyMs: Date.now() - start, error }
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''

  const [db, redis] = await Promise.all([
    checkDependency(baseUrl ? `${baseUrl}/health/db` : ''),
    checkDependency(baseUrl ? `${baseUrl}/health/redis` : ''),
  ])

  const statuses = [db.status, redis.status]
  const overall: HealthStatus['status'] =
    statuses.every((s) => s === 'ok')
      ? 'healthy'
      : statuses.some((s) => s === 'error')
      ? statuses.every((s) => s === 'error')
        ? 'unhealthy'
        : 'degraded'
      : 'healthy'

  const body: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    dependencies: { db, redis },
  }

  const httpStatus = overall === 'healthy' ? 200 : overall === 'degraded' ? 207 : 503
  return NextResponse.json(body, { status: httpStatus })
}
