# Terminology Glossary

This glossary defines key terms used in the stellar-txwatch project to help new contributors understand the codebase and documentation.

## Blockchain & Stellar

**Stellar**
The open-source blockchain network that powers this project. Stellar is designed for fast, low-cost payments and asset transfers.

**Soroban**
Stellar's smart contract platform. Soroban contracts are WebAssembly (WASM) programs that run on the Stellar network and can be invoked by transactions.

**Horizon**
Stellar's REST API for querying blockchain data. Horizon provides access to account information, transaction history, ledger entries, and other on-chain data.

**Contract ID**
A unique identifier for a Soroban smart contract on the Stellar network. Contract IDs start with the letter `C` and are 56 characters long (base-32 encoded).

**Mainnet**
The production Stellar network where real transactions occur and assets have real value. Used for live deployments.

**Testnet**
A test network for Stellar development and testing. Testnet uses test lumens (XLM) with no real value, allowing developers to experiment safely.

**Futurenet**
An experimental Stellar network for testing new features and protocol changes before they reach Testnet or Mainnet.

## TxWatch Concepts

**Alert Rule**
A condition that triggers a webhook notification when matched. Examples include large transfers, specific function calls, admin actions, or failed transactions.

**Webhook**
An HTTP POST request sent to a registered URL when an alert rule fires. The webhook payload contains details about the triggered event (transaction hash, amount, function name, etc.).

**Webhook Payload**
The JSON data sent in a webhook POST request. Contains information like contract ID, rule type, transaction hash, function name, and timestamp.

**Contract Registration**
The process of adding a Soroban contract to TxWatch monitoring. Once registered, the contract's transactions are monitored for matching alert rules.

**Alert History**
A log of all webhook deliveries and alert events for a registered contract. Shows which rules fired, when they fired, and delivery status.

**Delivery History**
A record of webhook POST attempts to the registered endpoint, including HTTP status codes, response times, and retry attempts.

## Development Terms

**localStorage**
Browser-based storage used by TxWatch to persist contract registrations and settings locally when no backend API is available.

**Freighter**
A browser wallet extension for Stellar that enables users to sign transactions and connect to Stellar dApps. Required for contract registration in TxWatch.

**RPC (Remote Procedure Call)**
A protocol for calling functions on a remote server. Soroban RPC is used to simulate contract invocations and read contract storage.

**Ledger Entry**
A piece of data stored on the Stellar ledger, such as account balances, contract storage, or trust lines.

**Transaction Hash**
A unique identifier for a transaction on the Stellar network. Used to look up transaction details on Horizon or Stellar Expert.

## Related Projects

**stellar-txwatch-core**
The Rust backend engine that monitors Stellar transactions and fires webhooks when alert rules match.

**stellar-txwatch-contracts**
Soroban smart contracts used for testing and demonstration purposes within the TxWatch ecosystem.

**stellar-txwatch-web**
This repository — the Next.js web dashboard for registering contracts and managing alert rules.
