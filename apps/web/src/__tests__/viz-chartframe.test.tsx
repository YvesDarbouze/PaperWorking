import React from 'react';
import { describe, expect, it } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { ChartFrame } from '../../lib/viz/ChartFrame';

describe('ChartFrame Component Unit Suite (@/lib/viz/ChartFrame.tsx)', () => {
  it('renders title, timeframe, and unit badge correctly', () => {
    const html = renderToString(
      <ChartFrame
        title="Net Operating Income"
        timeframe="Last 24 Months"
        unitBadge="$ / Month"
        ariaLabel="NOI 24 month trend chart"
      >
        <div data-testid="mock-chart-content">SVG Content</div>
      </ChartFrame>,
    );

    expect(html).toContain('Net Operating Income');
    expect(html).toContain('Last 24 Months');
    expect(html).toContain('$ / Month');
    expect(html).toContain('aria-label="NOI 24 month trend chart"');
    expect(html).toContain('role="figure"');
    expect(html).toContain('data-testid="mock-chart-content"');
  });

  it('omits legend when series <= 1 to eliminate chartjunk (Article 1)', () => {
    const singleSeriesHtml = renderToString(
      <ChartFrame
        title="Single Series Trend"
        ariaLabel="Single series chart"
        legend={[{ label: 'Primary NOI', color: '#00DD94' }]}
      >
        <div>Content</div>
      </ChartFrame>,
    );
    expect(singleSeriesHtml).not.toContain('data-testid="chart-legend"');
  });

  it('renders legend when multiple series are present (>1)', () => {
    const multiSeriesHtml = renderToString(
      <ChartFrame
        title="Comparison Chart"
        ariaLabel="Comparison chart"
        legend={[
          { label: 'Project Actuals', color: '#00DD94' },
          { label: 'Portfolio Benchmark', color: '#9E9DA0', style: 'dashed' },
        ]}
      >
        <div>Content</div>
      </ChartFrame>,
    );
    expect(multiSeriesHtml).toContain('data-testid="chart-legend"');
    expect(multiSeriesHtml).toContain('Project Actuals');
    expect(multiSeriesHtml).toContain('Portfolio Benchmark');
  });

  it('renders accessible visually hidden data table for screen readers (Article 4)', () => {
    const html = renderToString(
      <ChartFrame
        title="Cap Rate by Project"
        ariaLabel="Cap rate comparison chart"
        dataTable={{
          caption: 'Cap Rate by Project Summary',
          headers: ['Project', 'Cap Rate'],
          rows: [
            ['1247 Elm Street', '7.8%'],
            ['88 Harbor Lane', '8.9%'],
          ],
        }}
      >
        <div>Content</div>
      </ChartFrame>,
    );

    expect(html).toContain('<table class="sr-only"');
    expect(html).toContain('Cap Rate by Project Summary');
    expect(html).toContain('<th scope="col">Project</th>');
    expect(html).toContain('<th scope="col">Cap Rate</th>');
    expect(html).toContain('<th scope="row">1247 Elm Street</th>');
    expect(html).toContain('<td>7.8%</td>');
  });

  it('renders provenance source footer when provided', () => {
    const html = renderToString(
      <ChartFrame
        title="DSCR Sensitivity"
        ariaLabel="DSCR sensitivity curve"
        source="Source: 24-Month Project Underwriting Model · Live Derived"
      >
        <div>Content</div>
      </ChartFrame>,
    );

    expect(html).toContain('data-testid="chart-source"');
    expect(html).toContain('Source: 24-Month Project Underwriting Model · Live Derived');
  });
});
