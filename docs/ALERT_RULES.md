# Alert Rules

This document describes each alert rule type you can attach to a watched contract: when it fires, which fields it takes, how the dashboard validates it, and what the resulting webhook payload looks like.

Rules are configured in the dashboard (`components/RuleBuilder.tsx`) and evaluated by the [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) engine. The rule shapes in `types/index.ts` mirror the Rust structs in core. If this document and the core engine ever disagree, the core engine is the source of truth, so please open an issue so the docs can be fixed.

- [Rule shape](#rule-shape)
- [AnyTransaction](#anytransaction)
- [LargeTransfer](#largetransfer)
- [FunctionCalled](#functioncalled)
- [AdminFunctionCalled](#adminfunctioncalled)
- [TransactionFailed](#transactionfailed)
- [Edge cases](#edge-cases)
- [Validation reference](#validation-reference)

## Rule shape

Every rule is an `AlertRule` object with a `type` and the fields that type needs:

```ts
interface AlertRule {
  type: 'AnyTransaction' | 'LargeTransfer' | 'FunctionCalled' | 'AdminFunctionCalled' | 'TransactionFailed'
  threshold_xlm?: number    // LargeTransfer only
  function_name?: string    // FunctionCalled only
  function_names?: string[] // AdminFunctionCalled only
}
```

Fields that don't belong to the selected type are dropped when you switch types in the RuleBuilder.

Every webhook carries the same `AlertPayload` envelope. `rule_triggered` holds the rule type that matched, and `function_name` and `amount` are present only when they apply:

| Field | Type | Notes |
|---|---|---|
| `label` | string | The contract's label in the dashboard |
| `contract_id` | string | Soroban contract address (`C...`, 56 chars) |
| `network` | string | `mainnet`, `testnet` or `futurenet` |
| `rule_triggered` | string | One of the rule types below |
| `transaction_hash` | string | Hash of the matching transaction |
| `function_name` | string? | Invoked contract function, when known |
| `amount` | number? | Transfer amount in XLM, for transfer-related rules |
| `timestamp` | number | Unix time in milliseconds |
| `horizon_link` | string | Horizon URL for the transaction |

---

## AnyTransaction

**When it fires:** on every transaction that invokes the watched contract, whether it succeeds or fails.

**Fields:** none.

**Validation:** none. A contract can have only one `AnyTransaction` rule. Adding a second one is rejected with *"This rule already exists"*.

**Example rule:**

```json
{ "type": "AnyTransaction" }
```

**Example payload:**

```json
{
  "label": "My DEX Contract",
  "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "network": "testnet",
  "rule_triggered": "AnyTransaction",
  "transaction_hash": "3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889",
  "function_name": "swap",
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon-testnet.stellar.org/transactions/3389e9f0f1a65f19736cacf544c2e825313e8447f569233bb8db39aa607c8889"
}
```

> `AnyTransaction` is the noisiest rule. On a busy contract, use it for staging or low-traffic contracts, or combine it with an idempotent receiver (see [`examples/`](../examples)).

---

## LargeTransfer

**When it fires:** when a transaction moves an amount **greater than or equal to** `threshold_xlm` through the watched contract. The dashboard shows the rule as `>= <threshold> XLM`.

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `threshold_xlm` | number | Yes | Minimum transfer amount, in XLM, that triggers the alert |

**Validation:**

- Must be a number. Empty or non-numeric input is rejected with *"Enter a valid XLM threshold"*.
- Must be greater than `0`. Entering `0` clears the field, so it is also rejected as invalid.
- Decimals are allowed (`step="any"`). There is no upper bound.
- Two `LargeTransfer` rules with the same threshold count as duplicates. Rules with different thresholds can coexist.

**Example rule:**

```json
{ "type": "LargeTransfer", "threshold_xlm": 10000 }
```

**Example payload:**

```json
{
  "label": "My DEX Contract",
  "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "network": "mainnet",
  "rule_triggered": "LargeTransfer",
  "transaction_hash": "abc123...",
  "function_name": "transfer",
  "amount": 50000,
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon.stellar.org/transactions/abc123..."
}
```

---

## FunctionCalled

**When it fires:** when a transaction invokes the named function on the watched contract. Matching is on the exact function name and is **case-sensitive** (`transfer` does not match `Transfer`).

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `function_name` | string | Yes | Exact name of the contract function to watch |

**Validation:**

- Must not be empty or whitespace. Otherwise it is rejected with *"Enter a function name"*.
- Leading and trailing whitespace is trimmed before validation.
- Must match `^[a-zA-Z_][a-zA-Z0-9_]*$`: it starts with a letter or underscore and contains only letters, digits and underscores, matching Soroban function name rules.
- Two `FunctionCalled` rules for the same function count as duplicates. To watch several functions, add one rule per function or use `AdminFunctionCalled`.

**Example rule:**

```json
{ "type": "FunctionCalled", "function_name": "transfer" }
```

**Example payload:**

```json
{
  "label": "Token Contract",
  "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "network": "testnet",
  "rule_triggered": "FunctionCalled",
  "transaction_hash": "def456...",
  "function_name": "transfer",
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon-testnet.stellar.org/transactions/def456..."
}
```

---

## AdminFunctionCalled

**When it fires:** when a transaction invokes **any one** of the listed functions on the watched contract. Use it for privileged operations such as `set_admin`, `upgrade` or `migrate`, where a single rule should cover a whole group of functions.

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `function_names` | string[] | Yes | List of function names. A call to any of them fires the rule. |

**Validation:**

- Entered as a comma-separated list. Each entry is trimmed and empty entries are dropped, so `"set_admin, , upgrade"` becomes `["set_admin", "upgrade"]`.
- At least one name is required. Otherwise it is rejected with *"Enter at least one function name"*.
- Names are sorted alphabetically when the rule is saved.
- Two `AdminFunctionCalled` rules with the same set of names, in any order, count as duplicates.
- Unlike `FunctionCalled`, individual names are **not** checked against the function name pattern in the dashboard, so double-check spelling.

**Example rule:**

```json
{ "type": "AdminFunctionCalled", "function_names": ["migrate", "set_admin", "upgrade"] }
```

**Example payload:**

```json
{
  "label": "Vault Contract",
  "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "network": "mainnet",
  "rule_triggered": "AdminFunctionCalled",
  "transaction_hash": "789abc...",
  "function_name": "upgrade",
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon.stellar.org/transactions/789abc..."
}
```

`function_name` in the payload tells you which of the listed functions was actually called.

---

## TransactionFailed

**When it fires:** when a transaction that invokes the watched contract is included in a ledger but fails, for example because the contract panicked, ran out of resources or failed an auth check. Transactions that never reach the ledger, such as ones rejected at submission, are not observed and do not fire.

**Fields:** none.

**Validation:** none. A contract can have only one `TransactionFailed` rule.

**Example rule:**

```json
{ "type": "TransactionFailed" }
```

**Example payload:**

```json
{
  "label": "My DEX Contract",
  "contract_id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
  "network": "testnet",
  "rule_triggered": "TransactionFailed",
  "transaction_hash": "fail01...",
  "function_name": "swap",
  "timestamp": 1718000000000,
  "horizon_link": "https://horizon-testnet.stellar.org/transactions/fail01..."
}
```

---

## Edge cases

### A failed transaction that calls a watched function

Each rule is evaluated independently against the transaction. A failed transaction that invoked `transfer` therefore matches:

- `TransactionFailed`: yes, the transaction failed.
- `FunctionCalled` (`transfer`) or `AdminFunctionCalled` containing `transfer`: yes, the function was invoked, even though its state changes were rolled back.
- `AnyTransaction`: yes.
- `LargeTransfer`: **no**. A failed transaction moves no funds, so there is no amount to compare against the threshold.

If you only care about successful calls, check whether the same `transaction_hash` also arrived with `rule_triggered: "TransactionFailed"`, or look up the transaction status via `horizon_link`.

### Multiple rules matching one transaction

When several rules on the same contract match the same transaction, **one webhook is sent per matching rule**. Each has the same `transaction_hash` and a different `rule_triggered`. For example, a successful 50,000 XLM `transfer` on a contract with `AnyTransaction`, `LargeTransfer` (10,000) and `FunctionCalled` (`transfer`) produces three deliveries.

This means:

- `transaction_hash` alone is **not** a unique key for a delivery. Use the pair `(transaction_hash, rule_triggered)`. The [webhook receiver examples](../examples) show how.
- Delivery order between the rules is not guaranteed.

### Multiple rules of the same type

- `LargeTransfer` with different thresholds, such as 10,000 and 100,000: a 150,000 XLM transfer matches both, but both deliveries carry `rule_triggered: "LargeTransfer"`, so they share the same `(transaction_hash, rule_triggered)` key. If you need to tell them apart, prefer a single threshold per contract and filter by `amount` in your receiver.
- `FunctionCalled` for different functions: only the rule for the function actually invoked fires.

### The same contract registered on several networks

Contracts are watched per network. Rules on a Testnet registration never fire for Mainnet transactions. Check the `network` field in the payload.

### Editing and duplicates

The dashboard rejects exact duplicates when **adding** a rule, but not when **editing** one. Editing a rule so that it matches another existing rule is allowed, and both will fire.

### Test webhooks

The **Test** button sends a mock payload with `rule_triggered: "AnyTransaction"` and a placeholder `transaction_hash` that starts with `TEST_HASH_`, regardless of which rules are configured. Receivers should accept it, but may want to skip any side effects for it.

## Validation reference

| Rule type | Field | Constraint | Error shown |
|---|---|---|---|
| `LargeTransfer` | `threshold_xlm` | Number, `> 0` | *Enter a valid XLM threshold* / *Threshold must be greater than 0* |
| `FunctionCalled` | `function_name` | Non-empty, `^[a-zA-Z_][a-zA-Z0-9_]*$` | *Enter a function name* / *Function name must start with a letter or underscore…* |
| `AdminFunctionCalled` | `function_names` | At least one non-empty name | *Enter at least one function name* |
| Any | (whole rule) | No exact duplicate on add | *This rule already exists* |
