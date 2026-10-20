export type Network = 'mainnet' | 'testnet' | 'futurenet'

export type AlertRuleType =
  | 'LargeTransfer'
  | 'AdminFunctionCalled'
  | 'AnyTransaction'
  | 'FunctionCalled'
  | 'TransactionFailed'

/** Alert rule configuration for monitoring contract events.
 * 
 * Types must stay in sync with the Rust `AlertRule` struct in stellar-txwatch-core.
 */
export interface AlertRule {
  /** Rule type - one of: LargeTransfer, AdminFunctionCalled, AnyTransaction, FunctionCalled, TransactionFailed */
  type: AlertRuleType
  /** Optional XLM threshold amount; rule triggers when transaction amount exceeds this value */
  threshold_xlm?: number
  /** Optional list of function names to monitor; rule triggers if any listed function is called */
  function_names?: string[]
  /** Single function name to monitor; rule triggers when this function is called */
  function_name?: string
}

/** Watched contract configuration with associated alert rules.
 * 
 * Types must stay in sync with the Rust `Contract` struct in stellar-txwatch-core.
 */
export interface WatchedContract {
  /** Unique identifier for the watched contract */
  id: string
  /** User-defined label for the contract */
  label: string
  /** Soroban contract ID (starts with C, 56 base-32 chars) */
  contract_id: string
  /** Network name: mainnet, testnet, or futurenet */
  network: Network
  /** Alert rules configured for this contract */
  rules: AlertRule[]
  /** Webhook URL to receive alerts when rules fire */
  webhook_url: string
  /** Unix timestamp (ms) when the contract was created */
  created_at: number
  /** Unix timestamp (ms) when the contract was last updated */
  updated_at: number
}

/** Payload sent to the webhook URL when an alert rule is triggered.
 * 
 * Types must stay in sync with the Rust struct in stellar-txwatch-core.
 */
export interface AlertPayload {
  /** User-defined contract label */
  label: string
  /** Soroban contract ID */
  contract_id: string
  /** Network where the contract is deployed */
  network: string
  /** Rule type that was triggered */
  rule_triggered: string
  /** Transaction hash that triggered the rule */
  transaction_hash: string
  /** Optional function name involved in the trigger */
  function_name?: string
  /** Optional amount transferred (in stroops) */
  amount?: number
  /** Unix timestamp (ms) when the transaction occurred */
  timestamp: number
  /** Horizon.link URL for the transaction */
  horizon_link: string
}
