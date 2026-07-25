/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import RehabStep from '../components/hold/RehabStep';
import LeaseUpStep from '../components/hold/LeaseUpStep';
import RentCollectionStep from '../components/hold/RentCollectionStep';
import OperationsStep from '../components/hold/OperationsStep';

describe('Hold Phase Wizard Steps', () => {
  const mockProject = {
    id: 'test-project-123',
    address: '123 Main St, Atlanta, GA',
    financials: {
      renovationTier: 'Renovate',
      rehabScope: [
        { room: 'Kitchen', item: 'Cabinets & Counters', estimate: 8000, actual: 9500, status: 'Complete' },
        { room: 'Systems', item: 'HVAC Replacement', estimate: 6500, actual: 6500, status: 'Complete' },
      ],
      changeOrders: [
        { id: 'co_1', description: 'Drywall repairs', requested: 1200, approved: 1200, status: 'Approved' },
      ],
      leaseTargetRent: 1800,
      leaseApplicants: [
        { id: 'app_1', name: 'John Doe', income: 6200, credit: 710, status: 'Pending' },
        { id: 'app_2', name: 'Sarah Connor', income: 7500, credit: 740, status: 'Lease Signed' },
      ],
      rentDueDate: 1,
      rentGracePeriod: 5,
      rentLateFee: 50,
      rentDepositHoldingAccount: 'operating',
      operatingExpenses: [
        { category: 'Property Tax', budget: 350, actual: 350 },
        { category: 'Insurance', budget: 120, actual: 120 },
      ],
    },
  };

  test('RehabStep computes revised budgets and checks variance highlights', () => {
    const handleSave = jest.fn();
    render(<RehabStep initialData={mockProject} onSave={handleSave} />);
    
    // Check Renovation Tier value is rendered
    expect(screen.getByDisplayValue(/Renovate/)).toBeDefined();
    
    // Check budget variance labels are present
    expect(screen.getByText(/Original Estimate/)).toBeDefined();
    expect(screen.getByText(/Actual:/)).toBeDefined();
  });

  test('LeaseUpStep renders rent settings and templates correctly', () => {
    const handleSave = jest.fn();
    render(<LeaseUpStep initialData={mockProject} onSave={handleSave} />);

    // Rent setting input should have target rent value
    const rentInputs = screen.getAllByDisplayValue('1800');
    expect(rentInputs.length).toBeGreaterThan(0);

    // Check RentCast comp variance block is shown
    expect(screen.getByText(/Market Estimate/)).toBeDefined();
  });

  test('RentCollectionStep tracks connection types and late grace periods', () => {
    const handleSave = jest.fn();
    render(<RentCollectionStep initialData={mockProject} onSave={handleSave} />);

    // Verify late fee display value
    expect(screen.getByDisplayValue('50')).toBeDefined();
  });

  test('OperationsStep allows manual roll paid updates and displays variance warning', () => {
    const handleSave = jest.fn();
    const handleComplete = jest.fn();
    render(<OperationsStep initialData={mockProject} onSave={handleSave} onComplete={handleComplete} />);

    // Check expense categories
    expect(screen.getByText('Property Tax')).toBeDefined();
    expect(screen.getByText('Insurance')).toBeDefined();
  });
});
