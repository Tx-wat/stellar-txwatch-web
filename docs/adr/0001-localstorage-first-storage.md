# ADR-0001: localStorage-first storage with optional core API

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** stellar-txwatch-web maintainers
- **Related:** [ADR-0002](./0002-freighter-only-wallet.md), [docs/MOCK_API_STRATEGY.md](../MOCK_API_STRATEGY.md), `lib/storage.ts`, `lib/api.ts`

## Context and Problem Statement

The dashboard lets users register Soroban contracts, attach alert rules and view alert history. The actual monitoring is done by [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core), a separate Rust service that is developed in parallel and is not always available, whether locally, in preview deployments or for contributors who only work on the UI.

Where should the dashboard persist contracts, rules and alerts so that it is usable with or without a running core API?

## Decision Drivers

- The UI must be fully usable with zero backend setup (`npm install && npm run dev`).
- Contributors should be able to work on the web repo without running Rust services.
- When a core API is available, the dashboard must be able to use it without a rewrite.
- No user accounts or authentication exist yet. Wallet identity is client-side only (see ADR-0002).
- Keep the stack simple: no extra database or server runtime inside the Next.js app.

## Considered Options

1. **localStorage-first, with an optional core API** configured via `NEXT_PUBLIC_API_URL`
2. **Core API only.** The dashboard does not work without a backend.
3. **A database owned by the Next.js app**, for example SQLite or Postgres behind Next.js route handlers.
4. **IndexedDB** as the local store.

## Decision Outcome

Chosen option: **1. localStorage-first, with an optional core API**. It is the only option that gives a zero-setup UI today while keeping a clear path to server persistence.

- All reads and writes go through `lib/storage.ts`, which owns the keys (`txwatch_contracts`, `txwatch_alerts`, `txwatch_storage_version`), schema versioning (`migrateStorage`), retention (90 days, at most 500 alerts per contract) and quota handling.
- Components and hooks (`useContracts`, `useAlerts`) never touch `localStorage` directly, so the backing store can be swapped behind the same functions.
- `lib/api.ts` provides `apiFetch`, which prefixes `NEXT_PUBLIC_API_URL`. When that variable is empty the app runs in local mode. When it is set, the API is the intended source of truth.
- The stored shapes are the same `types/index.ts` types that mirror core's Rust structs, so data can be synced or imported without translation. `lib/exportStorage.ts` provides a JSON snapshot for this.

### Consequences

- Good, because the dashboard works immediately after cloning, with no backend, database or credentials.
- Good, because UI development and testing are decoupled from core's release cadence. Tests run against a stubbed `localStorage`.
- Good, because the storage module is a single seam for a future API-backed implementation.
- Bad, because data is per browser and per device. It is not synced and is lost when site data is cleared.
- Bad, because localStorage is synchronous, roughly 5 MB, and string-only. This forces pruning and size checks in `lib/storage.ts`.
- Bad, because in local mode nothing actually monitors the chain. Alerts shown are test or mock data, which must be made clear to users (see README "API Limitations").
- Bad, because two modes mean two code paths to keep consistent, and switching from local to API mode needs a migration story for existing local data.

### Confirmation

- Code review: components must use `lib/storage.ts` / hooks rather than `window.localStorage`.
- `lib/__tests__/storage.test.ts` covers persistence, pruning and migration behaviour.

## Pros and Cons of the Options

### 1. localStorage-first with optional core API

- Good, because there is zero setup and it works offline.
- Good, because the API mode can be adopted incrementally.
- Bad, because local data is not durable or shareable.

### 2. Core API only

- Good, because there is a single source of truth and real monitoring from day one.
- Bad, because every contributor needs core running. That blocks UI work whenever core is unavailable or changing.
- Bad, because core would need authentication before any public deployment.

### 3. Database owned by the Next.js app

- Good, because data is durable and shared across devices.
- Bad, because it duplicates core's responsibility and creates two backends to keep in sync.
- Bad, because it requires hosting a database and an auth layer for the web app.

### 4. IndexedDB

- Good, because it is asynchronous and has a much larger quota.
- Bad, because the API is more complex for data that is currently small (tens of contracts, hundreds of alerts).
- Neutral, because it has the same per-device limitation as localStorage. It can be adopted later behind `lib/storage.ts` if quota becomes a problem.

## More Information

Revisit this decision when:

- core exposes stable, authenticated CRUD endpoints for contracts and rules, at which point API mode should become the default, or
- users regularly hit the localStorage quota, in which case consider IndexedDB behind the same module.
