/**
 * Rule template persistence (issue #594).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AlertRule } from '@/types'
import {
  getRuleTemplates,
  saveRuleTemplate,
  deleteRuleTemplate,
  onRuleTemplatesChange,
} from '../ruleTemplates'
import { STORAGE_KEYS } from '../storageKeys'

const KEY = STORAGE_KEYS.RULE_TEMPLATES

const anyTx: AlertRule = { type: 'AnyTransaction' }
const largeTransfer: AlertRule = { type: 'LargeTransfer', threshold_xlm: 500 }

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('getRuleTemplates', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(getRuleTemplates()).toEqual([])
  })

  it('returns an empty list for malformed JSON', () => {
    localStorage.setItem(KEY, '{not json')
    expect(getRuleTemplates()).toEqual([])
  })

  it('drops entries that do not match the schema', () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([
        { id: 't1', name: 'Valid', rules: [anyTx], created_at: 1 },
        { id: 't2', name: '', rules: [anyTx], created_at: 1 },
        { id: 't3', name: 'Bad rules', rules: 'nope', created_at: 1 },
        null,
      ])
    )
    expect(getRuleTemplates()).toHaveLength(1)
    expect(getRuleTemplates()[0].name).toBe('Valid')
  })
})

describe('saveRuleTemplate', () => {
  it('persists a template to localStorage', () => {
    const template = saveRuleTemplate('Watch everything', [anyTx, largeTransfer])

    expect(template.name).toBe('Watch everything')
    expect(template.rules).toHaveLength(2)
    expect(template.created_at).toBeTypeOf('number')

    const stored = JSON.parse(localStorage.getItem(KEY)!)
    expect(stored).toHaveLength(1)
    expect(stored[0].id).toBe(template.id)
  })

  it('trims the template name', () => {
    expect(saveRuleTemplate('  Trimmed  ', [anyTx]).name).toBe('Trimmed')
  })

  it('updates a template with the same name instead of duplicating it', () => {
    const first = saveRuleTemplate('My template', [anyTx])
    const second = saveRuleTemplate('my TEMPLATE', [largeTransfer])

    expect(getRuleTemplates()).toHaveLength(1)
    expect(second.id).toBe(first.id)
    expect(getRuleTemplates()[0].rules).toEqual([largeTransfer])
    expect(getRuleTemplates()[0].name).toBe('my TEMPLATE')
  })

  it('copies the rules so later mutations do not leak into storage', () => {
    const rules: AlertRule[] = [anyTx]
    saveRuleTemplate('Snapshot', rules)
    rules.push(largeTransfer)
    expect(getRuleTemplates()[0].rules).toHaveLength(1)
  })

  it('rejects a blank name', () => {
    expect(() => saveRuleTemplate('   ', [anyTx])).toThrow('Template name is required')
  })

  it('rejects saving without rules', () => {
    expect(() => saveRuleTemplate('Empty', [])).toThrow('Add at least one rule')
  })
})

describe('deleteRuleTemplate', () => {
  it('removes the requested template and keeps the others', () => {
    const first = saveRuleTemplate('First', [anyTx])
    saveRuleTemplate('Second', [largeTransfer])

    deleteRuleTemplate(first.id)

    expect(getRuleTemplates()).toHaveLength(1)
    expect(getRuleTemplates()[0].name).toBe('Second')
  })

  it('is a no-op for an unknown id', () => {
    saveRuleTemplate('Only', [anyTx])
    deleteRuleTemplate('missing')
    expect(getRuleTemplates()).toHaveLength(1)
  })
})

describe('onRuleTemplatesChange', () => {
  it('notifies subscribers when a template is saved or deleted', () => {
    const listener = vi.fn()
    const unsubscribe = onRuleTemplatesChange(listener)

    const template = saveRuleTemplate('Notify me', [anyTx])
    expect(listener).toHaveBeenCalledTimes(1)

    deleteRuleTemplate(template.id)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    saveRuleTemplate('After unsubscribe', [anyTx])
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
