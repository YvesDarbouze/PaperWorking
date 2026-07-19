/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import LeaseOperationsCard from '../components/project/LeaseOperationsCard';
import type { Project } from '@/types/schema';

// Setup Mocks
const mockUpdateProjectFinancials = jest.fn();

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({
    updateProjectFinancials: mockUpdateProjectFinancials,
  }),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockProject: Project = {
  id: 'proj-lease-123',
  address: '456 Commercial Rd',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'LEASE',
  createdAt: new Date().toISOString(),
  financials: {
    lease_income: [
      {
        id: 'lease-existing-1',
        amount: 4000,
        date: '2026-07-01',
        confirmed: true,
        source: 'manual',
      }
    ],
    lease_terms: {
      rateCents: 450000,
      termMonths: 24,
      escalations: '3% annual',
      type: 'NNN'
    }
  }
} as any;

describe('LeaseOperationsCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card headers, inputs, and payment tables initially', () => {
    render(<LeaseOperationsCard project={mockProject} refresh={jest.fn()} />);

    expect(screen.getByText('Activated Lease Terms')).toBeDefined();
    expect(screen.getByText('Lease Payments & Receipts')).toBeDefined();
    expect((screen.getByPlaceholderText('e.g. 4500') as HTMLInputElement).value).toBe('4500');
    expect((screen.getByPlaceholderText('e.g. 12') as HTMLInputElement).value).toBe('24');
    expect((screen.getByPlaceholderText('e.g. 3% annual escalation starting Year 2') as HTMLInputElement).value).toBe('3% annual');
  });

  it('saves updated lease terms correctly', async () => {
    render(<LeaseOperationsCard project={mockProject} refresh={jest.fn()} />);

    const rateInput = screen.getByPlaceholderText('e.g. 4500');
    const termInput = screen.getByPlaceholderText('e.g. 12');
    const escalationInput = screen.getByPlaceholderText('e.g. 3% annual escalation starting Year 2');

    await act(async () => {
      fireEvent.change(rateInput, { target: { value: '5000' } });
      fireEvent.change(termInput, { target: { value: '36' } });
      fireEvent.change(escalationInput, { target: { value: '5% annual' } });
    });

    const submitBtn = screen.getByText('Update Lease Terms');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-lease-123',
      expect.objectContaining({
        lease_terms: {
          rateCents: 500000,
          termMonths: 36,
          escalations: '5% annual',
          type: 'NNN',
        }
      })
    );
  });

  it('submits manual lease payment entry', async () => {
    render(<LeaseOperationsCard project={mockProject} refresh={jest.fn()} />);

    const logPaymentBtn = screen.getByText('Log Payment');
    await act(async () => {
      fireEvent.click(logPaymentBtn);
    });

    expect(screen.getByText('Log Lease Payment Manually')).toBeDefined();

    const amountInput = screen.getByPlaceholderText('e.g. 3000');
    await act(async () => {
      fireEvent.change(amountInput, { target: { value: '4500' } });
    });

    const submitBtn = screen.getByText('Add Lease Payment');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-lease-123',
      expect.objectContaining({
        lease_income: expect.arrayContaining([
          expect.objectContaining({
            amount: 4500,
            source: 'manual',
          })
        ])
      })
    );
  });

  it('toggles Plaid Bank Feed and confirms proposed transaction', async () => {
    render(<LeaseOperationsCard project={mockProject} refresh={jest.fn()} />);

    const plaidBtn = screen.getByText('Connect Plaid');
    await act(async () => {
      fireEvent.click(plaidBtn);
    });

    expect(screen.getByText('Plaid Active')).toBeDefined();
    expect(screen.getByText('Plaid Detected Lease Transaction')).toBeDefined();
    expect(screen.getByText('Lexington Tech Corp')).toBeDefined();

    const confirmBtns = screen.getAllByRole('button');
    const confirmBtn = confirmBtns.find(btn => btn.querySelector('svg')?.classList.contains('lucide-check'));
    
    expect(confirmBtn).toBeDefined();
    await act(async () => {
      fireEvent.click(confirmBtn!);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-lease-123',
      expect.objectContaining({
        lease_income: expect.arrayContaining([
          expect.objectContaining({
            amount: 4500,
            source: 'plaid',
          })
        ])
      })
    );
  });
});
