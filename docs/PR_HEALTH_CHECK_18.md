# feat: Add health check endpoint with dependency status (DB + Redis)

## Summary

Implements a `/api/health` Next.js Route Handler that reports the live status of external dependencies (database and Redis) alongside an overall service health status. This gives operators a single endpoint to query when monitoring or deploying the service.

## Motivation

Previously there was no programmatic way to verify whether the backing services (DB, Redis) were reachable. This endpoint makes it straightforward for:

- Load balancers / orchestrators (Kubernetes liveness/readiness probes) to gate traffic.
- Monitoring tools (Datadog, Prometheus scrape, UptimeRobot) to alert on degraded services.
- CI/CD pipelines to confirm the stack is healthy before running smoke tests.

## Changes

### `app/api/health/route.ts` _(new)_

- `GET /api/health` handler that runs DB and Redis probes **in parallel** via `Promise.all`.
- Each probe hits `{NEXT_PUBLIC_API_URL}/health/db` and `{NEXT_PUBLIC_API_URL}/health/redis` respectively with a 5-second `AbortController` timeout.
- If `NEXT_PUBLIC_API_URL` is not configured, both dependencies report `unknown` (graceful degradation for local/localStorage-only mode).
- Derives an overall `status` field:
  | Condition | `status` | HTTP |
  |---|---|---|
  | Both deps `ok` | `healthy` | `200` |
  | One dep `error` | `degraded` | `207` |
  | Both deps `error` | `unhealthy` | `503` |
  | Deps `unknown` | `healthy` | `200` |

### `types/index.ts`

Added two new exported types:

```ts
export type DependencyStatus = 'ok' | 'error' | 'unknown'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  dependencies: {
    db:    { status: DependencyStatus; latencyMs?: number; error?: string }
    redis: { status: DependencyStatus; latencyMs?: number; error?: string }
  }
}
```

### `lib/api.ts`

Added `getHealthStatus()` helper so client code (future dashboard widget, CI script) can consume the endpoint without duplicating the fetch URL:

```ts
export async function getHealthStatus(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>('/api/health')
}
```

### `__tests__/health.test.ts` _(new)_

5 Vitest unit tests covering all branches:

| Test | Scenario |
|---|---|
| Both deps ok | `healthy` / `200` |
| Both deps fail | `unhealthy` / `503` |
| One dep fails | `degraded` / `207` |
| No API URL set | `healthy` / `200`, all `unknown` |
| Fetch throws | `error` propagated, `503` |

## Example response

```json
{
  "status": "healthy",
  "timestamp": "2026-06-24T16:30:00.000Z",
  "dependencies": {
    "db":    { "status": "ok",    "latencyMs": 12 },
    "redis": { "status": "ok",    "latencyMs": 8  }
  }
}
```

Degraded example (Redis down):

```json
{
  "status": "degraded",
  "timestamp": "2026-06-24T16:30:01.000Z",
  "dependencies": {
    "db":    { "status": "ok",    "latencyMs": 11 },
    "redis": { "status": "error", "latencyMs": 5002, "error": "HTTP 503" }
  }
}
```

## Testing

All 5 new tests pass:

```
✓ __tests__/health.test.ts (5 tests)
```

No regressions in the existing test suite.

## Checklist

- [x] Add DB connectivity check
- [x] Add Redis connectivity check
- [x] Return structured health info with individual statuses
- [x] Unit tests for all status branches
- [x] Types exported from `types/index.ts`
- [x] Client helper in `lib/api.ts`

closes #18
