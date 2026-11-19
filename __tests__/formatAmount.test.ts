import {
  formatAmount,
  formatAmountValue,
  isZeroAmount,
  formatAmountCompact,
} from '../lib/formatAmount';

describe('formatAmount', () => {
  it('formats XLM with 7 decimal places', () => {
    expect(formatAmount('1', 'XLM')).toBe('1.0000000 XLM');
  });

  it('formats USDC with 2 decimal places', () => {
    expect(formatAmount('150.5', 'USDC')).toBe('150.50 USDC');
  });

  it('converts stroops to XLM', () => {
    expect(formatAmount('10000000', 'XLM', true)).toBe('1.0000000 XLM');
  });

  it('formats zero as 0.0000000 XLM', () => {
    expect(formatAmount(0, 'XLM')).toBe('0.0000000 XLM');
  });

  it('treats native as XLM label', () => {
    expect(formatAmount('1', 'native')).toBe('1.0000000 XLM');
  });

  it('falls back to 7 decimals for unknown asset', () => {
    expect(formatAmount('1', 'MYTOKEN')).toBe('1.0000000 MYTOKEN');
  });

  it('returns em-dash for non-finite input', () => {
    expect(formatAmount('abc', 'XLM')).toBe('— XLM');
  });

  it('accepts numeric input', () => {
    expect(formatAmount(2.5, 'XLM')).toBe('2.5000000 XLM');
  });

  it('formats a 6-decimal custom token with explicit decimals', () => {
    expect(formatAmount('1', 'MYTOKEN', false, 6)).toBe('1.000000 MYTOKEN');
  });

  it('formats a 6-decimal token amount with fractional part', () => {
    expect(formatAmount('123.456789', 'MYTOKEN', false, 6)).toBe('123.456789 MYTOKEN');
  });

  it('formats a 6-decimal token from base units', () => {
    expect(formatAmount('1500000', 'MYTOKEN', true, 6)).toBe('1.500000 MYTOKEN');
  });

  it('formats a 0-decimal token', () => {
    expect(formatAmount('42', 'NFT', false, 0)).toBe('42 NFT');
  });

  it('still formats XLM with explicit 7 decimals', () => {
    expect(formatAmount('1', 'XLM', false, 7)).toBe('1.0000000 XLM');
  });

  it('still formats USDC with explicit 2 decimals', () => {
    expect(formatAmount('150.5', 'USDC', false, 2)).toBe('150.50 USDC');
  });
});

describe('formatAmountValue', () => {
  it('omits asset label', () => {
    expect(formatAmountValue('1', 'XLM')).toBe('1.0000000');
  });

  it('honours explicit decimals for token amounts', () => {
    expect(formatAmountValue('1', 'MYTOKEN', false, 6)).toBe('1.000000');
  });
});

describe('isZeroAmount', () => {
  it('returns true for 0', () => expect(isZeroAmount(0)).toBe(true));
  it('returns true for "0"', () => expect(isZeroAmount('0')).toBe(true));
  it('returns false for 1', () => expect(isZeroAmount(1)).toBe(false));
  it('returns false for NaN string', () => expect(isZeroAmount('abc')).toBe(false));
});

describe('formatAmountCompact', () => {
  it('abbreviates millions', () => {
    expect(formatAmountCompact(1_200_000, 'XLM')).toBe('1.20M XLM');
  });

  it('abbreviates thousands', () => {
    expect(formatAmountCompact(1500, 'XLM')).toBe('1.50K XLM');
  });

  it('shows full value under 1000', () => {
    expect(formatAmountCompact(99, 'XLM')).toBe('99.00 XLM');
  });

  it('converts stroops in compact mode', () => {
    expect(formatAmountCompact('10000000000000', 'XLM', true)).toBe('1.00M XLM');
  });

  it('formats compact token amounts with explicit decimals', () => {
    expect(formatAmountCompact('2500000', 'MYTOKEN', true, 6)).toBe('2.50 MYTOKEN');
  });
});
