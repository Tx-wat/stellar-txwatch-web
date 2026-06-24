export type Network = 'mainnet' | 'testnet' | 'futurenet'

export type AlertRuleType =
  | 'LargeTransfer'
  | 'AdminFunctionCalled'
  | 'AnyTransaction'
  | 'FunctionCalled'
  | 'TransactionFailed'

export interface AlertRule {
  type: AlertRuleType
  threshold_xlm?: number
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
  created_at: number
  updated_at: number
}

export type DependencyStatus = 'ok' | 'error' | 'unknown'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  dependencies: {
    db: { status: DependencyStatus; latencyMs?: number; error?: string }
    redis: { status: DependencyStatus; latencyMs?: number; error?: string }
  }
}

export interface AlertPayload {
  label: string
  contract_id: string
  network: string
  rule_triggered: string
  transaction_hash: string
  function_name?: string
  amount?: number
  timestamp: number
  horizon_link: string
}
