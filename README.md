# stellar-txwatch-web

Web dashboard for Stellar TxWatch — register contracts and manage real-time alert rules.

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

Install the [Freighter wallet extension](https://www.freighter.app/) to enable contract registration.

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

// Horizon REST — account balances, transaction history
HORIZON_URLS.mainnet    // https://horizon.stellar.org
HORIZON_URLS.testnet    // https://horizon-testnet.stellar.org
HORIZON_URLS.futurenet  // https://horizon-futurenet.stellar.org

// Soroban JSON-RPC — contract simulation, ledger entries
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
Lint  →  Type-check  →  Test  →  Build
```

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

## Testing

Use Vitest for utility and component tests:

```bash
npm test
npm run test:watch
```

## Sister repos

- [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) — Rust monitoring engine
- [stellar-txwatch-contracts](https://github.com/Tx-wat/stellar-txwatch-contracts) — Soroban smart contracts

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
