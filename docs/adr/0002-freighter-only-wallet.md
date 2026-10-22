# ADR-0002: Freighter as the only supported wallet

- **Status:** Accepted
- **Date:** 2026-10-20
- **Deciders:** stellar-txwatch-web maintainers
- **Related:** [ADR-0001](./0001-localstorage-first-storage.md), [docs/FREIGHTER_INTEGRATION.md](../FREIGHTER_INTEGRATION.md), `lib/useFreighter.ts`, `components/FreighterConnect.tsx`

## Context and Problem Statement

The dashboard needs a Stellar identity for wallet-gated features: showing the connected account, checking that the wallet's network matches the contract being registered, and signing transactions. The Stellar ecosystem has several browser wallets, including Freighter, xBull, Albedo, Rabet, Lobstr and Hana, each with a different API.

Which wallet or wallets should the dashboard support?

## Decision Drivers

- The project's focus is **Soroban** contracts, so the wallet must support Soroban transaction signing on Mainnet, Testnet and Futurenet.
- Keep the integration surface small while the product is early.
- Contributors need a wallet that is easy to install and use on Testnet.
- Avoid extra dependencies and bundle weight where possible.

## Considered Options

1. **Freighter only**, integrated directly via the injected `window.freighter` API
2. **A multi-wallet abstraction** such as Stellar Wallets Kit, supporting Freighter, xBull, Albedo, Lobstr and others
3. **Albedo only**, a web-based signer with no extension required

## Decision Outcome

Chosen option: **1. Freighter only**. Freighter is maintained by the Stellar Development Foundation, has first-class Soroban and Futurenet support, and is the wallet the Soroban docs and tooling assume. A single wallet keeps connection, network detection and error handling simple.

- `lib/useFreighter.ts` declares the `window.freighter` interface (`isConnected`, `getPublicKey`, `getNetwork`, `signTransaction`) and exposes connection state.
- `components/FreighterConnect.tsx` and `WalletStatusBadge.tsx` are the only UI that knows about the wallet.
- If the extension is missing, the user is sent to [freighter.app](https://www.freighter.app/) with a clear error.

### Consequences

- Good, because there is one well-documented API and no wallet-adapter dependency.
- Good, because network mismatch detection is straightforward via `getNetwork()`.
- Good, because the surface is small to test (`__tests__/FreighterConnect.test.tsx`).
- Bad, because users of other wallets must install Freighter to use wallet-gated features.
- Bad, because there is no mobile wallet support. Freighter is a desktop browser extension for Chrome, Firefox and Edge, not Safari.
- Bad, because wallet code is Freighter-specific. Adding a second wallet later means introducing an abstraction and touching the hook and components.

### Confirmation

- Code review: wallet access goes through `useFreighter` / `useWallet`. Components do not call `window.freighter` directly.
- The README "Browser & wallet requirements" section states Freighter as a requirement.

## Pros and Cons of the Options

### 1. Freighter only

- Good, because it has the best Soroban support and is maintained by SDF.
- Good, because the integration is minimal and needs no adapter dependency.
- Bad, because it excludes users of other wallets and mobile users.

### 2. Multi-wallet abstraction (e.g. Stellar Wallets Kit)

- Good, because it supports the widest range of users, including some mobile and hardware wallets.
- Bad, because it adds a dependency and bundle size, and requires a wallet-picker UI.
- Bad, because Soroban signing and network support vary per wallet, which multiplies the test matrix.

### 3. Albedo only

- Good, because it needs no extension install.
- Bad, because it works through popups and redirects, which is a worse UX for repeated signing.
- Bad, because its Soroban and Futurenet support is less mature.

## More Information

Revisit this decision when:

- users report needing a non-Freighter or mobile wallet, or
- the dashboard starts signing transactions frequently enough that wallet choice materially affects UX.

A switch to a multi-wallet adapter should be recorded in a new ADR that supersedes this one.
