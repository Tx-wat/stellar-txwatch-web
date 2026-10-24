# stellar-txwatch-web

Web dashboard for Stellar TxWatch - register contracts and manage real-time alert rules.

Part of the [Tx-wat](https://github.com/Tx-wat) GitHub org.

[![CI](https://github.com/Tx-wat/stellar-txwatch-web/actions/workflows/ci.yml/badge.svg)](https://github.com/Tx-wat/stellar-txwatch-web/actions/workflows/ci.yml)

## What it does

- **Register** Soroban contracts on Mainnet, Testnet, or Futurenet
- **Configure** alert rules: large transfers, function calls, admin actions, failed transactions
- **Receive** instant webhook payloads when rules fire
- **Monitor** delivery history and alert logs per contract

## Tech stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Wallet | `@stellar/freighter-api` (Stellar identity) |
| Blockchain | `@stellar/stellar-sdk` (StrKey, Horizon, Soroban RPC, contract spec) |

## Getting started

```bash
git clone https://github.com/Tx-wat/stellar-txwatch-web
cd stellar-txwatch-web
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Browser & wallet requirements

- **Browsers**: Chrome, Firefox, Edge, Safari (latest versions)
- **Wallet**: [Freighter extension](https://www.freighter.app/) required for contract registration and transaction signing
  - Install from [freighter.app](https://www.freighter.app/)
  - Supported on Chrome, Firefox, and Edge
  - Must be connected to the same network (Mainnet, Testnet, or Futurenet) as the contract you're registering

## Project structure

```
.github/
  workflows/ci.yml            # Lint, type-check and build on every push/PR to main
  ISSUE_TEMPLATE/             # Bug report, feature request and docs issue forms
  pull_request_template.md    # PR summary, linked issue and test checklist
  CODEOWNERS                  # Area-based review routing
app/
  layout.tsx                  # Root layout: nav, wallet status, global styles
  page.tsx                    # Landing page
  not-found.tsx               # 404 page
  globals.css                 # Tailwind base styles
  dashboard/
    page.tsx                  # Stats + contract grid
    loading.tsx               # Dashboard loading skeleton
  contracts/
    page.tsx                  # Contract list with search and pagination
    loading.tsx               # Contract list loading skeleton
    new/page.tsx              # Add contract form + webhook test
    [id]/page.tsx             # Contract detail + alert history
components/
  ActiveRulesList.tsx         # Active alert rules on the detail page
  AlertHeatmap.tsx            # Contract activity heatmap
  AlertRuleBadge.tsx          # Rule type display badge
  BulkActionBar.tsx           # Contract list bulk actions
  ContractCard.tsx            # Contract summary card
  ContractListToolbar.tsx     # Contract list search/filter/sort controls
  CopyButton.tsx              # Clipboard copy button
  EmptyState.tsx              # Empty list placeholder
  FreighterConnect.tsx        # Wallet connection button
  MetadataSection.tsx         # Labelled metadata tile on the detail page
  MobileNav.tsx               # Mobile navigation drawer
  NetworkBadge.tsx            # Mainnet/Testnet/Futurenet badge
  NetworkEditField.tsx        # Inline network selector with save/cancel
  RuleBuilder.tsx             # Alert rule configuration UI
  SortToggle.tsx              # Asc/desc sort direction toggle
  Toast.tsx                   # Auto-dismissing success/error notification
  WalletStatusBadge.tsx       # Freighter connected/disconnected indicator
  WebhookLog.tsx              # Webhook delivery history table
  WebhookLogCard.tsx          # Single webhook delivery entry card
  ui/
    Button.tsx                # Shared button with variants
docs/
  FREIGHTER_INTEGRATION.md    # Freighter wallet integration guide
  MOCK_API_STRATEGY.md        # Mock vs. real API mode strategy
  images/                     # README screenshots and demo GIF
hooks/
  useAlerts.ts                # Alert history per contract, today count, last alert times
  useAlertsWebSocket.ts       # Live alert stream into storage
  useAnalytics.ts             # No-op analytics hook (trackEvent stub)
  useContractListState.ts     # Contract list search/filter/sort/pagination/selection
  useContracts.ts             # Contract state
  useFreighter.ts             # Freighter connection state + actions
  useFreighterConnection.ts   # Freighter connection check with loading state
  useNewContractForm.ts       # Add-contract form state and submission
  useSortedLog.ts             # Sort log entries by timestamp with a toggle
  useWallet.ts                # Minimal connected wallet public key hook
  useWebSocket.ts             # Reconnecting WebSocket wrapper
lib/
  api.ts                      # Fetch wrapper + test webhook
  contractSort.ts             # Deterministic contract ordering (network, label, id)
  exportStorage.ts            # Export/import contracts as a JSON snapshot
  format.ts                   # Date and rule summary formatters
  formatAmount.ts             # Asset amount formatting (XLM, USDC, stroops)
  stellar.ts                  # Horizon/Soroban URLs, validation, explorer links
  storage.ts                  # localStorage contract and alert registry
  storageKeys.ts              # All browser storage key names
  storageLogger.ts            # Safe JSON parsing with storage error hooks
  __tests__/                  # Unit tests for lib modules
types/
  index.ts                    # Shared types (mirrors core Rust structs)
__tests__/                    # Component, page and integration tests (Vitest)
```

> Keep this tree in sync when adding, moving or removing files — the PR checklist asks you to confirm it.

## Architecture overview

### Page flow

The dashboard follows a standard Next.js App Router structure:

1. **Landing page** (`app/page.tsx`) — unauthenticated entry point with feature overview
2. **Dashboard** (`app/dashboard/page.tsx`) — authenticated view showing contract stats and grid
3. **Contract list** (`app/contracts/page.tsx`) — all registered contracts
4. **Add contract** (`app/contracts/new/page.tsx`) — registration form with Freighter signing
5. **Contract detail** (`app/contracts/[id]/page.tsx`) — alert rules, webhook logs, and history

### Storage layer

- **localStorage** (`lib/storage.ts`) — persists registered contracts and user preferences
- **Freighter wallet** — stores user identity and network selection
- **Backend API** (`lib/api.ts`) — optional txwatch-core integration for webhook delivery logs

### Stellar integration boundaries

The app integrates with Stellar at three points:

1. **Horizon REST API** — fetch account balances, transaction history, and network status
2. **Soroban RPC** — contract simulation, ledger entry reads, and address validation
3. **Freighter wallet** — user authentication, transaction signing, and network switching

See [Stellar integration](#stellar-integration) for implementation details.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values you need. Every variable is optional; with none set, the dashboard runs in localStorage-only mode against the public Stellar endpoints.

| Variable | Required | Default | Example | Scope | Description |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `''` (empty, localStorage-only mode) | `http://localhost:8000` | Build-time | Base URL of the [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) API. Prepended to every `apiFetch` call in `lib/api.ts`. |
| `NEXT_PUBLIC_HORIZON_URL` | No | Official Horizon URL for the selected network (see `HORIZON_URLS` in `lib/stellar.ts`) | `https://horizon-testnet.stellar.org` | Build-time | Override for the Horizon REST endpoint. |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | No | Official Soroban RPC URL for the selected network (see `SOROBAN_RPC_URLS` in `lib/stellar.ts`) | `https://soroban-testnet.stellar.org` | Build-time | Override for the Soroban RPC endpoint. |
| `WEBHOOK_TEST_URL` | No | Unset | `http://localhost:3001/webhooks` | Runtime | Local endpoint for testing webhook delivery, for example one of the receivers in [`examples/`](./examples). |
| `DEBUG_STORAGE` | No | `false` | `true` | Runtime | When `true`, `lib/storageLogger.ts` logs localStorage parse errors even when `NODE_ENV` is `production` (they are always logged in development). Because it is not a `NEXT_PUBLIC_*` variable, it only applies in Node contexts such as tests, not in the browser bundle. |
| `NODE_ENV` | No (set by Next.js) | `development` for `npm run dev`, `production` for `npm run build` / `npm start` | `production` | Runtime | Standard Node/Next.js environment flag. Do not set it manually in `.env.local`. |

### Build-time vs runtime

- **Build-time (`NEXT_PUBLIC_*`)**: Next.js inlines these values into the client JavaScript bundle when you run `npm run build`. Changing them requires a rebuild; restarting the server is not enough. They are visible to anyone who loads the page, so never put secrets in a `NEXT_PUBLIC_*` variable.
- **Runtime (everything else)**: read from `process.env` on the server when the code runs, and never exposed to the browser bundle. Changing them only requires restarting the process.

> **Note:** `NEXT_PUBLIC_HORIZON_URL`, `NEXT_PUBLIC_SOROBAN_RPC_URL` and `WEBHOOK_TEST_URL` are documented in `.env.example` but not yet read by the application code. The endpoints are currently taken from the constants in `lib/stellar.ts`.

## Stellar integration

This section documents how the dashboard integrates with the Stellar network and where to extend each layer.

### Network endpoints

`lib/stellar.ts` exports the Horizon REST and Soroban RPC base URLs for all three networks:

```ts
import { HORIZON_URLS, SOROBAN_RPC_URLS } from '@/lib/stellar'

// Horizon REST - account balances, transaction history
HORIZON_URLS.mainnet    // https://horizon.stellar.org
HORIZON_URLS.testnet    // https://horizon-testnet.stellar.org
HORIZON_URLS.futurenet  // https://horizon-futurenet.stellar.org

// Soroban JSON-RPC - contract simulation, ledger entries
SOROBAN_RPC_URLS.mainnet  // https://mainnet.stellar.validationcloud.io/v1/<key>
SOROBAN_RPC_URLS.testnet  // https://soroban-testnet.stellar.org
```

### Stellar SDK usage

`@stellar/stellar-sdk` is a real runtime dependency (not just documentation). It is used for:

- **StrKey validation** — `StrKey.isValidContract` / `StrKey.isValidEd25519PublicKey` back `isValidContractId` in `lib/stellar.ts`
- **Horizon queries** — `Horizon.Server` for account balances and transaction history
- **Soroban RPC** — `SorobanRpc.Server` for contract simulation and ledger entry reads
- **Contract spec parsing** — `contract.Spec` parses the contract WASM spec so `RuleBuilder` can autocomplete exported function names for `FunctionCalled` / `AdminFunctionCalled` rules

Imports are named (e.g. `import { StrKey, Horizon } from '@stellar/stellar-sdk'`) so the bundler can tree-shake unused modules; only the modules listed above ship to the client.

**Bundle size:** before this change the dependency was unused and contributed ~0 KB to the client bundle (it was still installed). After wiring it up, the client bundle grew by **~X KB gzipped** (measured with `npm run build` before/after). The SDK is only imported from `lib/stellar.ts` and the `RuleBuilder` spec loader, both of which are client-side; the spec loader is dynamically imported so it is not part of the initial bundle.

### Querying Horizon

Use the `@stellar/stellar-sdk` `Horizon.Server` to fetch on-chain data. Add new queries to `lib/stellar.ts`:

```ts
import { Horizon } from '@stellar/stellar-sdk'
import { HORIZON_URLS } from '@/lib/stellar'
import { Network } from '@/types'

export function getHorizonServer(network: Network) {
  return new Horizon.Server(HORIZON_URLS[network])
}

// Fetch recent transactions for a contract account
export async function fetchContractTransactions(network: Network, contractId: string) {
  const server = getHorizonServer(network)
  const { records } = await server
    .transactions()
    .forAccount(contractId)
    .order('desc')
    .limit(20)
    .call()
  return records
}
```

### Querying Soroban RPC

Use `SorobanRpc.Server` to read contract storage or simulate invocations:

```ts
import { SorobanRpc, Contract, xdr } from '@stellar/stellar-sdk'
import { SOROBAN_RPC_URLS } from '@/lib/stellar'
import { Network } from '@/types'

export function getSorobanServer(network: Network) {
  return new SorobanRpc.Server(SOROBAN_RPC_URLS[network])
}

// Read a contract ledger entry by key
export async function getContractData(
  network: Network,
  contractId: string,
  key: xdr.ScVal
) {
  const server = getSorobanServer(network)
  const contract = new Contract(contractId)
  return server.getContractData(contract, key, SorobanRpc.Durability.Persistent)
}
```

### Freighter wallet

`components/FreighterConnect.tsx` uses the official [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) package rather than reaching into `window.freighter` directly. The package handles extension detection, permission requests, and network details. To get the connected public key anywhere in the app:

```ts
import { isConnected, isAllowed, getPublicKey, getNetworkDetails } from '@stellar/freighter-api'

// Distinguish the three failure states explicitly
const { isConnected: installed } = await isConnected()   // extension not installed
if (!installed) { /* show "Install Freighter" */ }

const { isAllowed: allowed } = await isAllowed()         // permission not granted
if (!allowed) { /* show "Connect" prompt */ }

// getPublicKey rejects with a "locked" error when the wallet is locked
const { publicKey } = await getPublicKey()
const { network, networkPassphrase } = await getNetworkDetails() // e.g. "TESTNET"
```

To sign and submit a transaction:

```ts
import { signTransaction } from '@stellar/freighter-api'
import { Networks } from '@stellar/stellar-sdk'

// Build your XDR transaction, then:
const { signedTxXdr, error } = await signTransaction(txXdr, {
  networkPassphrase: Networks.TESTNET,
})
```

See [`docs/FREIGHTER_INTEGRATION.md`](./docs/FREIGHTER_INTEGRATION.md) for the full state machine (not installed / not allowed / locked / connected) and the network mismatch check.

### Contract ID validation

All contract IDs are validated against the Soroban address format before saving, using `StrKey` from `@stellar/stellar-sdk`:

```ts
import { isValidContractId } from '@/lib/stellar'

isValidContractId('CAAAA...') // true — valid StrKey contract address
isValidContractId('GAAAA...') // false — that's a Stellar account address
```

### Function name autocomplete

`RuleBuilder` fetches the contract WASM via Soroban RPC and parses its spec with `contract.Spec` to list exported functions. `FunctionCalled` and `AdminFunctionCalled` inputs offer a datalist of those names and warn when the entered name isn't in the spec. If the spec can't be loaded (contract not found, RPC error), the inputs fall back to free text.

### Stellar Expert links

Alert history rows link directly to Stellar Expert for transaction inspection:

```ts
import { explorerTxUrl, explorerContractUrl } from '@/lib/stellar'

explorerTxUrl('testnet', txHash)         // https://stellar.expert/explorer/testnet/tx/<hash>
explorerContractUrl('mainnet', contractId) // https://stellar.expert/explorer/public/contract/<id>
```

### Extending alert rules

Alert rules are defined in `types/index.ts` and must stay in sync with the Rust structs in [`stellar-txwatch-core`](https://github.com/Tx-wat/stellar-txwatch-core). To add a new rule type:

1. Add the variant to `AlertRuleType` in `types/index.ts`
2. Add a label and colour to `AlertRuleBadge.tsx`
3. Add conditional input fields in `RuleBuilder.tsx`
4. Add the matching variant to the Rust `AlertRule` enum in the core engine

### Webhook payload shape

When a rule fires, the core engine POSTs this JSON to the registered webhook URL:

```json
{
  "label": "My DEX Contract",
  "contract_id": "CAAAA...",
  "network": "testnet",
  "rule_triggered": "LargeTransfer",
  "transaction_hash": "abc123...",
  "function_name": "transfer",
  "amount": 50000,
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon-testnet.stellar.org/transactions/abc123"
}
```

The `Test` button on the Add Contract form sends a mock payload to your endpoint so you can verify delivery before going live.

## Error tracking (Sentry)

Client-side errors — such as localStorage parse failures and Freighter
exceptions — are reported to [Sentry](https://sentry.io) when
`NEXT_PUBLIC_SENTRY_DSN` is set. If the variable is unset, error tracking is
completely disabled and the app behaves as before.

- The `storageLogger` error handler forwards localStorage parse errors to Sentry
- Public keys and webhook URLs are scrubbed from events before they are sent (PII scrubbing)
- Source maps are uploaded in CI only when the `SENTRY_AUTH_TOKEN` secret is present

## CI

Every push and pull request to `main` runs the full CI pipeline via GitHub Actions:

```
Lint -> Type-check -> Build
```

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

### Bundle size

Pull requests also run a **Bundle size** job that builds the app, comments the first-load JS diff against `main` on the PR, and fails if any route exceeds its budget in [`.size-limit.cjs`](./.size-limit.cjs).

```bash
npm run analyze   # ANALYZE=true next build — opens the bundle analyzer report
npm run build && npm run size   # check budgets locally
```

## Roadmap

### Near-term

- [ ] Multi-signature contract support
- [ ] Advanced filtering and search for alert history
- [ ] Export alert logs as CSV

### Medium-term

- [ ] Real-time WebSocket updates for alert delivery
- [ ] Custom alert rule templates
- [ ] Batch contract registration

### Future

- [ ] Mobile app (React Native)
- [ ] Alert aggregation across multiple contracts
- [ ] Integration with external notification services (Slack, Discord, email)

## Sister repos

- [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) - Rust monitoring engine
- [stellar-txwatch-contracts](https://github.com/Tx-wat/stellar-txwatch-contracts) - Soroban smart contracts

## Data Persistence

The current app stores all contracts and alert rules in **browser localStorage** rather than a backend database. This means:

- Contracts and rules are persisted locally per browser/device
- Data is not synced across devices or browsers
- Clearing browser storage will delete all saved contracts and rules
- No server-side persistence layer is currently implemented

When a backend API is integrated (via `NEXT_PUBLIC_API_URL`), the app will transition to server-side persistence.

## API Limitations

The dashboard currently operates in two modes:

### Mock/Local Mode (Default)
- Contract registration and alert rule configuration are stored locally
- Webhook testing uses mock payloads
- No real-time monitoring occurs without a backend

### API Mode (When `NEXT_PUBLIC_API_URL` is set)
- Contracts and rules sync with the txwatch-core backend
- Real webhook delivery and monitoring depend on the backend service
- Requires the [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) API running

**Note:** The dashboard itself does not monitor transactions. Monitoring is performed by the core engine. The dashboard is a configuration and monitoring UI only.

## Screenshots

> All captures use the default dark theme. See [`docs/images/README.md`](./docs/images/README.md) for how to capture and optimise new images.

### Demo

Registering a contract and sending a test webhook:

![Demo: registering a contract and testing a webhook](./docs/images/demo.gif)

### Dashboard

Registered contracts in a grid with summary cards showing contract ID, network and alert rule count.

![Dashboard](./docs/images/dashboard.png)

### Add Contract

Enter a contract ID (validated against the Soroban address format), pick a network, configure alert rules and test webhook delivery before going live.

![Add contract form](./docs/images/add-contract.png)

### Contract Detail

Contract metadata, configured alert rules with type badges, and webhook delivery history with transaction links to Stellar Expert.

![Contract detail](./docs/images/contract-detail.png)

## Bug Reports & Feature Requests

When reporting issues or requesting features, please include:

### For Bug Reports
- Steps to reproduce the issue
- Expected vs. actual behavior
- Browser and OS information
- Screenshots or error messages if applicable
- Whether the issue occurs in mock mode or with a backend API

### For Feature Requests
- Clear description of the desired functionality
- Use case or problem it solves
- Suggested implementation approach (if any)
- Whether it's a UI/UX enhancement or backend integration

Please check existing issues before opening a new one to avoid duplicates.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
