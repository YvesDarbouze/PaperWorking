/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RentRollCard from '../components/project/RentRollCard';
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
  id: 'proj-rent-roll-123',
  address: '123 Main St, New York, NY',
  currentPhase: 4,
  status: 'exit',
  phaseStatus: 'Phase 4: Exit',
  dispositionType: 'RENT',
  entryStage: 'Exit',
  createdAt: new Date().toISOString(),
  financials: {
    numberOfUnits: 2,
    daysOccupied: 40,
    totalHoldDays: 60,
    rent_received: [
      {
        id: 'rent-existing-1',
        amount: 1200,
        date: '2026-07-01',
        unit: 'Unit 101',
        tenantName: 'John Doe',
        confirmed: true,
        source: 'manual',
      }
    ]
  }
} as any;

describe('RentRollCard component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders card header, manual log button, and connect plaid button initially', () => {
    render(<RentRollCard project={mockProject} refresh={jest.fn()} />);

    expect(screen.getByText('Rent Roll & Occupancy Tracker')).toBeDefined();
    expect(screen.getByText('Verified Rent Roll Ledger')).toBeDefined();
    expect(screen.getByText(/Connect Plaid/)).toBeDefined();
    expect(screen.getByText('Log Payment')).toBeDefined();
  });

  it('displays verified rent ledger entries correctly', () => {
    render(<RentRollCard project={mockProject} refresh={jest.fn()} />);

    expect(screen.getByText('Unit 101')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('$1200')).toBeDefined();
  });

  it('opens and submits manual rent entry form', async () => {
    render(<RentRollCard project={mockProject} refresh={jest.fn()} />);

    const logPaymentBtn = screen.getByText('Log Payment');
    await act(async () => {
      fireEvent.click(logPaymentBtn);
    });

    expect(screen.getByText('Manual Rent payment entry')).toBeDefined();

    const unitInput = screen.getByPlaceholderText('e.g. Unit 101');
    const tenantInput = screen.getByPlaceholderText('e.g. Alice Vance');
    const amountInput = screen.getByPlaceholderText('e.g. 1500');

    await act(async () => {
      fireEvent.change(unitInput, { target: { value: 'Unit 102' } });
      fireEvent.change(tenantInput, { target: { value: 'Jane Smith' } });
      fireEvent.change(amountInput, { target: { value: '1600' } });
    });

    const submitBtn = screen.getByText('Add Rent Entry');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-rent-roll-123',
      expect.objectContaining({
        rent_received: expect.arrayContaining([
          expect.objectContaining({
            unit: 'Unit 102',
            tenantName: 'Jane Smith',
            amount: 1600,
            source: 'manual',
          })
        ])
      })
    );
  });

  it('toggles Plaid Bank Feed and confirms proposed transaction', async () => {
    render(<RentRollCard project={mockProject} refresh={jest.fn()} />);

    const plaidBtn = screen.getByText(/Connect Plaid/);
    await act(async () => {
      fireEvent.click(plaidBtn);
    });

    expect(screen.getByText(/Plaid Feed Linked/)).toBeDefined();
    expect(screen.getByText(/Plaid Auto-Attribution: Rent Payments Detected/)).toBeDefined();
    expect(screen.getByText('Alice Vance (Unit 101)')).toBeDefined();

    const confirmBtns = screen.getAllByTitle('Confirm Payment');
    await act(async () => {
      fireEvent.click(confirmBtns[0]);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-rent-roll-123',
      expect.objectContaining({
        rent_received: expect.arrayContaining([
          expect.objectContaining({
            unit: 'Unit 101',
            tenantName: 'Alice Vance',
            amount: 1500,
            source: 'plaid',
          })
        ])
      })
    );
  });

  it('saves unit occupancy calculations', async () => {
    render(<RentRollCard project={mockProject} refresh={jest.fn()} />);

    const saveOccupancyBtn = screen.getByText('Save Occupancy');
    await act(async () => {
      fireEvent.click(saveOccupancyBtn);
    });

    expect(mockUpdateProjectFinancials).toHaveBeenCalledWith(
      'proj-rent-roll-123',
      expect.objectContaining({
        daysOccupied: 40,
        totalHoldDays: 60,
      })
    );
  });
});
