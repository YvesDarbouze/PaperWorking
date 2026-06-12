/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Import Page Components
import GRMIntelligencePage from '@/app/dashboard/intelligence/grm/page';
import OERIntelligencePage from '@/app/dashboard/intelligence/oer/page';
import AppreciationIntelligencePage from '@/app/dashboard/intelligence/appreciation/page';
import OccupancyIntelligencePage from '@/app/dashboard/intelligence/occupancy/page';
import IRRIntelligencePage from '@/app/dashboard/intelligence/irr/page';
import DSCRIntelligencePage from '@/app/dashboard/intelligence/dscr/page';

// Mock ECharts & Lucide icons & toasts & hook dependencies to prevent rendering crashes
jest.mock('echarts-for-react', () => {
  return function MockReactECharts() {
    return <div data-testid="echarts-mock" />;
  };
});

jest.mock('lucide-react', () => {
  const original = jest.requireActual('lucide-react');
  return {
    ...original,
    ArrowUpRight: () => <span data-testid="ArrowUpRight" />,
    ArrowDownRight: () => <span data-testid="ArrowDownRight" />,
    Download: () => <span data-testid="Download" />,
    TrendingUp: () => <span data-testid="TrendingUp" />,
    RefreshCw: () => <span data-testid="RefreshCw" />,
  };
});

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueries: ({ queries }: any) =>
    (queries || []).map(() => ({
      status: 'success',
      data: {
        stats: {
          saleData: { medianPrice: 300000 },
          rentalData: { medianPrice: 2500 },
        },
      },
    })),
}));

jest.mock('@/hooks/useAllProjectsSync', () => ({
  useAllDealsSync: jest.fn(),
}));

jest.mock('next/link', () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});

// Mock selectors
const mockUseMetricSeries = jest.fn();
const mockUseMetricCurrent = jest.fn();
const mockUsePortfolioInputs = jest.fn();

jest.mock('@/lib/intelligence/selectors', () => ({
  useMetricSeries: (...args: any[]) => mockUseMetricSeries(...args),
  useMetricCurrent: (...args: any[]) => mockUseMetricCurrent(...args),
  usePortfolioInputs: (...args: any[]) => mockUsePortfolioInputs(...args),
}));

// Mock Terminals with init and mod buttons to simulate user interactions
jest.mock('@/components/intelligence/GRMTriageTerminal', () => ({
  GRMTriageTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-grm-init" onClick={() => onValuesChange({ grm: 10.0 })}>
        Trigger GRM Init
      </button>
      <button data-testid="trigger-grm-mod" onClick={() => onValuesChange({ grm: 12.5 })}>
        Trigger GRM Mod
      </button>
    </div>
  ),
}));

jest.mock('@/components/intelligence/ExpenseRatioCollectionTerminal', () => ({
  ExpenseRatioCollectionTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-oer-init" onClick={() => onValuesChange({ expenseRatio: 38.2 })}>
        Trigger OER Init
      </button>
      <button data-testid="trigger-oer-mod" onClick={() => onValuesChange({ expenseRatio: 45.0 })}>
        Trigger OER Mod
      </button>
    </div>
  ),
}));

jest.mock('@/components/intelligence/AppreciationCollectionTerminal', () => ({
  AppreciationCollectionTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-app-init" onClick={() => onValuesChange({ annualizedRate: 12.5, currentEstimate: 545500, totalBasis: 485000, totalGain: 60500 })}>
        Trigger Appreciation Init
      </button>
      <button data-testid="trigger-app-mod" onClick={() => onValuesChange({ annualizedRate: 15.0, currentEstimate: 600000, totalBasis: 485000, totalGain: 115000 })}>
        Trigger Appreciation Mod
      </button>
    </div>
  ),
}));

jest.mock('@/components/intelligence/OccupancyCollectionTerminal', () => ({
  OccupancyCollectionTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-occ-init" onClick={() => onValuesChange({ occupancyRate: 94.2, occupiedUnitCount: 47, totalUnitCount: 50 })}>
        Trigger Occupancy Init
      </button>
      <button data-testid="trigger-occ-mod" onClick={() => onValuesChange({ occupancyRate: 90.0, occupiedUnitCount: 45, totalUnitCount: 50 })}>
        Trigger Occupancy Mod
      </button>
    </div>
  ),
}));

jest.mock('@/components/intelligence/IRRExitAssumptionsTerminal', () => ({
  IRRExitAssumptionsTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-irr-init" onClick={() => onValuesChange({ irr: 0.124 })}>
        Trigger IRR Init
      </button>
      <button data-testid="trigger-irr-mod" onClick={() => onValuesChange({ irr: 0.18 })}>
        Trigger IRR Mod
      </button>
    </div>
  ),
}));

jest.mock('@/components/intelligence/DSCRRiskStripTerminal', () => ({
  DSCRRiskStripTerminal: ({ onValuesChange }: any) => (
    <div>
      <button data-testid="trigger-dscr-init" onClick={() => onValuesChange({ annualNOI: 60000, monthlyDebtService: 3500 })}>
        Trigger DSCR Init
      </button>
      <button data-testid="trigger-dscr-mod" onClick={() => onValuesChange({ annualNOI: 72000, monthlyDebtService: 3500 })}>
        Trigger DSCR Mod
      </button>
    </div>
  ),
}));

describe('Intelligence Dashboard What-If Calculations and Interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseMetricSeries.mockReturnValue({
      status: 'ready',
      data: {
        series: [10, 11],
        labels: ['Jan', 'Feb'],
        dates: [new Date(Date.now() - 30 * 24 * 3600 * 1000), new Date()],
      },
    });
    mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 0 });
    mockUsePortfolioInputs.mockReturnValue({
      status: 'ready',
      data: {
        projects: [
          {
            id: 'p1',
            name: 'Test Project',
            address: '123 Main St',
            zipCode: '11201',
            phase: 'hold',
            strategyType: 'Rent',
            currentPhase: 3,
            financials: {
              purchasePrice: 200000,
              loanAmount: 150000,
              loanInterestRate: 6.5,
              loanTermYears: 30,
              monthlyGrossRent: 2000,
              ownershipPercentage: 100,
            },
          },
        ],
        snapshots: [
          { date: new Date(Date.now() - 30 * 24 * 3600 * 1000), oer: 35, capRate: 5, coc: 6, dscr: 1.25, irr: 0.12, occupancy: 95, grm: 8.5 },
          { date: new Date(), oer: 38.2, capRate: 5.2, coc: 6.2, dscr: 1.28, irr: 0.124, occupancy: 94.2, grm: 9.2 },
        ],
        totalPropertyValue: 200000,
        totalDebt: 150000,
        totalEquity: 50000,
      },
    });
  });

  // ─── GRM PAGE TESTS ─────────────────────────────────────────────────────────
  describe('GRM What-If Logic', () => {
    it('defaults to LIVE mode on initial load', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 9.2 });
      render(<GRMIntelligencePage />);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();
      expect(screen.queryByText('HYPOTHETICAL')).toBeNull();
    });

    it('stays in LIVE mode when first mount sets initial value', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 9.2 });
      render(<GRMIntelligencePage />);

      const initBtn = screen.getByTestId('trigger-grm-init');
      fireEvent.click(initBtn);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();
    });

    it('transitions to WHAT-IF mode when input is modified', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 9.2 });
      render(<GRMIntelligencePage />);

      // First call (mount/init value)
      fireEvent.click(screen.getByTestId('trigger-grm-init'));
      expect(screen.getByText('LIVE')).toBeTruthy();

      // Second call (user changes value)
      fireEvent.click(screen.getByTestId('trigger-grm-mod'));
      expect(screen.queryByText('LIVE')).toBeNull();
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      expect(screen.getByText('HYPOTHETICAL')).toBeTruthy();
      expect(screen.getAllByText('12.5').length).toBeGreaterThan(0); // displays modified value
    });
  });

  // ─── OER PAGE TESTS ─────────────────────────────────────────────────────────
  describe('OER What-If Logic', () => {
    it('defaults to LIVE mode and transitions to WHAT-IF mode on interaction', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 38.2 });
      render(<OERIntelligencePage />);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // Mount init OER
      fireEvent.click(screen.getByTestId('trigger-oer-init'));
      expect(screen.getByText('LIVE')).toBeTruthy();

      // User modifies OER
      fireEvent.click(screen.getByTestId('trigger-oer-mod'));
      expect(screen.queryByText('LIVE')).toBeNull();
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      expect(screen.getAllByText('45.0%').length).toBeGreaterThan(0);
    });
  });

  // ─── APPRECIATION PAGE TESTS ───────────────────────────────────────────────
  describe('Appreciation What-If Logic', () => {
    it('defaults to LIVE mode and transitions to WHAT-IF mode on interaction', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 12.5 });
      render(<AppreciationIntelligencePage />);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // Mount init Appreciation
      fireEvent.click(screen.getByTestId('trigger-app-init'));
      expect(screen.getByText('LIVE')).toBeTruthy();

      // User modifies Appreciation
      fireEvent.click(screen.getByTestId('trigger-app-mod'));
      expect(screen.queryByText('LIVE')).toBeNull();
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      expect(screen.getAllByText('15.0%').length).toBeGreaterThan(0);
    });
  });

  // ─── OCCUPANCY PAGE TESTS ──────────────────────────────────────────────────
  describe('Occupancy What-If Logic', () => {
    it('defaults to LIVE mode and transitions to WHAT-IF mode on interaction', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 94.2 });
      render(<OccupancyIntelligencePage />);

      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // Mount init Occupancy
      fireEvent.click(screen.getByTestId('trigger-occ-init'));
      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // User modifies Occupancy
      fireEvent.click(screen.getByTestId('trigger-occ-mod'));
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      expect(screen.getByText('HYPOTHETICAL')).toBeTruthy();
      expect(screen.getAllByText('90.0%').length).toBeGreaterThan(0);
    });
  });

  // ─── IRR PAGE TESTS ────────────────────────────────────────────────────────
  describe('IRR What-If Logic', () => {
    it('defaults to LIVE mode and transitions to WHAT-IF mode on interaction', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 12.4 });
      render(<IRRIntelligencePage />);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // Mount init IRR
      fireEvent.click(screen.getByTestId('trigger-irr-init'));
      expect(screen.getByText('LIVE')).toBeTruthy();

      // User modifies IRR
      fireEvent.click(screen.getByTestId('trigger-irr-mod'));
      expect(screen.queryByText('LIVE')).toBeNull();
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      expect(screen.getAllByText('18.0').length).toBeGreaterThan(0);
    });
  });

  // ─── DSCR PAGE TESTS ───────────────────────────────────────────────────────
  describe('DSCR What-If Logic', () => {
    it('defaults to LIVE mode and transitions to WHAT-IF mode on interaction', () => {
      mockUseMetricCurrent.mockReturnValue({ status: 'ready', data: 1.42 });
      render(<DSCRIntelligencePage />);

      expect(screen.getByText('LIVE')).toBeTruthy();
      expect(screen.queryByText('WHAT-IF')).toBeNull();

      // Mount init DSCR
      fireEvent.click(screen.getByTestId('trigger-dscr-init'));
      expect(screen.getByText('LIVE')).toBeTruthy();

      // User modifies DSCR
      fireEvent.click(screen.getByTestId('trigger-dscr-mod'));
      expect(screen.queryByText('LIVE')).toBeNull();
      expect(screen.getByText('WHAT-IF')).toBeTruthy();
      // whatIfDSCR = annualNOI / (monthlyDebtService * 12)
      // 72000 / (3500 * 12) = 72000 / 42000 = 1.714
      expect(screen.getAllByText('1.71x').length).toBeGreaterThan(0);
    });
  });
});
