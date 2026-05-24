/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetricChart } from '../components/metrics/MetricChart';

// Mock Recharts ResponsiveContainer to avoid layout issues in JSDOM
jest.mock('recharts', () => {
  const original = jest.requireActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('MetricChart Component', () => {
  const mockSeries = [
    { date: '2026-01-01', value: 100 },
    { date: '2026-02-01', value: 120 },
  ];

  it('renders loading state skeleton', () => {
    const { container } = render(
      <MetricChart
        series={mockSeries}
        timeWindow="monthly"
        scope="project"
        unit="%"
        loading={true}
      />
    );
    // Loading skeleton has animate-pulse class
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeTruthy();
  });

  it('renders project scope header and calculations', () => {
    render(
      <MetricChart
        series={mockSeries}
        timeWindow="monthly"
        scope="project"
        unit="%"
        title="Project ROI"
      />
    );

    // Latest value: 120.00%
    expect(screen.getByText('120.00%')).toBeTruthy();
    expect(screen.getByText('Project ROI')).toBeTruthy();

    // Trend: +20.00% (+20.00%)
    // formula: (120 - 100) / 100 = +20.00%
    expect(screen.getByText(/\+20\.00%/)).toBeTruthy();
  });

  it('renders portfolio scope header and latest aggregate', () => {
    render(
      <MetricChart
        series={mockSeries}
        timeWindow="monthly"
        scope="portfolio"
        unit="currency"
        title="Portfolio Value"
      />
    );

    // Latest value: $120
    expect(screen.getByText('$120')).toBeTruthy();
    expect(screen.getByText('Portfolio Value')).toBeTruthy();
    expect(screen.getByText('(Latest Aggregate)')).toBeTruthy();
  });

  it('enforces empty portfolio guardrail', () => {
    render(
      <MetricChart
        series={[]}
        timeWindow="monthly"
        scope="portfolio"
        unit="%"
      />
    );

    expect(
      screen.getByText('No active projects in the portfolio to display.')
    ).toBeTruthy();
  });

  it('enforces empty portfolio guardrail when all values are null', () => {
    render(
      <MetricChart
        series={[
          { date: '2026-01-01', value: null },
          { date: '2026-02-01', value: null },
        ]}
        timeWindow="monthly"
        scope="portfolio"
        unit="%"
      />
    );

    expect(
      screen.getByText('No active projects in the portfolio to display.')
    ).toBeTruthy();
  });

  it('enforces insufficient history guardrail for less than 2 valid points', () => {
    render(
      <MetricChart
        series={[{ date: '2026-01-01', value: 100 }]}
        timeWindow="monthly"
        scope="project"
        unit="%"
        title="Individual Project"
      />
    );

    // Title and latest value are still displayed in individual project view
    expect(screen.getByText('Individual Project')).toBeTruthy();
    expect(screen.getByText('100.00%')).toBeTruthy();

    // But chart is replaced by insufficient history guardrail message
    expect(
      screen.getByText(/Insufficient history to display trend chart/i)
    ).toBeTruthy();
  });

  it('formats various units correctly', () => {
    const singleSeries = [{ date: '2026-01-01', value: 5.5 }];

    // Percentage unit
    const { rerender } = render(
      <MetricChart
        series={singleSeries}
        timeWindow="monthly"
        scope="project"
        unit="%"
      />
    );
    expect(screen.getByText('5.50%')).toBeTruthy();

    // Currency unit
    rerender(
      <MetricChart
        series={singleSeries}
        timeWindow="monthly"
        scope="project"
        unit="currency"
      />
    );
    expect(screen.getByText('$6')).toBeTruthy(); // localestring toFixed 0 is 6 for 5.5

    // Ratio unit
    rerender(
      <MetricChart
        series={singleSeries}
        timeWindow="monthly"
        scope="project"
        unit="ratio"
      />
    );
    expect(screen.getByText('5.50')).toBeTruthy();

    // Multiplier unit
    rerender(
      <MetricChart
        series={singleSeries}
        timeWindow="monthly"
        scope="project"
        unit="×"
      />
    );
    expect(screen.getByText('5.50x')).toBeTruthy();
  });
});
