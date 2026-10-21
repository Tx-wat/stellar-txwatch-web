# File Ownership & Area Map

This document maps key files and directories to their functional areas, helping contributors understand which files to modify for specific features.

## Directory Structure & Ownership

### `/app` — Pages & Routing

| File/Directory | Responsibility |
|---|---|
| `app/page.tsx` | Landing page — hero, feature overview, CTA |
| `app/layout.tsx` | Root layout — navigation, theme provider, global styles |
| `app/dashboard/page.tsx` | Dashboard — contract stats, grid view |
| `app/contracts/page.tsx` | Contract list — search, filter, pagination |
| `app/contracts/new/page.tsx` | Add contract form — validation, registration, webhook test |
| `app/contracts/[id]/page.tsx` | Contract detail — alert rules, webhook history, settings |
| `app/not-found.tsx` | 404 error page |

### `/components` — Reusable UI Components

| File | Responsibility |
|---|---|
| `FreighterConnect.tsx` | Wallet connection — Freighter integration, public key management |
| `ContractCard.tsx` | Contract summary card — displays contract info, network badge |
| `RuleBuilder.tsx` | Alert rule configuration — form inputs for all rule types |
| `AlertRuleBadge.tsx` | Rule type display — badge styling and labels for each rule type |
| `WebhookLog.tsx` | Webhook delivery history table — status, timestamps, retry info |
| `NetworkBadge.tsx` | Network indicator — Mainnet/Testnet/Futurenet badge |
| `CopyButton.tsx` | Clipboard utility — copy contract ID, transaction hash |
| `MobileNav.tsx` | Mobile navigation drawer — responsive menu |
| `EmptyState.tsx` | Empty list placeholder — no contracts, no rules, no history |

### `/lib` — Business Logic & Utilities

| File | Responsibility |
|---|---|
| `stellar.ts` | Stellar integration — Horizon URLs, Soroban RPC, contract validation, explorer links |
| `storage.ts` | localStorage persistence — contract registry, settings, cache |
| `api.ts` | Backend communication — fetch wrapper, webhook test, API calls |
| `useContracts.ts` | React hook — contract state management, CRUD operations |

### `/types` — TypeScript Definitions

| File | Responsibility |
|---|---|
| `types/index.ts` | Shared types — mirrors Rust structs from stellar-txwatch-core (Contract, AlertRule, WebhookLog, etc.) |

### Root Configuration Files

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts, project metadata |
| `tsconfig.json` | TypeScript configuration |
| `tailwind.config.ts` | Tailwind CSS theme, colors, spacing |
| `next.config.mjs` | Next.js build configuration |
| `postcss.config.mjs` | PostCSS plugins (Tailwind) |
| `.eslintrc.json` | ESLint rules for code quality |
| `.env.example` | Environment variable template |

### Documentation

| File | Responsibility |
|---|---|
| `README.md` | Project overview, setup, tech stack, integration guide |
| `CONTRIBUTING.md` | Contribution guidelines, branch naming, commit style, PR checklist |
| `GLOSSARY.md` | Terminology definitions for new contributors |
| `LICENSE` | MIT license |

## Feature Areas & Key Files

### Wallet Integration

**Primary**: `components/FreighterConnect.tsx`  
**Secondary**: `lib/stellar.ts` (Freighter API helpers)  
**Related**: `app/layout.tsx` (provider setup)

### Contract Management

**Primary**: `lib/storage.ts` (persistence), `lib/api.ts` (backend calls)  
**Secondary**: `app/contracts/new/page.tsx` (registration form), `app/contracts/[id]/page.tsx` (detail view)  
**Related**: `components/ContractCard.tsx`, `types/index.ts`

### Alert Rules

**Primary**: `components/RuleBuilder.tsx` (UI), `types/index.ts` (types)  
**Secondary**: `app/contracts/[id]/page.tsx` (rule management)  
**Related**: `components/AlertRuleBadge.tsx` (display)

### Webhook Delivery

**Primary**: `components/WebhookLog.tsx` (history display), `lib/api.ts` (test webhook)  
**Secondary**: `app/contracts/[id]/page.tsx` (webhook settings)  
**Related**: `types/index.ts` (WebhookLog type)

### Stellar Network Integration

**Primary**: `lib/stellar.ts` (all network queries)  
**Secondary**: `lib/api.ts` (API calls), `types/index.ts` (network types)  
**Related**: `components/NetworkBadge.tsx` (display)

## When to Modify Each Area

| Task | Files to Change |
|---|---|
| Add new alert rule type | `types/index.ts`, `components/RuleBuilder.tsx`, `components/AlertRuleBadge.tsx` |
| Add new page | `app/*/page.tsx`, update `components/MobileNav.tsx` |
| Add new component | Create in `/components`, export from component file |
| Add Stellar query | Add function to `lib/stellar.ts` |
| Add backend API call | Add function to `lib/api.ts` |
| Add type definition | Add to `types/index.ts` (keep in sync with Rust core) |
| Update styling | `tailwind.config.ts` or component `className` |
| Update environment setup | `.env.example`, `CONTRIBUTING.md` |

## Dependency Graph

```
Pages (app/*) 
  ↓
Components (components/*)
  ↓
Business Logic (lib/*)
  ↓
Types (types/index.ts)
  ↓
External APIs (Stellar, Backend)
```

Most changes flow from types → logic → components → pages. When adding a feature:

1. Define types in `types/index.ts`
2. Add logic to `lib/stellar.ts` or `lib/api.ts`
3. Create/update components in `/components`
4. Wire into pages in `/app`

## LocalStorage Schema & Persistence (`lib/storage.ts`)

The web client persists user data in the browser's `localStorage`. All keys are prefixed with `txwatch_` to avoid collisions with other applications on the same origin.

### Storage Keys

| Key | TypeScript Type | Description |
|---|---|---|
| `txwatch_contracts` | `WatchedContract[]` | Monitored smart contracts including contract ID, network, alert rules, and webhook endpoint. |
| `txwatch_alerts` | `AlertPayload[]` | Historical and simulated alert events across all monitored contracts. |
| `txwatch_storage_version` | `number` (serialized string) | Tracks the active schema version of the stored data for forward migrations. |

### Schema Versioning & `CURRENT_STORAGE_VERSION`

The schema version is managed via `CURRENT_STORAGE_VERSION` in `lib/storage.ts` (currently `1`).

- **Version retrieval**: `getStorageVersion()` reads `txwatch_storage_version` from `localStorage` (defaults to `0` if uninitialized).
- **When to increment**: Increment `CURRENT_STORAGE_VERSION` whenever a breaking schema change is introduced (e.g., renaming fields, restructuring nested alert rules, or migrating stored keys).
- **Running migrations**: `migrateStorage(migrations)` takes a dictionary mapping target version numbers to migration handlers. It iterates from `currentVersion + 1` up to `CURRENT_STORAGE_VERSION`, executing each handler in order, and then updates `txwatch_storage_version`.

### How to Write a New Migration Function

When modifying persistent data structures:

1. Increment `CURRENT_STORAGE_VERSION` in `lib/storage.ts`:
   ```ts
   const CURRENT_STORAGE_VERSION = 2
   ```

2. Implement a migration step that loads, transforms, and saves the data:
   ```ts
   migrateStorage({
     2: () => {
       const contracts = load<any>('txwatch_contracts')
       const migrated = contracts.map((c) => ({
         ...c,
         new_field: c.old_field ?? 'default_value',
       }))
       save('txwatch_contracts', migrated)
     },
   })
   ```

3. Call `migrateStorage` during application startup or within the root provider to ensure stored records match the expected schema before UI components read them.

### Retention & Quota Policies

To prevent exceeding browser storage quotas (~5MB standard limit), `lib/storage.ts` enforces the following constraints:

- **Storage Quota Limit (`STORAGE_QUOTA_BYTES`)**: Set to `5 * 1024 * 1024` (5MB). The utility calculates the combined character length of all keys and values via `getStorageSize()`.
- **Per-Contract Alert Cap (`MAX_ALERTS_PER_CONTRACT`)**: Capped at `500` alerts per contract. When `addAlert()` adds a new record, older alerts exceeding this limit for that contract ID are dropped.
- **Alert Retention Window (`ALERTS_RETENTION_DAYS`)**: Alerts older than `90` days are automatically purged by `pruneOldAlerts()` whenever contracts are saved.
- **Emergency Quota Trimming**: If total storage usage exceeds 90% of `STORAGE_QUOTA_BYTES` (4.5MB), `save()` trims `txwatch_alerts` to keep only entries from the last 30 days (`Date.now() - 30 * 24 * 60 * 60 * 1000`).
