# Testing

Guide for running and writing tests in `stellar-txwatch-web`.

The project uses [Vitest](https://vitest.dev/) for unit and component tests. Playwright is planned for
end-to-end tests (see [E2E tests](#e2e-tests-playwright) below).

## Requirements

- Node.js 18+ (CI uses Node 20)
- A one-time `npm install` in the repo root

```bash
npm install
```

## Running tests

| Command | What it does |
|---|---|
| `npm test` | Runs the whole suite once and exits (`vitest --run`) |
| `npm run test:watch` | Watch mode — re-runs affected files on change (`vitest`) |
| `npx vitest run lib/__tests__/storage.test.ts` | Runs a single test file |
| `npx vitest run -t "deleteContract"` | Runs only the tests whose name matches |
| `npx vitest run --coverage` | Coverage report (requires `npm i -D @vitest/coverage-v8`) |

`npm test` is the command CI should use — it never watches.

## Test configuration

All configuration lives in `vitest.config.ts`:

```ts
export default defineConfig({
  test: {
    environment: 'node',   // no DOM by default
    globals: true,         // describe / it / expect are global
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Two consequences:

- `@/lib/...` resolves to the repo root, so imports look like `@/lib/api`.
- The default environment is **node**, so `window` and `localStorage` do not exist. Tests that need
  them must create them (see [Mocking localStorage](#mocking-localstorage) and
  [Mocking `window.freighter`](#mocking-windowfreighter)).

## Where to add new tests

Tests are **never** co-located next to the source file. They always live in a `__tests__/` directory:
`lib/__tests__/` for the code in `lib/`, and the repo-root `__tests__/` for components and pages.

| Code under test | Test location | File naming |
|---|---|---|
| `lib/storage.ts` | `lib/__tests__/` | `lib/__tests__/storage.test.ts` |
| `lib/format.ts` | `lib/__tests__/` | `lib/__tests__/format.test.ts` |
| `components/ContractCard.tsx` | `__tests__/` (repo root) | `__tests__/ContractCard.test.tsx` |
| `app/contracts/page.tsx` | `__tests__/` (repo root) | `__tests__/ContractsPage.test.ts` |

Rules of thumb:

- Name the file after the module or component it covers: `<module>.test.ts` for plain TypeScript,
  `<Component>.test.tsx` for React components.
- Import the module under test with a relative path when the test sits in the same folder
  (`import { saveContract } from '../storage'`), and with the `@/` alias otherwise
  (`import { apiFetch } from '@/lib/api'`).
- Prefer explicit imports from `vitest` (`import { describe, it, expect } from 'vitest'`) — it keeps the
  file readable even though `globals: true` is on.
- One behaviour per `it()`. Name the test after the behaviour, not the function
  (`it('returns empty array when no contracts are saved')`).

## Unit tests

Unit tests cover the pure logic in `lib/` and run in the node environment with no setup:

```ts
import { describe, it, expect } from 'vitest'
import { formatAmount } from '@/lib/formatAmount'

describe('formatAmount', () => {
  it('formats an amount with the asset decimals', () => {
    expect(formatAmount('150.5', 'USDC')).toBe('150.50 USDC')
  })
})
```

## Mocking localStorage

`lib/storage.ts` reads and writes `localStorage`. In the node environment it is not available, so
tests must install a mock before importing the module under test.

The mock **must** expose `length` and `key(i)`: `lib/storage.ts` uses them to measure the used quota
(`getStorageSize()`), and without them the quota checks silently do nothing.

```ts
import { describe, it, expect, beforeEach } from 'vitest'

// Minimal localStorage mock for the node environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => localStorageMock.clear())
```

The same pattern is used in `lib/__tests__/storage.test.ts` and `lib/__tests__/dashboard.test.ts`.
`dashboard.test.ts` additionally sets `globalThis.window = globalThis` because some helpers read
`window.localStorage`.

## Mocking `window.freighter`

Freighter is a browser extension, so `window.freighter` only exists when the extension is installed.
Wallet-gated code must therefore be tested with a stubbed extension object.

In a DOM environment (jsdom) assign the stub to `window` and remove it afterwards:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const PUBLIC_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

beforeEach(() => {
  ;(window as unknown as { freighter: unknown }).freighter = {
    isConnected: vi.fn().mockResolvedValue(true),
    getPublicKey: vi.fn().mockResolvedValue(PUBLIC_KEY),
    getNetwork: vi.fn().mockResolvedValue('TESTNET'),
    signTransaction: vi.fn().mockResolvedValue('AAAA...signed-xdr'),
  }
})

afterEach(() => {
  delete (window as unknown as { freighter?: unknown }).freighter
})
```

To simulate a user rejecting the request, make the promise reject:

```ts
getPublicKey: vi.fn().mockRejectedValue(new Error('User rejected'))
```

In the node environment there is no `window` — define one first, then attach the stub to it:

```ts
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true })
;(globalThis as unknown as { freighter: unknown }).freighter = { ... }
```

> **Note**
> Vitest exposes the mock API as `vi.*`, not `jest.*`. Some older test files in the repo still call
> `jest.fn()` / `jest.clearAllMocks()`; that global does not exist under Vitest. Use `vi.fn()`,
> `vi.clearAllMocks()` and `vi.spyOn()` in new tests.

## Component tests

Component tests live in the root `__tests__/` folder and use `@testing-library/react`.

Two things are still missing before the component suite can run, both tracked in
[#302](https://github.com/Tx-wat/stellar-txwatch-web/issues/302):

1. `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom` are not
   listed in `devDependencies` yet.
2. Vitest runs in the `node` environment, so there is no DOM. Install `jsdom` and opt a file into it
   with a pragma at the top of the test file:

```ts
// @vitest-environment jsdom
```

Once that is in place, a component test looks like this:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import ContractCard from '@/components/ContractCard'

describe('ContractCard', () => {
  it('renders the contract label', () => {
    render(<ContractCard contract={mockContract} />)
    expect(screen.getByText('My Contract')).toBeInTheDocument()
  })
})
```

## E2E tests (Playwright)

Playwright is not set up yet. The infrastructure is tracked in
[#303](https://github.com/Tx-wat/stellar-txwatch-web/issues/303) and the first suite (add-contract form)
in [#279](https://github.com/Tx-wat/stellar-txwatch-web/issues/279).

When it lands, the expected layout is:

```
e2e/
  add-contract.spec.ts        # E2E specs
playwright.config.ts          # browser + webServer config
```

`playwright.config.ts` should start the dev server automatically and point the tests at it:

```ts
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

The Freighter extension is not available in a test browser, so the wallet must be stubbed before the
page loads, with `page.addInitScript`:

```ts
await page.addInitScript(() => {
  ;(window as unknown as { freighter: unknown }).freighter = {
    isConnected: async () => true,
    getPublicKey: async () => 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    getNetwork: async () => 'TESTNET',
    signTransaction: async (xdr: string) => xdr,
  }
})
```

`addInitScript` runs before any page script, so the stub is already in place when the app boots.

## Network calls in tests

Tests must never hit the real network. Stub `fetch` instead:

```ts
import { vi } from 'vitest'

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({}),
})
```

## CI

The current workflow (`.github/workflows/`) runs lint, type-check and build. Running `npm test` on
every pull request is tracked in
[#305](https://github.com/Tx-wat/stellar-txwatch-web/issues/305).

## Before opening a pull request

```bash
npm test          # the whole suite must pass
npx tsc --noEmit  # type-check (tests are TypeScript too)
npm run lint      # zero lint errors
```
