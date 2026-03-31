import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceCodeModal } from '../../src/renderer/components/DeviceCodeModal';

describe('DeviceCodeModal', () => {
  const defaultProps = {
    userCode: 'ABCD-1234',
    verificationUri: 'https://microsoft.com/devicelogin',
    expiresIn: 900,
    onCancel: vi.fn(),
  };

  it('renders the user code prominently', () => {
    render(<DeviceCodeModal {...defaultProps} />);
    expect(screen.getByText('ABCD-1234')).toBeInTheDocument();
  });

  it('tells the user a browser has opened', () => {
    render(<DeviceCodeModal {...defaultProps} />);
    expect(screen.getByText(/browser window has opened/i)).toBeInTheDocument();
  });

  it('renders sign-in instructions', () => {
    render(<DeviceCodeModal {...defaultProps} />);
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(<DeviceCodeModal {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows a countdown timer', () => {
    render(<DeviceCodeModal {...defaultProps} />);
    expect(screen.getByTestId('expiry-timer')).toBeInTheDocument();
  });
});
