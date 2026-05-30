import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NetworkEditField } from '../components/NetworkEditField';

const noop = jest.fn();

describe('NetworkEditField', () => {
  beforeEach(() => noop.mockClear());

  it('renders current network and Edit button', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    expect(screen.getByText('mainnet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Edit network/ })).toBeInTheDocument();
  });

  it('clicking Edit shows the select input', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('shows caution warning when a different network is selected', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testnet' } });
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Network change warning/)).toBeInTheDocument();
  });

  it('caution message is network-specific', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testnet' } });
    expect(screen.getByText(/Switching to Testnet/)).toBeInTheDocument();
  });

  it('clicking Keep current dismisses the warning without calling onNetworkChange', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testnet' } });
    fireEvent.click(screen.getByRole('button', { name: /Keep current/ }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(noop).not.toHaveBeenCalled();
  });

  it('clicking Switch calls onNetworkChange with the new network', async () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'testnet' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm switch to testnet/ }));
    await waitFor(() => expect(noop).toHaveBeenCalledWith('testnet'));
  });

  it('does not show Edit button when disabled', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} disabled />);
    expect(screen.queryByRole('button', { name: /Edit network/ })).not.toBeInTheDocument();
  });

  it('Cancel button hides the select', () => {
    render(<NetworkEditField currentNetwork="mainnet" onNetworkChange={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Edit network/ }));
    fireEvent.click(screen.getByRole('button', { name: /Cancel network edit/ }));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
