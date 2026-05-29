/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CashFlowChart } from '../components/intelligence/charts/CashFlowChart';
import { EquityBuildupChart } from '../components/intelligence/charts/EquityBuildupChart';

// Mock ECharts to avoid canvas / DOM render errors in Jest/JSDOM
jest.mock('echarts-for-react', () => {
  return function MockReactECharts({ option }: any) {
    return <div data-testid="echarts-mock" data-option={JSON.stringify(option)} />;
  };
});

describe('Deal Charts', () => {
  describe('CashFlowChart', () => {
    it('renders loading state skeleton before mounting or when isLoading is true', () => {
      const { container } = render(<CashFlowChart data={[]} isLoading={true} />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });

    it('renders empty state when data is empty', () => {
      render(<CashFlowChart data={[]} isLoading={false} />);
      expect(screen.getByText('No Data Available')).toBeTruthy();
      expect(screen.getByText(/Rent and expense projections will display here/)).toBeTruthy();
    });

    it('renders ECharts when data is present', () => {
      const mockData = [
        { period: 'Year 1', gpr: 10000, opEx: 4000 },
        { period: 'Year 2', gpr: 11000, opEx: 4200 },
      ];
      render(<CashFlowChart data={mockData} isLoading={false} />);
      
      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toBeTruthy();
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');
      expect(option.series[0].name).toBe('Gross Potential Rent');
      expect(option.series[1].name).toBe('Operating Expenses');
    });
  });

  describe('EquityBuildupChart', () => {
    it('renders loading state skeleton when isLoading is true', () => {
      const { container } = render(<EquityBuildupChart data={[]} isLoading={true} />);
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeTruthy();
    });

    it('renders empty state when data is empty', () => {
      render(<EquityBuildupChart data={[]} isLoading={false} />);
      expect(screen.getByText('No Equity Data')).toBeTruthy();
    });

    it('renders ECharts when data is present', () => {
      const mockData = [
        { period: 'Year 1', loanBalance: 200000, equity: 100000 },
        { period: 'Year 2', loanBalance: 190000, equity: 120000 },
      ];
      render(<EquityBuildupChart data={mockData} isLoading={false} />);
      
      const chart = screen.getByTestId('echarts-mock');
      expect(chart).toBeTruthy();
      const option = JSON.parse(chart.getAttribute('data-option') || '{}');
      expect(option.series[0].name).toBe('Loan Balance');
      expect(option.series[1].name).toBe('Equity');
    });
  });
});
