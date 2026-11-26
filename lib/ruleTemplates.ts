import { AlertRule, RuleTemplate } from '@/types'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { RuleTemplateSchema } from '@/lib/schemas'

/**
 * Persistence and change notification for reusable RuleBuilder templates.
 *
 * Templates are stored as a JSON array in localStorage under
 * `STORAGE_KEYS.RULE_TEMPLATES`. Reads validate every entry so a malformed or
 * outdated record can't break the rule builder.
 */

const TEMPLATES_KEY = STORAGE_KEYS.RULE_TEMPLATES

type Listener = () => void
const listeners = new Set<Listener>()

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined') return window.localStorage
  return (globalThis as unknown as { localStorage?: Storage }).localStorage
}

function notify(): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener()
    } catch {
      // One broken listener must not block the others.
    }
  }
}

/** Subscribes to template additions/removals in this tab. Returns an unsubscribe fn. */
export function onRuleTemplatesChange(callback: Listener): () => void {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

/** Returns every valid saved template, newest last. */
export function getRuleTemplates(): RuleTemplate[] {
  const storage = getStorage()
  if (!storage) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(storage.getItem(TEMPLATES_KEY) ?? '[]')
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const templates: RuleTemplate[] = []
  for (const entry of parsed) {
    const result = RuleTemplateSchema.safeParse(entry)
    if (result.success) templates.push(result.data)
  }
  return templates
}

function writeTemplates(templates: RuleTemplate[]): void {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(TEMPLATES_KEY, JSON.stringify(templates))
  notify()
}

function createId(): string {
  return `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Saves the given rules as a template. A template with the same (trimmed,
 * case-insensitive) name is replaced in place, so re-saving updates it rather
 * than creating a duplicate entry.
 *
 * @throws when the name is blank or there are no rules to save.
 */
export function saveRuleTemplate(name: string, rules: AlertRule[]): RuleTemplate {
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error('Template name is required')
  if (rules.length === 0) throw new Error('Add at least one rule before saving a template')

  const templates = getRuleTemplates()
  const existingIndex = templates.findIndex(
    (template) => template.name.toLowerCase() === trimmedName.toLowerCase()
  )

  if (existingIndex !== -1) {
    const updated: RuleTemplate = {
      ...templates[existingIndex],
      name: trimmedName,
      rules: rules.map((rule) => ({ ...rule })),
    }
    const next = [...templates]
    next[existingIndex] = updated
    writeTemplates(next)
    return updated
  }

  const template: RuleTemplate = {
    id: createId(),
    name: trimmedName,
    rules: rules.map((rule) => ({ ...rule })),
    created_at: Date.now(),
  }
  writeTemplates([...templates, template])
  return template
}

/** Deletes a template by id. No-op when it does not exist. */
export function deleteRuleTemplate(id: string): void {
  const templates = getRuleTemplates()
  const next = templates.filter((template) => template.id !== id)
  if (next.length === templates.length) return
  writeTemplates(next)
}
