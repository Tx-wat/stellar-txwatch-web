import { AlertRule } from '@/types'
import { AlertRuleSchema } from '@/lib/schemas'

export interface TomlRuleImport {
  rules: AlertRule[]
  skipped: number
}

const RULE_TABLE = '[[contracts.rules]]'

// Handles the subset txwatch-core configs use: basic strings, numbers,
// booleans and arrays of strings. Anything else is kept as a raw string and
// then rejected by AlertRuleSchema (#646).
function parseValue(raw: string): unknown {
  const value = raw.trim()
  if (value.startsWith('"')) {
    const end = value.lastIndexOf('"')
    return value.slice(1, end).replace(/\\"/g, '"').replace(/\\/g, '\')
  }
  if (value.startsWith('[')) {
    const inner = value.slice(1, value.lastIndexOf(']'))
    return inner
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => parseValue(item))
  }
  const bare = value.replace(/\s+#.*$/, '').trim()
  if (bare === 'true') return true
  if (bare === 'false') return false
  const num = Number(bare)
  return bare !== '' && Number.isFinite(num) ? num : bare
}

/** Parse `[[contracts.rules]]` tables from a txwatch-core TOML config (#646). */
export function parseRulesToml(text: string): TomlRuleImport {
  const blocks: Record<string, unknown>[] = []
  let current: Record<string, unknown> | null = null

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    if (trimmed.startsWith('[')) {
      current = trimmed === RULE_TABLE ? {} : null
      if (current) blocks.push(current)
      continue
    }

    const eq = trimmed.indexOf('=')
    if (!current || eq === -1) continue
    current[trimmed.slice(0, eq).trim()] = parseValue(trimmed.slice(eq + 1))
  }

  const rules: AlertRule[] = []
  let skipped = 0
  for (const block of blocks) {
    const result = AlertRuleSchema.safeParse(block)
    if (result.success) rules.push(result.data)
    else skipped++
  }
  return { rules, skipped }
}
