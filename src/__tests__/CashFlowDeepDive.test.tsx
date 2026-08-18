/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CashFlowDeepDive from '../components/dashboard/financials/CashFlowDeepDive';

// Mock hook
let mockSnapshots: any[] = [];
jest.mock('@/hooks/usePortfolioMetricSnapshots', () => ({
  usePortfolioMetricSnapshots: () => ({ snapshots: mockSnapshots }),
}));

describe('CashFlowDeepDive Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshots = [];
  });

  it('renders DSCR status, annual/monthly debt figures, and default title', () => {
    render(
      <CashFlowDeepDive
        annualDebtService={24000}
        monthlyPI={2000}
        dscr={1.25}
        cashFlow={6000}
      />
    );

    // DSCR title and value
    expect(screen.getByText('DSCR')).toBeTruthy();
    expect(screen.getByText('1.25x')).toBeTruthy();
    expect(screen.getByText('Strong')).toBeTruthy();

    // Debt service readouts
    expect(screen.getByText('Annual Debt Service')).toBeTruthy();
    expect(screen.getByText('$24,000/yr')).toBeTruthy();
    expect(screen.getByText('Monthly P&I')).toBeTruthy();
    expect(screen.getByText('$2,000/mo')).toBeTruthy();

    // Cash Flow Trend header
    expect(screen.getByText('Cash Flow Trend')).toBeTruthy();
    expect(screen.getByText('$500/mo')).toBeTruthy(); // 6000 / 12 = 500
  });

  it('enforces Honesty Rule: shows "Collecting data" state when there are fewer than 2 snapshots', () => {
    mockSnapshots = [
      {
        date: new Date(2026, 0, 1),
        period: '2026-01',
        monthlyCashFlow: 500,
      },
    ];

    render(
      <CashFlowDeepDive
        annualDebtService={24000}
        monthlyPI={2000}
        dscr={1.25}
        cashFlow={6000}
      />
    );

    // Should display the "Collecting data" message
    expect(screen.getByText(/Collecting data/i)).toBeTruthy();
    
    // Polyline should not be rendered
    const polyline = document.querySelector('polyline');
    expect(polyline).toBeNull();
  });

  it('renders real sparkline points when 2 or more snapshots are available', () => {
    mockSnapshots = [
      {
        date: new Date(2026, 0, 1),
        period: '2026-01',
        monthlyCashFlow: 500,
      },
      {
        date: new Date(2026, 1, 1),
        period: '2026-02',
        monthlyCashFlow: 600,
      },
    ];

    render(
      <CashFlowDeepDive
        annualDebtService={24000}
        monthlyPI={2000}
        dscr={1.25}
        cashFlow={6000}
      />
    );

    // "Collecting data" message should not be present
    expect(screen.queryByText(/Collecting data/i)).toBeNull();

    // SVG elements should be rendered
    const polyline = document.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline?.getAttribute('points')).toBeTruthy();

    // Area path should exist
    const areaPath = document.querySelector('path');
    expect(areaPath).not.toBeNull();
    expect(areaPath?.getAttribute('d')).toBeTruthy();

    // Data-point circle elements should exist
    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBe(2);
  });

  it('displays tooltip on hover over data points', () => {
    mockSnapshots = [
      {
        date: new Date(2026, 0, 1),
        period: '2026-01',
        monthlyCashFlow: 500,
      },
      {
        date: new Date(2026, 1, 1),
        period: '2026-02',
        monthlyCashFlow: 600,
      },
    ];

    render(
      <CashFlowDeepDive
        annualDebtService={24000}
        monthlyPI={2000}
        dscr={1.25}
        cashFlow={6000}
      />
    );

    const circles = document.querySelectorAll('circle');
    expect(circles.length).toBe(2);

    // Initially no tooltip overlay should be found
    expect(screen.queryByText(/Jan 26 · \$500/i)).toBeNull();

    // Hover over the first data point
    fireEvent.mouseEnter(circles[0], { pageX: 100, pageY: 200 });

    // Tooltip should be visible
    expect(screen.getByText(/Jan 26 · \$500/i)).toBeTruthy();

    // Move mouse out
    fireEvent.mouseLeave(circles[0]);

    // Tooltip should disappear
    expect(screen.queryByText(/Jan 26 · \$500/i)).toBeNull();
  });
});
