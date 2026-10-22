# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Next.js 14 App Router dashboard with responsive navigation and dark mode support.
- Soroban contract registration with label, network selection (Mainnet, Testnet, Futurenet), and webhook configuration.
- Alert rule builder supporting `LargeTransfer`, `AdminFunctionCalled`, `AnyTransaction`, `FunctionCalled`, and `TransactionFailed`.
- Webhook delivery history viewer with status indicators, filtering, and payload inspector.
- Freighter wallet integration (`FreighterConnect`) for wallet connection and transaction signing.
- Client-side persistence in `lib/storage.ts` using `localStorage` with versioned migrations, per-contract alert caps, and quota trimming.
- Horizon REST and Soroban RPC client helpers in `lib/stellar.ts` for network queries, contract validation, and explorer links.
- Vitest unit test suite with coverage for storage management, network distribution, and helper utilities.
- Mock API strategy and alert seeding mechanism for offline development and testing.
