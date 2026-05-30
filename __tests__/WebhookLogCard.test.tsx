import React from 'react';
import { render, screen } from '@testing-library/react';
import { WebhookLogCard, WebhookEntry } from '../components/WebhookLogCard';

const base: WebhookEntry = {
  id: '1',
  timestamp: '2024-03-15T10:00:00Z',
  event: 'transfer',
  status: 'success',
};

describe('WebhookLogCard', () => {
  it('renders event name', () => {
    render(<WebhookLogCard entry={base} />);
    expect(screen.getByText('transfer')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<WebhookLogCard entry={base} />);
    expect(screen.getByText('success')).toBeInTheDocument();
  });

  it('renders failed status badge with correct class', () => {
    render(<WebhookLogCard entry={{ ...base, status: 'failed' }} />);
    const badge = screen.getByText('failed');
    expect(badge.className).toContain('red');
  });

  it('shows contract address when provided', () => {
    const addr = 'GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDE';
    render(<WebhookLogCard entry={{ ...base, contractAddress: addr }} />);
    expect(screen.getByText(/Contract:/)).toBeInTheDocument();
  });

  it('omits contract section when not provided', () => {
    render(<WebhookLogCard entry={base} />);
    expect(screen.queryByText(/Contract:/)).not.toBeInTheDocument();
  });

  it('shows amount and asset when provided', () => {
    render(<WebhookLogCard entry={{ ...base, amount: '100', asset: 'XLM' }} />);
    expect(screen.getByText(/Amount:/)).toBeInTheDocument();
    expect(screen.getByText(/XLM/)).toBeInTheDocument();
  });

  it('renders tx hash link with explorer href', () => {
    const hash = 'abc123def456';
    render(<WebhookLogCard entry={{ ...base, txHash: hash }} />);
    const link = screen.getByRole('link', { name: /View transaction/ });
    expect(link).toHaveAttribute('href', expect.stringContaining(hash));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits tx section when txHash not provided', () => {
    render(<WebhookLogCard entry={base} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
