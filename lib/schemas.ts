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
  threshold_xlm: z.number().optional(),
  function_names: z.array(z.string()).optional(),
  function_name: z.string().optional(),
})

export const WatchedContractSchema = z.object({
  id: z.string(),
  label: z.string(),
  contract_id: z.string(),
  network: NetworkSchema,
  rules: z.array(AlertRuleSchema),
  webhook_url: z.string(),
  created_at: z.number(),
  updated_at: z.number(),
})

export const AlertPayloadSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  contract_id: z.string(),
  network: z.string(),
  rule_triggered: z.string(),
  transaction_hash: z.string(),
  function_name: z.string().optional(),
  amount: z.number().optional(),
  timestamp: z.number(),
  horizon_link: z.string(),
})
