/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitleHoldingCard } from '../components/project/TitleHoldingCard';
import { deriveAllProjectMetrics } from '../lib/metrics/reiMetrics';
import type { Project } from '@/types/schema';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
}));

const mockProjectBase: Project = {
  id: 'proj_test_co_buy',
  propertyName: 'Test Co-buy Property',
  address: '456 Co-buy Lane',
  status: 'fund',
  organizationId: 'org_test_888',
  members: {},
  financials: {
    purchasePrice: 279000,
    capitalPlan: 'partnership',
    titleHolding: 'TIC',
    titleHoldingDerived: true,
  },
  fractionalInvestors: [
    {
      id: 'party_a',
      name: 'Party A',
      email: 'a@paperworking.com',
      contributionAmount: 167400, // 60.00%
      equityPercentage: 60,
      status: 'confirmed',
    },
    {
      id: 'party_b',
      name: 'Party B',
      email: 'b@paperworking.com',
      contributionAmount: 111600, // 40.00%
      equityPercentage: 40,
      status: 'confirmed',
    }
  ]
} as any;

describe('Card F2.2 Title Holding & FX-2 Engine Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deriveAllProjectMetrics Splits Math Engine', () => {
    it('computes proportional TIC splits correctly (Initial State)', () => {
      const derived = deriveAllProjectMetrics(mockProjectBase);
      expect(derived.totalCoBuyBasis).toBe(279000);
      expect(derived.coBuyShares).toBeDefined();
      expect(derived.coBuyShares!.length).toBe(2);

      const shareA = derived.coBuyShares!.find(s => s.id === 'party_a')!;
      const shareB = derived.coBuyShares!.find(s => s.id === 'party_b')!;

      expect(shareA.ownershipPct).toBe(60.00);
      expect(shareB.ownershipPct).toBe(40.00);
      expect(shareA.ownershipPct + shareB.ownershipPct).toBe(100.00);
    });

    it('recomputes splits upon Party B capital addition (FX-2 scenario)', () => {
      const updatedProject = {
        ...mockProjectBase,
        fractionalInvestors: [
          {
            id: 'party_a',
            name: 'Party A',
            contributionAmount: 167400,
            equityPercentage: 60,
            status: 'confirmed',
          },
          {
            id: 'party_b',
            name: 'Party B',
            contributionAmount: 121600, // Added $10,000 capital ($111,600 + $10,000)
            equityPercentage: 40,
            status: 'confirmed',
          }
        ]
      } as any;

      const derived = deriveAllProjectMetrics(updatedProject);
      expect(derived.totalCoBuyBasis).toBe(289000);

      const shareA = derived.coBuyShares!.find(s => s.id === 'party_a')!;
      const shareB = derived.coBuyShares!.find(s => s.id === 'party_b')!;

      // A = 167,400 / 289,000 = 57.9238% -> 57.92%
      // B = 121,600 / 289,000 = 42.0761% -> 42.08%
      expect(shareA.ownershipPct).toBe(57.92);
      expect(shareB.ownershipPct).toBe(42.08);
      expect(shareA.ownershipPct + shareB.ownershipPct).toBe(100.00);
    });

    it('enforces equal splits regardless of contributions in JTWROS mode', () => {
      const jtwrosProject = {
        ...mockProjectBase,
        financials: {
          ...mockProjectBase.financials,
          titleHolding: 'JTWROS',
        }
      } as any;

      const derived = deriveAllProjectMetrics(jtwrosProject);
      const shareA = derived.coBuyShares!.find(s => s.id === 'party_a')!;
      const shareB = derived.coBuyShares!.find(s => s.id === 'party_b')!;

      expect(shareA.ownershipPct).toBe(50.00);
      expect(shareB.ownershipPct).toBe(50.00);
      expect(shareA.ownershipPct + shareB.ownershipPct).toBe(100.00);
    });
  });

  describe('TitleHoldingCard UI Component', () => {
    const mockOnSaveFinancials = jest.fn();
    const mockRefresh = jest.fn();

    it('renders title holding selection cards and explainer texts', () => {
      render(
        <TitleHoldingCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      expect(screen.getByText('Card F2.2 — Title Holding (Co-buy)')).toBeDefined();
      expect(screen.getByText('Vesting Modality Selection')).toBeDefined();
      expect(screen.getByText('Tenants in Common')).toBeDefined();
      expect(screen.getByText('Joint Tenancy (JTWROS)')).toBeDefined();
    });

    it('invokes handleTypeChange when clicking Joint Tenancy button', () => {
      render(
        <TitleHoldingCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      const jtwrosBtn = screen.getByText('Joint Tenancy (JTWROS)').closest('button')!;
      fireEvent.click(jtwrosBtn);

      expect(mockOnSaveFinancials).toHaveBeenCalledWith({ titleHolding: 'JTWROS' });
    });

    it('runs live recalculations inside the FX-2 simulator tool when toggled', () => {
      render(
        <TitleHoldingCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      const simBtn = screen.getByText('Simulate Event').closest('button')!;
      
      // Before simulation
      expect(screen.getAllByText('60.00%').length).toBeGreaterThan(0);
      expect(screen.getAllByText('40.00%').length).toBeGreaterThan(0);

      // Trigger capital addition simulation
      fireEvent.click(simBtn);

      // Verify simulated basis and recalculated splits display
      expect(screen.getByText('Active (Basis +$10k)')).toBeDefined();
      expect(screen.getByText('$289,000')).toBeDefined();
      expect(screen.getByText('57.92%')).toBeDefined();
      expect(screen.getByText('42.08%')).toBeDefined();
    });

    it('handles signature status change via checklist selector', () => {
      render(
        <TitleHoldingCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          refresh={mockRefresh}
        />
      );

      const select = screen.getByRole('combobox')!;
      fireEvent.change(select, { target: { value: 'verified' } });

      expect(mockOnSaveFinancials).toHaveBeenCalledWith({ titleCoOwnershipAgreementStatus: 'verified' });
    });

    it('renders manual input fields and validates split sums in manual TIC mode', () => {
      const manualTicProject = {
        ...mockProjectBase,
        financials: {
          ...mockProjectBase.financials,
          titleHolding: 'TIC',
          titleHoldingDerived: false, // manual mode
        }
      } as any;

      const mockOnSaveProject = jest.fn();

      render(
        <TitleHoldingCard
          project={manualTicProject}
          onSaveFinancials={mockOnSaveFinancials}
          onSaveProject={mockOnSaveProject}
          refresh={mockRefresh}
        />
      );

      // Check manual input fields are rendered
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs.length).toBe(2);

      // Change splits to non-100% values (e.g. 50% and 40%)
      fireEvent.change(inputs[0], { target: { value: '50' } });
      fireEvent.change(inputs[1], { target: { value: '40' } });

      // Should show warning validation text
      expect(screen.getByText(/Splits must sum to exactly 100.00%/)).toBeDefined();

      // Change splits to exactly 100% (e.g. 50% and 50%)
      fireEvent.change(inputs[0], { target: { value: '50' } });
      fireEvent.change(inputs[1], { target: { value: '50' } });

      // Should show success text
      expect(screen.getByText('✓ Splits sum to exactly 100.00%')).toBeDefined();

      // Click "Save Manual Splits"
      const saveBtn = screen.getByText('Save Manual Splits').closest('button')!;
      fireEvent.click(saveBtn);

      // Verifies that updated equity percentages are saved to the project
      expect(mockOnSaveProject).toHaveBeenCalledWith({
        fractionalInvestors: [
          expect.objectContaining({ id: 'party_a', equityPercentage: 50 }),
          expect.objectContaining({ id: 'party_b', equityPercentage: 50 }),
        ]
      });
    });

    it('enforces and saves equal splits to the database when JTWROS is chosen', async () => {
      const mockOnSaveProject = jest.fn();

      render(
        <TitleHoldingCard
          project={mockProjectBase}
          onSaveFinancials={mockOnSaveFinancials}
          onSaveProject={mockOnSaveProject}
          refresh={mockRefresh}
        />
      );

      // Select JTWROS card option
      const jtwrosBtn = screen.getByText('Joint Tenancy (JTWROS)').closest('button')!;
      fireEvent.click(jtwrosBtn);

      // Verifies that equal shares are computed (50.00% each for 2 investors) and saved to database
      expect(mockOnSaveProject).toHaveBeenCalledWith({
        fractionalInvestors: [
          expect.objectContaining({ id: 'party_a', equityPercentage: 50 }),
          expect.objectContaining({ id: 'party_b', equityPercentage: 50 }),
        ],
        financials: expect.objectContaining({
          titleHolding: 'JTWROS'
        })
      });
    });
  });
});
