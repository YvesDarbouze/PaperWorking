/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CrowdfundingReconciliation from '../components/exit/CrowdfundingReconciliation';
import type { Project } from '@/types/schema';
import { useProjectStore } from '@/store/projectStore';
import { projectsService } from '@/lib/firebase/projects';

// Mock Auth Context
jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-123' } }),
}));

// Mock Project Store
const mockSetDeals = jest.fn();
jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    projects: [mockCompletedProject],
    setDeals: mockSetDeals
  }),
}));

// Mock projectsService
jest.mock('@/lib/firebase/projects', () => ({
  projectsService: {
    updateProject: jest.fn().mockResolvedValue({}),
  },
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('allows Lead Investor to record distribution payment and evidence off-platform', async () => {
    render(<CrowdfundingReconciliation deal={mockCompletedProject} />);

    // Find and click "Record Payment" for Alice
    const recordButtons = screen.getAllByRole('button', { name: /Record Payment/i });
    expect(recordButtons).toHaveLength(2);
    fireEvent.click(recordButtons[0]);

    // Check that inline input is revealed
    const input = screen.getByPlaceholderText(/e.g. Wire reference #W89381/i);
    expect(input).toBeDefined();

    // Type evidence reference
    fireEvent.change(input, { target: { value: 'Wire ref #998877' } });

    // Click "Confirm Paid"
    const confirmButton = screen.getByRole('button', { name: /Confirm Paid/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(projectsService.updateProject).toHaveBeenCalledWith('proj-comp-123', {
        fractionalInvestors: expect.arrayContaining([
          expect.objectContaining({
            id: 'inv-1',
            distributionStatus: 'confirmed',
            distributionEvidence: 'Wire ref #998877'
          })
        ])
      });
    });

    expect(mockSetDeals).toHaveBeenCalled();
  });
});
