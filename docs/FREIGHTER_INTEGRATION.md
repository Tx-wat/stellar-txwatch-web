# Freighter Wallet Integration

This guide explains how the dashboard integrates with the Freighter wallet extension for Stellar identity and transaction signing.

## Overview

Freighter is a browser extension that manages Stellar keypairs and signs transactions. The dashboard uses it to:
- Authenticate users (get their public key)
- Verify the user's current network (Mainnet, Testnet, Futurenet)
- Sign and submit transactions to the Stellar network

## Browser API

The Freighter extension exposes a global `window.freighter` object with these methods:

```ts
interface Freighter {
  isConnected(): Promise<boolean>
  getPublicKey(): Promise<string>
  getNetwork(): Promise<string>
  signTransaction(txXdr: string, options: SignOptions): Promise<string>
}

interface SignOptions {
  networkPassphrase: string
}
```

## Connection Flow

### 1. Check if Freighter is installed

```ts
if (!window.freighter) {
  // Extension not installed — prompt user to install
  window.open('https://www.freighter.app/', '_blank')
}
```

### 2. Check if already connected

```ts
const isConnected = await window.freighter.isConnected()
if (isConnected) {
  const publicKey = await window.freighter.getPublicKey()
  // User is already connected
}
```

### 3. Request connection

```ts
try {
  const publicKey = await window.freighter.getPublicKey()
  // User approved connection
} catch (err) {
  // User rejected connection
}
```

## Getting User Info

After connection, retrieve the user's public key and network:

```ts
const publicKey = await window.freighter.getPublicKey()
// e.g. "GAAAA..."

const network = await window.freighter.getNetwork()
// e.g. "TESTNET", "PUBLIC", "FUTURENET"
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

`components/FreighterConnect.tsx` wraps the Freighter API and provides:
- Connection state management
- Error handling (extension not installed, user rejection)
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
function isWalletConnected(): boolean {
  return typeof window !== 'undefined' && !!window.freighter
}

if (!isWalletConnected()) {
  setError('Connect your Freighter wallet first')
  return
}
```

## Network Mismatch Handling

The dashboard supports three networks: Mainnet, Testnet, and Futurenet. When a user selects a network for contract monitoring, verify it matches their wallet's current network:

```ts
const walletNetwork = await window.freighter.getNetwork()
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

For automated testing, mock the `window.freighter` object in your test setup.
