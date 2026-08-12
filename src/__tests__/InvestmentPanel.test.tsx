/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InvestmentPanel from '@/components/deals/InvestmentPanel';

describe('InvestmentPanel Component', () => {
  it('renders form with default fixed amount mode and USD currency selector', () => {
    render(<InvestmentPanel dealId="deal_123" fundingTarget={200000} committedAmount={100000} />);

    expect(screen.getByTestId('investment-panel')).toBeTruthy();
    expect(screen.getByTestId('mode-toggle-fixed')).toBeTruthy();
    expect(screen.getByTestId('currency-select')).toBeTruthy();
  });

  it('switches to percent mode and validates percentage max 100 limit', () => {
    render(<InvestmentPanel dealId="deal_123" fundingTarget={200000} committedAmount={100000} />);

    const percentBtn = screen.getByTestId('mode-toggle-percent');
    fireEvent.click(percentBtn);

    const input = screen.getByTestId('commitment-amount-input');
    fireEvent.change(input, { target: { value: '150' } });

    const submitBtn = screen.getByTestId('commit-submit-button');
    fireEvent.click(submitBtn);

    expect(screen.getByTestId('commitment-error-msg')).toBeTruthy();
    expect(screen.getByTestId('commitment-error-msg').textContent).toContain('100%');
  });

  it('triggers onCommitSuccess when a valid commitment is submitted', async () => {
    const mockSuccess = jest.fn();
    render(
      <InvestmentPanel
        dealId="deal_123"
        fundingTarget={200000}
        committedAmount={100000}
        onCommitSuccess={mockSuccess}
      />
    );

    const input = screen.getByTestId('commitment-amount-input');
    fireEvent.change(input, { target: { value: '25000' } });

    const submitBtn = screen.getByTestId('commit-submit-button');
    fireEvent.click(submitBtn);

    // Wait for async commitment
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(mockSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 25000,
        currency: 'USD',
        status: 'pending',
      })
    );
  });
});
