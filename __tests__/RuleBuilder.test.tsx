// @vitest-environment jsdom
/**
 * RuleBuilder.test.tsx
 *
 * Component tests covering every rule type, validation errors,
 * duplicate detection, and the edit / cancel / remove flows.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React, { useState } from 'react'
import RuleBuilder from '@/components/RuleBuilder'
import { AlertRule, AlertRuleType } from '@/types'

/** Stateful harness so the controlled `rules` prop stays in sync. */
function Harness({
  initial = [],
  onChange,
}: {
  initial?: AlertRule[]
  onChange?: (r: AlertRule[]) => void
}) {
  const [rules, setRules] = useState<AlertRule[]>(initial)
  return (
    <RuleBuilder
      rules={rules}
      onChange={(r) => {
        setRules(r)
        onChange?.(r)
      }}
    />
  )
}

function selectType(type: AlertRuleType) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: type } })
}

describe('RuleBuilder', () => {
  // ── Defaults ────────────────────────────────────────────────────────────────

  it('renders the rule type dropdown with AnyTransaction as default', () => {
    render(<Harness />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select).toHaveValue('AnyTransaction')
    expect(screen.getByText('Alert on every transaction')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add rule/i })).toBeInTheDocument()
  })

  it('adds an AnyTransaction rule to the list', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Any Transaction')).toBeInTheDocument()
  })

  // ── LargeTransfer ───────────────────────────────────────────────────────────

  it('shows the threshold input for LargeTransfer and errors on empty threshold', () => {
    render(<Harness />)
    selectType('LargeTransfer')
    expect(screen.getByPlaceholderText('e.g. 10000')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Enter a valid XLM threshold')).toBeInTheDocument()
  })

  it('rejects a non-positive LargeTransfer threshold', () => {
    render(<Harness />)
    selectType('LargeTransfer')
    fireEvent.change(screen.getByPlaceholderText('e.g. 10000'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Threshold must be greater than 0')).toBeInTheDocument()
  })

  it('adds a valid LargeTransfer rule', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('LargeTransfer')
    fireEvent.change(screen.getByPlaceholderText('e.g. 10000'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([{ type: 'LargeTransfer', threshold_xlm: 1000 }])
    expect(screen.getByText('>= 1000 XLM')).toBeInTheDocument()
  })

  // ── FunctionCalled ──────────────────────────────────────────────────────────

  it('shows the function name input for FunctionCalled and errors when empty', () => {
    render(<Harness />)
    selectType('FunctionCalled')
    expect(screen.getByPlaceholderText('e.g. transfer')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Enter a function name')).toBeInTheDocument()
  })

  it('rejects an invalid FunctionCalled name', () => {
    render(<Harness />)
    selectType('FunctionCalled')
    fireEvent.change(screen.getByPlaceholderText('e.g. transfer'), {
      target: { value: '1bad-name' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(
      screen.getByText(/function name must start with a letter or underscore/i)
    ).toBeInTheDocument()
  })

  it('adds a valid FunctionCalled rule', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('FunctionCalled')
    fireEvent.change(screen.getByPlaceholderText('e.g. transfer'), {
      target: { value: 'transfer' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([{ type: 'FunctionCalled', function_name: 'transfer' }])
  })

  // ── AdminFunctionCalled ─────────────────────────────────────────────────────

  it('parses comma-separated AdminFunctionCalled names and sorts them', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('AdminFunctionCalled')
    expect(screen.getByText('(comma separated)')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('e.g. set_admin, upgrade, migrate'), {
      target: { value: 'upgrade, set_admin' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([
      { type: 'AdminFunctionCalled', function_names: ['set_admin', 'upgrade'] },
    ])
  })

  it('errors when AdminFunctionCalled has no names', () => {
    render(<Harness />)
    selectType('AdminFunctionCalled')
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Enter at least one function name')).toBeInTheDocument()
  })

  // ── SorobanInvocation ───────────────────────────────────────────────────────

  it('shows the SorobanInvocation option in the dropdown', () => {
    render(<Harness />)
    const select = screen.getByRole('combobox')
    expect(select).toContainHTML('SorobanInvocation')
  })

  it('adds a SorobanInvocation rule with no extra inputs required', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('SorobanInvocation')
    expect(
      screen.getByText('Alert on any Soroban contract invocation')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([{ type: 'SorobanInvocation' }])
    expect(screen.getByText('Soroban Invoke')).toBeInTheDocument()
  })

  it('warns on duplicate SorobanInvocation rules', () => {
    const onChange = vi.fn()
    render(<Harness initial={[{ type: 'SorobanInvocation' }]} onChange={onChange} />)
    selectType('SorobanInvocation')
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('This rule already exists')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  // ── InsufficientFunds ───────────────────────────────────────────────────────

  it('shows the InsufficientFunds option in the dropdown', () => {
    render(<Harness />)
    const select = screen.getByRole('combobox')
    expect(select).toContainHTML('InsufficientFunds')
  })

  it('adds an InsufficientFunds rule with no extra inputs required', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('InsufficientFunds')
    expect(
      screen.getByText('Alert when a transaction fails due to insufficient funds')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([{ type: 'InsufficientFunds' }])
    expect(screen.getByText('Insufficient Funds')).toBeInTheDocument()
  })

  it('warns on duplicate InsufficientFunds rules', () => {
    const onChange = vi.fn()
    render(<Harness initial={[{ type: 'InsufficientFunds' }]} onChange={onChange} />)
    selectType('InsufficientFunds')
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('This rule already exists')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  // ── SourceAccountMatch ──────────────────────────────────────────────────────

  it('shows the source account input for SourceAccountMatch', () => {
    render(<Harness />)
    selectType('SourceAccountMatch')
    expect(screen.getByPlaceholderText('e.g. GABC...XYZ')).toBeInTheDocument()
    expect(
      screen.getByText('Alert when a transaction originates from a specific source account')
    ).toBeInTheDocument()
  })

  it('errors when SourceAccountMatch has no address', () => {
    render(<Harness />)
    selectType('SourceAccountMatch')
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Enter a source account address')).toBeInTheDocument()
  })

  it('rejects an invalid G-address for SourceAccountMatch', () => {
    render(<Harness />)
    selectType('SourceAccountMatch')
    fireEvent.change(screen.getByPlaceholderText('e.g. GABC...XYZ'), {
      target: { value: 'NOTAVALIDADDRESS' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(
      screen.getByText('Enter a valid Stellar G-address (starts with G, 56 characters)')
    ).toBeInTheDocument()
  })

  it('adds a valid SourceAccountMatch rule', () => {
    const onChange = vi.fn()
    // 56-char G-address (G + 55 A's)
    const validAddress = 'G' + 'A'.repeat(55)
    render(<Harness onChange={onChange} />)
    selectType('SourceAccountMatch')
    fireEvent.change(screen.getByPlaceholderText('e.g. GABC...XYZ'), {
      target: { value: validAddress },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([
      { type: 'SourceAccountMatch', source_account: validAddress },
    ])
    expect(screen.getByText('Source Account')).toBeInTheDocument()
  })

  it('warns on duplicate SourceAccountMatch rules', () => {
    const validAddress = 'G' + 'A'.repeat(55)
    const onChange = vi.fn()
    render(
      <Harness
        initial={[{ type: 'SourceAccountMatch', source_account: validAddress }]}
        onChange={onChange}
      />
    )
    selectType('SourceAccountMatch')
    fireEvent.change(screen.getByPlaceholderText('e.g. GABC...XYZ'), {
      target: { value: validAddress },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('This rule already exists')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  // ── TimeWindow ──────────────────────────────────────────────────────────────

  it('shows hours_utc, weekdays, and wrap_rule inputs for TimeWindow', () => {
    render(<Harness />)
    selectType('TimeWindow')
    expect(screen.getByPlaceholderText('e.g. 9, 10, 11, 14')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. 0, 1, 2, 3, 4')).toBeInTheDocument()
    // wrap_rule selector — there is exactly one combobox for rule type, plus the wrap_rule one
    const selects = screen.getAllByRole('combobox')
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it('errors when TimeWindow has neither hours nor weekdays', () => {
    render(<Harness />)
    selectType('TimeWindow')
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('Enter at least one UTC hour or weekday')).toBeInTheDocument()
  })

  it('adds a valid TimeWindow rule with hours_utc only', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('TimeWindow')
    fireEvent.change(screen.getByPlaceholderText('e.g. 9, 10, 11, 14'), {
      target: { value: '9, 10, 11' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([
      { type: 'TimeWindow', hours_utc: [9, 10, 11] },
    ])
    expect(screen.getByText('Time Window')).toBeInTheDocument()
  })

  it('adds a valid TimeWindow rule with weekdays only', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('TimeWindow')
    fireEvent.change(screen.getByPlaceholderText('e.g. 0, 1, 2, 3, 4'), {
      target: { value: '0, 1, 2, 3, 4' },
    })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([
      { type: 'TimeWindow', weekdays: [0, 1, 2, 3, 4] },
    ])
  })

  it('adds a TimeWindow rule with hours_utc, weekdays, and wrap_rule', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    selectType('TimeWindow')
    fireEvent.change(screen.getByPlaceholderText('e.g. 9, 10, 11, 14'), {
      target: { value: '9' },
    })
    fireEvent.change(screen.getByPlaceholderText('e.g. 0, 1, 2, 3, 4'), {
      target: { value: '0, 4' },
    })
    // Select the wrap_rule — it is the second combobox
    const selects = screen.getAllByRole('combobox')
    const wrapSelect = selects[selects.length - 1]
    fireEvent.change(wrapSelect, { target: { value: 'LargeTransfer' } })
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(onChange).toHaveBeenCalledWith([
      {
        type: 'TimeWindow',
        hours_utc: [9],
        weekdays: [0, 4],
        wrap_rule: 'LargeTransfer',
      },
    ])
  })

  it('shows a summary for TimeWindow with hours and wrap_rule', () => {
    render(
      <Harness
        initial={[
          { type: 'TimeWindow', hours_utc: [9, 10], wrap_rule: 'LargeTransfer' },
        ]}
      />
    )
    expect(screen.getByText(/hours: 9,10/)).toBeInTheDocument()
    expect(screen.getByText(/wraps: LargeTransfer/)).toBeInTheDocument()
  })

  // ── Shared flows ────────────────────────────────────────────────────────────

  it('warns on duplicate rules and does not add them', () => {
    const onChange = vi.fn()
    render(<Harness initial={[{ type: 'AnyTransaction' }]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /add rule/i }))
    expect(screen.getByText('This rule already exists')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getAllByText('Any Transaction')).toHaveLength(1)
  })

  it('populates the draft when editing and replaces the rule on update', () => {
    const onChange = vi.fn()
    render(
      <Harness initial={[{ type: 'LargeTransfer', threshold_xlm: 500 }]} onChange={onChange} />
    )
    fireEvent.click(screen.getByRole('button', { name: /edit rule/i }))

    expect(screen.getByRole('combobox')).toHaveValue('LargeTransfer')
    expect(screen.getByPlaceholderText('e.g. 10000')).toHaveValue(500)
    expect(screen.getByRole('button', { name: /update rule/i })).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('e.g. 10000'), { target: { value: '2500' } })
    fireEvent.click(screen.getByRole('button', { name: /update rule/i }))

    expect(onChange).toHaveBeenCalledWith([{ type: 'LargeTransfer', threshold_xlm: 2500 }])
    expect(screen.getByText('>= 2500 XLM')).toBeInTheDocument()
    expect(screen.queryByText('>= 500 XLM')).not.toBeInTheDocument()
  })

  it('reverts the draft when cancel is clicked', () => {
    render(<Harness initial={[{ type: 'FunctionCalled', function_name: 'burn' }]} />)
    fireEvent.click(screen.getByRole('button', { name: /edit rule/i }))
    expect(screen.getByPlaceholderText('e.g. transfer')).toHaveValue('burn')

    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('button', { name: /update rule/i })).not.toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveValue('AnyTransaction')

    expect(screen.getByText('burn')).toBeInTheDocument()
  })

  it('removes a rule from the list', () => {
    const onChange = vi.fn()
    render(
      <Harness
        initial={[{ type: 'AnyTransaction' }, { type: 'TransactionFailed' }]}
        onChange={onChange}
      />
    )
    const removeButtons = screen.getAllByRole('button', { name: /remove rule/i })
    fireEvent.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith([{ type: 'TransactionFailed' }])
    expect(screen.queryByText('Any Transaction')).not.toBeInTheDocument()
    expect(screen.getByText('Tx Failed')).toBeInTheDocument()
  })
})
