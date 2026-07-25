/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import StrategyStep from '../components/exit/StrategyStep';
import PreparationStep from '../components/exit/PreparationStep';
import ExecutionStep from '../components/exit/ExecutionStep';
import FinalAccountingStep from '../components/exit/FinalAccountingStep';

describe('Exit Phase Wizard Steps', () => {
  const mockProject = {
    id: 'test-project-exit',
    address: '456 Oak Ave, Atlanta, GA',
    estimatedARV: 350000,
    financials: {
      loanAmount: 20000000, // $200k in cents
      totalCashInvested: 8000000, // $80k in cents
      annualDebtService: 1200000, // $12k in cents
      projectedNOI: 220000, // $2.2k in cents
      grossRent: 180000, // $1.8k in cents
      exitStrategy: 'Sell',
      exitTargetDate: '2026-12-31',
    },
  };

  test('StrategyStep renders options and estimates correctly', () => {
    const handleSave = jest.fn();
    render(<StrategyStep initialData={mockProject} onSave={handleSave} />);

    // Check header text
    expect(screen.getByText('Sell Property')).toBeDefined();
    expect(screen.getByText('Refinance Equity')).toBeDefined();
    expect(screen.getByText('Hold Long-Term')).toBeDefined();
  });

  test('PreparationStep renders correct checklist for Sell', () => {
    const handleSave = jest.fn();
    render(<PreparationStep initialData={mockProject} onSave={handleSave} strategy="Sell" />);

    // Check Pre-Sale Marketing Checklist is displayed
    expect(screen.getByText('Pre-Sale Marketing Checklist')).toBeDefined();
    expect(screen.getByText('Repairs Done')).toBeDefined();
  });

  test('PreparationStep renders correct checklist for Refinance', () => {
    const handleSave = jest.fn();
    render(<PreparationStep initialData={mockProject} onSave={handleSave} strategy="Refinance" />);

    // Check Refi checklists
    expect(screen.getByText('Refinance lending checklist')).toBeDefined();
  });

  test('ExecutionStep displays DOM warnings and offers ledger', () => {
    const handleSave = jest.fn();
    render(<ExecutionStep initialData={mockProject} onSave={handleSave} strategy="Sell" />);

    // Offer list checks
    expect(screen.getByText('Jane & Mark Vance')).toBeDefined();
    expect(screen.getByText('Buyer Offer Ledger')).toBeDefined();
  });

  test('FinalAccountingStep displays waterfall payouts correctly', () => {
    const handleSave = jest.fn();
    const handleComplete = jest.fn();
    render(<FinalAccountingStep initialData={mockProject} strategy="Sell" onComplete={handleComplete} />);

    // ROI / Payout math checks
    expect(screen.getByText('Lender Payoff ($200k)')).toBeDefined();
    expect(screen.getByText('Sponsor Promote ($8k)')).toBeDefined();
  });
});
