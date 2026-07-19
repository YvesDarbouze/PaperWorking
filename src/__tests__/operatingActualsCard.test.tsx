/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import OperatingActualsCard from '../components/project/OperatingActualsCard';
import type { Project } from '@/types/schema';

// Setup Mocks
const mockUpdateProjectFinancials = jest.fn();

if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: () => 'mocked-uuid-' + Math.random().toString(36).substring(2, 9),
    },
    writable: true,
  });
}

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    updateProjectFinancials: mockUpdateProjectFinancials,
  }),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock posthog
jest.mock('posthog-js', () => ({
  capture: jest.fn(),
}));

const mockProjectBase: Project = {
  id: 'proj-opex-123',
  address: '123 Opex Ave',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'RENT',
  createdAt: new Date().toISOString(),
  financials: {
    monthlyGrossRent: 2000,
    management_pct: 10,
    holdingCostTaxes: 150,
    holdingCostInsurance: 60,
    holdingCostUtilities: 100,
    rent_received: [
      { id: 'rent-1', amount: 2000, date: '2026-07-01', unit: 'Unit A', confirmed: true, source: 'manual' }
    ],
    opex_tax: [
      { id: 'tax-1', amount: 150, date: '2026-07-01', confirmed: true, source: 'manual', notes: 'County tax first half' }
    ],
  },
  roleLinkedDocuments: [],
} as any;

describe('OperatingActualsCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the opex actual summary numbers and the list of categories', () => {
    render(
      <OperatingActualsCard
        project={mockProjectBase}
        refresh={jest.fn()}
      />
    );

    // Verify actuals summary NOI: Revenue ($2,000) - Tax ($150) = $1,850.00
    expect(screen.getByText('Actual Operating Revenue')).toBeDefined();
    expect(screen.getByText('$2,000.00')).toBeDefined();
    expect(screen.getAllByText('$150.00')[0]).toBeDefined();
    expect(screen.getByText('$1,850.00')).toBeDefined();

    // Verify categories are listed
    expect(screen.getByText('Property Tax')).toBeDefined();
    expect(screen.getByText('Insurance')).toBeDefined();
    expect(screen.getByText('Property Management')).toBeDefined();
    expect(screen.getByText('Maintenance & Repairs')).toBeDefined();
  });

  it('toggles to property management category and shows management opex ledger list', () => {
    render(
      <OperatingActualsCard
        project={mockProjectBase}
        refresh={jest.fn()}
      />
    );

    const pmBtn = screen.getByText('Property Management').closest('button')!;
    fireEvent.click(pmBtn);

    // Verify the Property Management ledger details are shown
    expect(screen.getByText('PM fee on Gross Scheduled Rent basis (BUG-8)')).toBeDefined();
  });

  it('allows connecting Plaid and confirming a proposed gross scheduled PM fee (BUG-8)', async () => {
    render(
      <OperatingActualsCard
        project={mockProjectBase}
        refresh={jest.fn()}
      />
    );

    // Go to property management category
    const pmBtn = screen.getByText('Property Management').closest('button')!;
    fireEvent.click(pmBtn);

    // Connect Plaid
    const connectBtn = screen.getByRole('button', { name: 'Connect Plaid Bank Feed' });
    fireEvent.click(connectBtn);

    expect(screen.getByText('Plaid Connected')).toBeDefined();

    // PM proposal: 10% of $2,000 scheduled gross = $200
    expect(screen.getByText('RPM Management Fee - 10% on Gross scheduled basis (BUG-8)')).toBeDefined();
    expect(screen.getByText('$200.00')).toBeDefined();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-opex-123',
      expect.objectContaining({
        opex_management: [
          expect.objectContaining({
            amount: 200,
            confirmed: true,
            source: 'plaid',
          })
        ]
      })
    );
  });

  it('allows logging manual expense items', async () => {
    render(
      <OperatingActualsCard
        project={mockProjectBase}
        refresh={jest.fn()}
      />
    );

    const amountInput = screen.getByPlaceholderText('e.g. 250');
    const noteInput = screen.getByPlaceholderText('e.g. Roof repair');

    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '185.50' } });
      fireEvent.change(noteInput, { target: { value: 'County tax installment' } });
    });

    const submitBtn = screen.getByRole('button', { name: 'Log Expense' });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-opex-123',
      expect.objectContaining({
        opex_tax: [
          expect.objectContaining({ id: 'tax-1', amount: 150 }),
          expect.objectContaining({
            amount: 185.5,
            notes: 'County tax installment',
            confirmed: true,
            source: 'manual',
          })
        ]
      })
    );
  });

  it('allows deleting logged expense entry', async () => {
    render(
      <OperatingActualsCard
        project={mockProjectBase}
        refresh={jest.fn()}
      />
    );

    const deleteBtn = screen.getByTitle('Delete entry');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-opex-123',
      expect.objectContaining({
        opex_tax: []
      })
    );
  });
});
