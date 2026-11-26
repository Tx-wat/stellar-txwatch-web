import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import EditRulesModal, { validateRule } from '../components/EditRulesModal';
import { AlertRule } from '@/types';

describe('validateRule', () => {
  it('flags LargeTransfer rules missing a threshold', () => {
    const rule = { type: 'LargeTransfer' } as AlertRule;
    expect(validateRule(rule)).toMatch(/threshold/i);
  });

  it('passes a valid LargeTransfer rule', () => {
    const rule = { type: 'LargeTransfer', threshold_xlm: 100 } as AlertRule;
    expect(validateRule(rule)).toBeNull();
  });

  it('flags FunctionCalled rules missing a function name', () => {
    const rule = { type: 'FunctionCalled' } as AlertRule;
    expect(validateRule(rule)).toMatch(/function name/i);
  });
});

describe('EditRulesModal', () => {
  it('shows inline validation errors and disables Save for invalid rules', () => {
    const invalidRules = [{ type: 'LargeTransfer' } as AlertRule];
    render(
      <EditRulesModal initialRules={invalidRules} onSave={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('rule-validation-errors')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Rules' })).toBeDisabled();
  });

  it('calls onSave when all rules are valid', () => {
    const onSave = vi.fn();
    const validRules = [{ type: 'LargeTransfer', threshold_xlm: 50 } as AlertRule];
    render(<EditRulesModal initialRules={validRules} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Rules' }));
    expect(onSave).toHaveBeenCalledWith(validRules);
  });
});
