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

export type ExplorerId = 'stellar-expert' | 'stellarchain' | 'horizon'

export interface AppSettings {
  explorer: ExplorerId
}

export interface AlertRule {
  type: AlertRuleType
  /** Optional user-supplied label for this rule (max 60 characters). */
  name?: string
  threshold_xlm?: number
  asset?: string
  threshold?: number
  function_names?: string[]
  function_name?: string
}

export interface WatchedContract {
  id: string
  label: string
  contract_id: string
  network: Network
  rules: AlertRule[]
  webhook_url: string
  webhook_secret?: string
  created_at: number
  updated_at: number
  instanceLiveUntilLedgerSeq?: number
}

export type DeliveryStatus = 'delivered' | 'retrying' | 'failed'

export interface AlertPayload {
  label: string
  contract_id: string
  network: string
  rule_triggered: string
  /** Optional rule name echoed by the core engine (mirrors AlertRule.name). */
  rule_name?: string
  transaction_hash: string
  function_name?: string
  amount?: number
  timestamp: number
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
