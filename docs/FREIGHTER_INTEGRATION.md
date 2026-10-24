# Freighter Wallet Integration

This guide explains how the dashboard integrates with the Freighter wallet extension for Stellar identity and transaction signing.

## Overview

Freighter is a browser extension that manages Stellar keypairs and signs transactions. The dashboard uses it to:
- Authenticate users (get their public key)
- Verify the user's current network (Mainnet, Testnet, Futurenet)
- Sign and submit transactions to the Stellar network

## Freighter API Package

The dashboard talks to Freighter through the official [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) package rather than the injected `window.freighter` global. The package handles extension detection, permission requests and error reporting consistently across browsers.

Install it with:

```bash
npm install @stellar/freighter-api
```

The methods used by the dashboard are:

```ts
import {
  isConnected,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
  signTransaction,
} from '@stellar/freighter-api'

isConnected(): Promise<{ isConnected: boolean; error?: FreighterApiError }>
requestAccess(): Promise<{ address: string; error?: FreighterApiError }>
getPublicKey(): Promise<{ publicKey: string; error?: FreighterApiError }>
getNetworkDetails(): Promise<{
  network: string
  networkUrl: string
  networkPassphrase: string
  error?: FreighterApiError
}>
signTransaction(
  txXdr: string,
  options: { networkPassphrase: string; address?: string }
): Promise<{ signedTxXdr: string; signerAddress: string; error?: FreighterApiError }>
```

Every call returns a result object. When `error` is present the call failed; the `error.code` values used by the dashboard are `NOT_INSTALLED`, `NOT_ALLOWED` and `LOCKED`.

## Connection Flow

### 1. Check if Freighter is installed

```ts
const { isConnected: installed, error } = await isConnected()

if (error?.code === 'NOT_INSTALLED') {
  // Extension not installed — prompt user to install
  window.open('https://www.freighter.app/', '_blank')
}
```

### 2. Check if already connected

```ts
const { isConnected: connected } = await isConnected()
if (connected) {
  const { publicKey } = await getPublicKey()
  // User is already connected
}
```

### 3. Request connection

```ts
const { address, error } = await requestAccess()

if (error?.code === 'NOT_ALLOWED') {
  // User rejected the connection request
} else if (error?.code === 'LOCKED') {
  // Freighter is locked — ask the user to unlock it
} else if (address) {
  // User approved connection
}
```

## Getting User Info

After connection, retrieve the user's public key and network details:

```ts
const { publicKey } = await getPublicKey()
// e.g. "GAAAA..."

const { network, networkPassphrase } = await getNetworkDetails()
// network: e.g. "TESTNET", "PUBLIC", "FUTURENET"
// networkPassphrase: e.g. "Test SDF Network ; September 2015"
```

## Network Passphrases

When building and signing transactions, you must pass the exact network passphrase for the target Stellar network. `@stellar/stellar-sdk` provides standard constants:

| Network | Network Constant | Passphrase String |
|---|---|---|
| Mainnet (`mainnet` / `PUBLIC`) | `Networks.PUBLIC` | `Public Global Stellar Network ; September 2015` |
| Testnet (`testnet` / `TESTNET`) | `Networks.TESTNET` | `Test SDF Network ; September 2015` |
| Futurenet (`futurenet` / `FUTURENET`) | `Networks.FUTURENET` | `Test SDF Future Network ; October 2022` |

Helper to resolve passphrase by network name:

```ts
import { Networks } from '@stellar/stellar-sdk'
import { Network } from '@/types'

export function getNetworkPassphrase(network: Network): string {
  switch (network) {
    case 'mainnet':
      return Networks.PUBLIC
    case 'testnet':
      return Networks.TESTNET
    case 'futurenet':
      return Networks.FUTURENET
    default:
      return Networks.TESTNET
  }
}
```

## Signing and Submitting Transactions

Here is a complete, end-to-end example demonstrating how to construct a transaction, request a signature through Freighter, and submit the signed envelope via `Horizon.Server.submitTransaction`:

```ts
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
} from '@stellar/stellar-sdk'
import { HORIZON_URLS } from '@/lib/stellar'
import { Network } from '@/types'

export async function buildSignAndSubmitTransaction({
  network = 'testnet',
  destination,
  amount,
}: {
  network: Network
  destination: string
  amount: string
}) {
  const horizonUrl = HORIZON_URLS[network]
  const server = new Horizon.Server(horizonUrl)

  // 1. Resolve network passphrase
  const networkPassphrase =
    network === 'mainnet'
      ? Networks.PUBLIC
      : network === 'futurenet'
      ? Networks.FUTURENET
      : Networks.TESTNET

  // 2. Validate wallet presence
  if (typeof window === 'undefined' || !window.freighter) {
    throw new Error('Freighter extension is not installed.')
  }

  const isConnected = await window.freighter.isConnected()
  if (!isConnected) {
    throw new Error('Freighter wallet is not connected.')
  }

  // 3. Retrieve user public key & load account state from Horizon
  const publicKey = await window.freighter.getPublicKey()
  let sourceAccount
  try {
    sourceAccount = await server.loadAccount(publicKey)
  } catch (err: any) {
    if (err.response?.status === 404) {
      throw new Error('Source account does not exist or is unfunded on this network.')
    }
    throw new Error(`Failed to load account from Horizon: ${err.message}`)
  }

  // 4. Build transaction XDR
  const tx = new TransactionBuilder(sourceAccount, {
    fee: '100000', // 0.01 XLM base fee in stroops
    networkPassphrase,
  })
    .addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount,
      })
    )
    .setTimeout(30)
    .build()

  const txXdr = tx.toEnvelope().toXDR('base64')

  // 5. Request Freighter signature with error handling for user cancellation
  let signedXdr: string
  try {
    signedXdr = await window.freighter.signTransaction(txXdr, {
      networkPassphrase,
    })
  } catch (err: any) {
    // User rejected the signing request in the Freighter modal
    console.error('Freighter signTransaction rejected:', err)
    throw new Error('Transaction signing was rejected or dismissed by user.')
  }

  // 6. Decode signed XDR and submit to Horizon
  try {
    const signedTx = TransactionBuilder.fromXDR(signedXdr, networkPassphrase)
    const result = await server.submitTransaction(signedTx)
    console.log('Transaction successfully confirmed:', result.hash)
    return result
  } catch (err: any) {
    // Check for Horizon transaction submission failure details
    const resultCodes = err.response?.data?.extras?.result_codes
    if (resultCodes) {
      console.error('Horizon transaction error codes:', resultCodes)
      throw new Error(`Transaction failed: ${resultCodes.transaction} (${resultCodes.operations?.join(', ') ?? ''})`)
    }
    throw new Error(`Network submission failed: ${err.message || err}`)
  }
}
```

## Implementation in the Dashboard

### FreighterConnect Component

`components/FreighterConnect.tsx` wraps `@stellar/freighter-api` and provides:
- Connection state management
- Distinct handling of the "not installed", "not allowed" and "locked" states
- UI for connected/disconnected states
- Disconnect button

Usage:

```tsx
import FreighterConnect from '@/components/FreighterConnect'

export default function MyPage() {
  function handleConnect(publicKey: string) {
    console.log('Connected:', publicKey)
  }

  return <FreighterConnect onConnect={handleConnect} />
}
```

### Checking Connection in Forms

To verify the wallet is connected before saving data:

```ts
import { isConnected } from '@stellar/freighter-api'

async function isWalletConnected(): Promise<boolean> {
  const { isConnected: connected } = await isConnected()
  return connected
}

if (!(await isWalletConnected())) {
  setError('Connect your Freighter wallet first')
  return
}
```

## Network Mismatch Handling

The dashboard supports three networks: Mainnet, Testnet, and Futurenet. When a user selects a network for contract monitoring, verify it matches their wallet's current network:

```ts
import { getNetworkDetails } from '@stellar/freighter-api'

const { network: walletNetwork } = await getNetworkDetails()
const selectedNetwork = 'testnet' // from form

if (walletNetwork !== selectedNetwork.toUpperCase()) {
  console.warn(`Wallet is on ${walletNetwork}, but contract is on ${selectedNetwork}`)
  // Show warning to user
}
```

## Error Handling

Common error scenarios:

| Scenario | Error | Handling |
|----------|-------|----------|
| Extension not installed | `window.freighter` is undefined | Prompt to install |
| User rejects connection | Promise rejects | Show "Connection rejected" message |
| Network mismatch | `getNetwork()` returns different value | Warn user to switch networks |
| User rejects signing | `signTransaction` Promise rejects | Show "Signing cancelled" notification |
| Horizon transaction error | `submitTransaction` rejects with `result_codes` | Parse `extras.result_codes` and display reason |
| Network timeout | Server timeout | Retry or check transaction hash on explorer |

## Testing

To test Freighter integration locally:

1. Install the [Freighter extension](https://www.freighter.app/)
2. Create a test account or import an existing keypair
3. Switch to Testnet in the extension settings
4. Run `npm run dev` and test the connection flow

For automated testing, mock the `@stellar/freighter-api` module in your test setup:

```ts
jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn().mockResolvedValue({ isConnected: true }),
  requestAccess: jest.fn().mockResolvedValue({ address: 'GAAAA...' }),
  getPublicKey: jest.fn().mockResolvedValue({ publicKey: 'GAAAA...' }),
  getNetworkDetails: jest.fn().mockResolvedValue({
    network: 'TESTNET',
    networkUrl: 'https://horizon-testnet.stellar.org',
    networkPassphrase: 'Test SDF Network ; September 2015',
  }),
  signTransaction: jest.fn().mockResolvedValue({ signedTxXdr: '...', signerAddress: 'GAAAA...' }),
}))
```
