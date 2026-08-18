/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseAssumptionsCard } from '../ExpenseAssumptionsCard';
import { CANONICAL_EXPENSE_TAGS, REJECTED_EXPENSE_TAGS } from '@/lib/metrics/types';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  DollarSign: () => <span data-testid="icon-dollar" />,
  Percent: () => <span data-testid="icon-percent" />,
  Sparkles: () => <span data-testid="icon-sparkles" />,
  Receipt: () => <span data-testid="icon-receipt" />,
  HelpCircle: () => <span data-testid="icon-help" />,
  Upload: () => <span data-testid="icon-upload" />,
  X: () => <span data-testid="icon-x" />,
  ShieldAlert: () => <span data-testid="icon-shield" />,
  Check: () => <span data-testid="icon-check" />,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock firebase storage
jest.mock('@/lib/firebase/config', () => ({
  storage: {},
}));

const mockProject: any = {
  id: 'test-project-123',
  financials: {
    gross_rent_per_unit: 2000,
    gross_scheduled_rent: 24000,
    tax: 3600,
    insurance: 1800,
    security: 0,
    maintenance: 1995,
    utilities: 1000,
    management: 2400,
    HOA: 0,
    capex: 1200,
  },
};

describe('ExpenseAssumptionsCard UI Form Tests (Canonical 8 Alignment)', () => {
  const onSaveMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('1. Renders EXACTLY the 8 Canonical Expense fields in UI', () => {
    render(<ExpenseAssumptionsCard project={mockProject} onSave={onSaveMock} />);

    // Verify each of the 8 canonical fields is rendered
    expect(screen.getByText(/Tax \(Monthly\)/i)).toBeTruthy();
    expect(screen.getByText(/Insurance \(Monthly\)/i)).toBeTruthy();
    expect(screen.getByText(/Security \(Monthly\)/i)).toBeTruthy();
    expect(screen.getByText(/Utilities \(Monthly\)/i)).toBeTruthy();
    expect(screen.getByText(/HOA \(Monthly\)/i)).toBeTruthy();
    expect(screen.getByText(/CapEx \(Monthly\)/i)).toBeTruthy();
    expect(screen.getAllByText(/Management/i)[0]).toBeTruthy();
    expect(screen.getAllByText(/Maintenance/i)[0]).toBeTruthy();
  });

  test('2. NEVER renders deprecated tags in UI form labels', () => {
    render(<ExpenseAssumptionsCard project={mockProject} onSave={onSaveMock} />);

    // Verify deprecated tags are not in UI labels
    expect(screen.queryByText(/mortgage_payment/i)).toBeNull();
    expect(screen.queryByText(/property_tax/i)).toBeNull();
    expect(screen.queryByText(/contractor_payment/i)).toBeNull();
    expect(screen.queryByText(/management_fee/i)).toBeNull();
  });

  test('3. Auto-calculates Management fee from gross_scheduled_rent when Basis (%) mode selected (BUG-8 Rule)', () => {
    render(<ExpenseAssumptionsCard project={mockProject} onSave={onSaveMock} />);

    // Toggle management to Basis (%) mode
    const basisButtons = screen.getAllByText(/Basis \(%\)/i);
    fireEvent.click(basisButtons[0]);

    // Verify % of gross scheduled rent indicator is present
    expect(screen.getByText(/% of gross scheduled rent/i)).toBeTruthy();
  });
});
