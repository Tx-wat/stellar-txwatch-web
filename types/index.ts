import { z } from 'zod'
import {
  NetworkSchema,
  AlertRuleTypeSchema,
  AlertRuleSchema,
  WatchedContractSchema,
  AlertPayloadSchema,
} from '@/lib/schemas'

// Types are inferred from the zod schemas in lib/schemas.ts, which are the
// single source of truth for both compile-time types and runtime validation.
export type Network = z.infer<typeof NetworkSchema>
export type AlertRuleType = z.infer<typeof AlertRuleTypeSchema>

export type ExplorerId = 'stellar-expert' | 'stellarchain' | 'horizon'

export interface AppSettings {
  explorer: ExplorerId
}

/** Alert rule configuration for monitoring contract events.
 * 
 * Types must stay in sync with the Rust `AlertRule` struct in stellar-txwatch-core.
 */
export interface AlertRule {
  /** Rule type - one of: LargeTransfer, AdminFunctionCalled, AnyTransaction, FunctionCalled, TransactionFailed */
  type: AlertRuleType
  /** Optional user-supplied label for this rule (max 60 characters). */
  name?: string
  threshold_xlm?: number
  asset?: string
  threshold?: number
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
  webhook_secret?: string
  created_at: number
  /** Unix timestamp (ms) when the contract was last updated */
  updated_at: number
  instanceLiveUntilLedgerSeq?: number
}

export type DeliveryStatus = 'delivered' | 'retrying' | 'failed'

export interface AlertPayload {
  /** User-defined contract label */
  label: string
  /** Soroban contract ID */
  contract_id: string
  /** Network where the contract is deployed */
  network: string
  /** Rule type that was triggered */
  rule_triggered: string
  /** Optional rule name echoed by the core engine (mirrors AlertRule.name). */
  rule_name?: string
  transaction_hash: string
  /** Optional function name involved in the trigger */
  function_name?: string
  /** Optional amount transferred (in stroops) */
  amount?: number
  /** Unix timestamp (ms) when the transaction occurred */
  timestamp: number
  /** Horizon.link URL for the transaction */
  horizon_link: string
  /** Webhook delivery status reported by the core engine.
   *  Absent for older alerts stored before this field existed. */
  delivery_status?: DeliveryStatus
  /** Number of retry attempts the core engine has made for this alert. */
  delivery_retry_count?: number
  /** Timestamp (ms) of the last delivery attempt. */
  delivery_last_attempt?: number
}

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      getNetwork: () => Promise<string>
      signTransaction?: (xdr: string, options: { networkPassphrase: string }) => Promise<string>
    }
    __freighterPublicKey?: string | null
  }
}

export interface RuleTemplate {
  id: string
  name: string
  rules: AlertRule[]
  created_at: number
}
