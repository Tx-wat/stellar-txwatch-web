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
| Wallet | Freighter (Stellar identity) |
| Blockchain | `@stellar/stellar-sdk` + Horizon API |

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
app/
  page.tsx                  # Landing page
  dashboard/page.tsx        # Stats + contract grid
  contracts/
    page.tsx                # Contract list
    new/page.tsx            # Add contract form
    [id]/page.tsx           # Contract detail + alert history
components/
  ContractCard.tsx          # Contract summary card
  RuleBuilder.tsx           # Alert rule configuration UI
  WebhookLog.tsx            # Webhook delivery history table
  NetworkBadge.tsx          # Mainnet/Testnet/Futurenet badge
  AlertRuleBadge.tsx        # Rule type display badge
  FreighterConnect.tsx      # Wallet connection button
  CopyButton.tsx            # Clipboard copy utility
  MobileNav.tsx             # Mobile navigation drawer
  EmptyState.tsx            # Empty list placeholder
lib/
  stellar.ts                # Horizon + Soroban RPC helpers
  storage.ts                # localStorage contract registry
  api.ts                    # Fetch wrapper + test webhook
  useContracts.ts           # React hook for contract state
types/
  index.ts                  # Shared types (mirrors core Rust structs)
```

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

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the txwatch-core API (optional) |

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
SOROBAN_RPC_URLS.testnet  // https://soroban-testnet.stellar.org
```

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

`components/FreighterConnect.tsx` wraps the `window.freighter` browser extension API. To get the connected public key anywhere in the app:

```ts
// Read the key after connection (stored by FreighterConnect via onConnect callback)
const publicKey = await window.freighter?.getPublicKey()
const network   = await window.freighter?.getNetwork()   // e.g. "TESTNET"
```

To sign and submit a transaction:

```ts
import { Transaction, Networks } from '@stellar/stellar-sdk'

// Build your XDR transaction, then:
const signed = await window.freighter?.signTransaction(txXdr, {
  networkPassphrase: Networks.TESTNET,
})
```

### Contract ID validation

All contract IDs are validated against the Soroban address format before saving:

```ts
import { isValidContractId } from '@/lib/stellar'

isValidContractId('CAAAA...') // true — starts with C, 56 base-32 chars
isValidContractId('GAAAA...') // false — that's a Stellar account address
```

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

## CI

Every push and pull request to `main` runs the full CI pipeline via GitHub Actions:

```
Lint -> Type-check -> Build
```

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

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

### Landing Page
The landing page introduces the dashboard and provides quick access to wallet connection and contract registration.

### Dashboard
The dashboard displays registered contracts in a grid layout with summary cards showing contract ID, network, and alert rule count.

### Contract Detail
The contract detail page shows:
- Contract metadata (ID, network, registration date)
- Configured alert rules with type badges
- Webhook delivery history with transaction links to Stellar Expert

### Add Contract Form
The form allows users to:
- Enter a contract ID (validated against Soroban address format)
- Select the network (Mainnet, Testnet, Futurenet)
- Configure alert rules (large transfers, function calls, admin actions, failed transactions)
- Test webhook delivery before going live

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
