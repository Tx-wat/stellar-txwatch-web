import React from 'react';
import { render, screen } from '@testing-library/react';
import MetadataSection from '../components/MetadataSection';

describe('MetadataSection', () => {
  it('renders label and value', () => {
    render(<MetadataSection label="Webhook URL" value="https://example.com" />);
    expect(screen.getByText('Webhook URL')).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
  });

  it('shows a formatted Created date when createdAt is provided', () => {
    const createdAt = new Date('2024-01-15T00:00:00Z').getTime();
    render(<MetadataSection label="Contract" value="C123" createdAt={createdAt} />);
    expect(screen.getByText(/Created/)).toBeInTheDocument();
  });

  it('does not show Created line when createdAt is omitted', () => {
    render(<MetadataSection label="Contract" value="C123" />);
    expect(screen.queryByText(/Created/)).not.toBeInTheDocument();
  });
});
