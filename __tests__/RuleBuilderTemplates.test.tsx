// @vitest-environment jsdom
/**
 * Rule template save/reuse UI (issue #594).
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import RuleBuilder from '@/components/RuleBuilder'
import { AlertRule } from '@/types'
import { saveRuleTemplate, getRuleTemplates } from '@/lib/ruleTemplates'
import { STORAGE_KEYS } from '@/lib/storageKeys'

vi.mock('@/lib/api', () => ({
  fetchContractFunctions: vi.fn().mockResolvedValue([]),
}))

function Harness({
  initial = [],
  onChange,
}: {
  initial?: AlertRule[]
  onChange?: (rules: AlertRule[]) => void
}) {
  const [rules, setRules] = useState<AlertRule[]>(initial)
  return (
    <RuleBuilder
      rules={rules}
      onChange={(next) => {
        setRules(next)
        onChange?.(next)
      }}
    />
  )
}

beforeEach(() => {
  localStorage.clear()
})

function savedTemplates() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.RULE_TEMPLATES) ?? '[]')
}

describe('saving a rule as a template', () => {
  it('persists the current rules under the template name', () => {
    render(<Harness initial={[{ type: 'AnyTransaction' }]} />)

    fireEvent.click(screen.getByRole('button', { name: /save as template/i }))
    expect(screen.getByRole('dialog', { name: /save rule template/i })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/template name/i), {
      target: { value: 'All activity' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))

    const stored = savedTemplates()
    expect(stored).toHaveLength(1)
    expect(stored[0].name).toBe('All activity')
    expect(stored[0].rules).toEqual([{ type: 'AnyTransaction' }])

    // The dialog closes and the new template is offered in the selector
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /All activity/ })).toBeInTheDocument()
  })

  it('asks for a name before saving', () => {
    render(<Harness initial={[{ type: 'AnyTransaction' }]} />)
    fireEvent.click(screen.getByRole('button', { name: /save as template/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Template' }))

    expect(screen.getByText('Enter a template name')).toBeInTheDocument()
    expect(savedTemplates()).toHaveLength(0)
  })

  it('requires at least one rule before opening the dialog', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /save as template/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('No rules to save as template')).toBeInTheDocument()
  })
})

describe('reusing a template', () => {
  it('adds the template rules to the builder', () => {
    const onChange = vi.fn()
    const template = saveRuleTemplate('Large moves', [
      { type: 'LargeTransfer', threshold_xlm: 500 },
    ])

    render(<Harness onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/load a rule template/i), {
      target: { value: template.id },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply template' }))

    expect(onChange).toHaveBeenCalledWith([{ type: 'LargeTransfer', threshold_xlm: 500 }])
    expect(screen.getByText('>= 500 XLM')).toBeInTheDocument()
  })

  it('skips rules that are already present', () => {
    const onChange = vi.fn()
    const template = saveRuleTemplate('Anything', [{ type: 'AnyTransaction' }])

    render(<Harness initial={[{ type: 'AnyTransaction' }]} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText(/load a rule template/i), {
      target: { value: template.id },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Apply template' }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByText('All rules from this template are already added')).toBeInTheDocument()
  })

  it('disables the selector when no templates exist', () => {
    render(<Harness />)
    const select = screen.getByLabelText(/load a rule template/i)
    expect(select).toBeDisabled()
    expect(screen.getByText('No templates saved yet')).toBeInTheDocument()
  })

  it('deletes the selected template', () => {
    const template = saveRuleTemplate('Temporary', [{ type: 'AnyTransaction' }])
    render(<Harness />)

    const select = screen.getByLabelText(/load a rule template/i)
    fireEvent.change(select, { target: { value: template.id } })
    fireEvent.click(screen.getByRole('button', { name: /delete template/i }))

    expect(getRuleTemplates()).toEqual([])
    expect(screen.getByLabelText(/load a rule template/i)).toBeDisabled()
  })
})
