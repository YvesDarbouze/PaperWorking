/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EquityPayoutManager from '../components/reporting/EquityPayoutManager';
import { useProjectStore } from '@/store/projectStore';

// Mock the project store
const mockProjects = [
  {
    id: 'deal-1',
    propertyName: 'Miami Condo',
    status: 'exit',
    dispositionType: 'SALE',
    financials: {
      actualSalePrice: 350000,
      purchasePrice: 200000,
      costs: [{ amount: 50000, approved: true }],
      buyersAgentCommission: 3,
      sellersAgentCommission: 3,
      finalClosingCosts: 5000,
    },
    fractionalInvestors: [
      { id: 'i1', name: 'Alice', equityPercentage: 60 },
      { id: 'i2', name: 'Bob', equityPercentage: 40 },
    ],
  },
  {
    id: 'deal-2',
    propertyName: 'Orlando Villa',
    status: 'acquisition',
    financials: {
      purchasePrice: 150000,
      costs: [],
    },
    rehab: {
      baseBudget: 20000,
    },
    fractionalInvestors: [],
  },
];

jest.mock('@/store/projectStore', () => ({
  useProjectStore: (selector: any) => selector({ projects: mockProjects }),
}));

describe('EquityPayoutManager Component', () => {
  it('renders dropdown and placeholder state when no property is selected', () => {
    render(<EquityPayoutManager />);

    expect(screen.getByText(/Equity Payout Automation/i)).toBeTruthy();
    expect(screen.getByText(/Please select a property from the dropdown to load the capital stack/i)).toBeTruthy();
  });

  it('renders capital stack and payouts when a sold property is selected', () => {
    render(<EquityPayoutManager />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'deal-1' } });

    // Status banner check
    expect(screen.getByText(/REALIZED PROFIT/i)).toBeTruthy();

    // Investors table check
    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('60.0%')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('40.0%')).toBeTruthy();
  });

  it('renders placeholder or message when active property is selected with no investors', () => {
    render(<EquityPayoutManager />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'deal-2' } });

    // Status banner check
    expect(screen.getByText(/PROJECTED PROFIT/i)).toBeTruthy();
    expect(screen.getByText(/No investors on this deal yet. You hold 100% equity/i)).toBeTruthy();
  });
});
