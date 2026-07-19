/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import CrowdfundingReconciliation from '../components/exit/CrowdfundingReconciliation';
import type { Project } from '@/types/schema';

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } }),
}));

const mockCompletedProject: Project = {
  id: 'proj-comp-123',
  name: 'Pinehurst Apartments',
  address: '123 Pinehurst Ave',
  currentPhase: 4,
  reiStatus: 'realized',
  dispositionType: 'SELL',
  organizationId: 'org-456',
  locked: true,
  financials: {
    purchasePrice: 1000000,
    estimatedARV: 1500000,
    actualSalePrice: 1600000,
    exitRealized: true,
    realizedAt: '2026-07-19T00:00:00Z',
    buyersAgentCommission: 2.5,
    sellersAgentCommission: 2.5,
    finalClosingCosts: 10000,
    totalHoldingCosts: 5000,
    loanAmount: 600000,
    costs: [{ id: 'rehab-1', category: 'Renovation', amount: 50000, description: 'Rehab' }]
  },
  fractionalInvestors: [
    {
      id: 'inv-1',
      name: 'Alice Capital',
      email: 'alice@example.com',
      equityPercentage: 60,
      contributionAmount: 240000,
      status: 'confirmed',
      partyType: 'Investor'
    },
    {
      id: 'inv-2',
      name: 'Bob Trust',
      email: 'bob@example.com',
      equityPercentage: 40,
      contributionAmount: 160000,
      status: 'confirmed',
      partyType: 'Investor'
    }
  ]
} as any;

describe('Sale Completion & Equity Distributions (E1.S / Decision F-1)', () => {
  it('computes and renders investor distributions when structure exists', () => {
    render(<CrowdfundingReconciliation deal={mockCompletedProject} />);

    // Header title
    expect(screen.getByText('Crowdfunding Reconciliation')).toBeDefined();
    expect(screen.getByText('Investors: 2')).toBeDefined();

    // Table rows
    expect(screen.getByText('Alice Capital')).toBeDefined();
    expect(screen.getByText('Bob Trust')).toBeDefined();

    // Verification of Decision F-1 notice
    expect(screen.getByText(/Distribution movements are recorded off-platform per Decision F-1/)).toBeDefined();
  });
});
