import { z } from 'zod'

export const NetworkSchema = z.enum(['mainnet', 'testnet', 'futurenet'])

export const AlertRuleTypeSchema = z.enum([
  'LargeTransfer',
  'AdminFunctionCalled',
  'AnyTransaction',
  'FunctionCalled',
  'TransactionFailed',
])

export const AlertRuleSchema = z.object({
  type: AlertRuleTypeSchema,
  name: z.string().optional(),
  threshold_xlm: z.number().optional(),
  asset: z.string().optional(),
  threshold: z.number().optional(),
  function_names: z.array(z.string()).optional(),
  function_name: z.string().optional(),
})

export const RuleTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50),
  rules: z.array(AlertRuleSchema),
  created_at: z.number(),
})

export const WatchedContractSchema = z.object({
  id: z.string(),
  label: z.string(),
  contract_id: z.string(),
  network: NetworkSchema,
  rules: z.array(AlertRuleSchema),
  webhook_url: z.string(),
  webhook_secret: z.string().optional(),
  created_at: z.number(),
  updated_at: z.number(),
  instanceLiveUntilLedgerSeq: z.number().optional(),
  enabled: z.boolean().optional(),
  group: z.string().optional(),
})

export const AlertPayloadSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  contract_id: z.string(),
  network: z.string(),
  rule_triggered: z.string(),
  rule_name: z.string().optional(),
  transaction_hash: z.string(),
  function_name: z.string().optional(),
  amount: z.number().optional(),
  timestamp: z.number(),
  horizon_link: z.string(),
  delivery_status: z.enum(['delivered', 'retrying', 'failed']).optional(),
  delivery_retry_count: z.number().optional(),
  delivery_last_attempt: z.number().optional(),
})
