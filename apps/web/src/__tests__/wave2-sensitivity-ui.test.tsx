import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { renderToString } from 'react-dom/server';
import { SensitivityGridsView } from '../../components/analysis/SensitivityGridsView.js';
import { computeSensitivityGrids } from '@paperworking/financial-engine';

describe('Wave 2 Sensitivity UI Tests', () => {
  const canonicalInputs = {
    purchasePrice: 520000,
    estimatedARV: 680000,
    rehabBudget: 59800,
    grossRentMonthly: 5200,
    operatingExpensesAnnual: 21142,
    vacancyRatePct: 5.0,
    targetLtvPct: 75.0,
    interestRatePct: 6.5,
    amortizationYears: 30,
    holdPeriodYears: 5,
    annualAppreciationPct: 3.0,
    buyerClosingCostsPct: 3.0,
    sellingCostsPct: 6.0,
    terminalValueMethod: 'appreciation_pct' as const,
  };

  it('1. renders sensitivity grids container with 5x5 matrix and base case highlight', () => {
    const grids = computeSensitivityGrids(canonicalInputs);
    const mockExportPdf = jest.fn();

    const html = renderToString(
      <SensitivityGridsView
        sensitivityGrids={grids}
        onExportPdf={mockExportPdf}
      />
    );

    // 1. Container renders
    expect(html).toContain('data-testid="sensitivity-grids-container"');
    expect(html).toContain('Institutional Sensitivity Matrix (5x5)');

    // 2. Base case cell exists and is highlighted
    expect(html).toContain('data-testid="sensitivity-base-cell"');
    expect(html).toContain('Base');
    expect(html).toContain('3.8%');

    // 3. Export PDF button
    expect(html).toContain('data-testid="export-pdf-btn"');
    expect(html).toContain('Export PDF');

    // 4. Metric toggle buttons exist
    expect(html).toContain('data-testid="sensitivity-metric-irr"');
    expect(html).toContain('data-testid="sensitivity-metric-coc"');

    // 5. Dimension tabs exist
    expect(html).toContain('data-testid="sensitivity-tab-exit"');
    expect(html).toContain('data-testid="sensitivity-tab-rate"');
  });

  it('2. renders honest No Sign status when cash flows never cross zero', () => {
    const extremeNegativeInputs = {
      purchasePrice: 520000,
      estimatedARV: 680000,
      rehabBudget: 59800,
      grossRentMonthly: 1500,
      operatingExpensesAnnual: 55000,
      vacancyRatePct: 20.0,
      targetLtvPct: 75.0,
      interestRatePct: 15.0,
      amortizationYears: 30,
      holdPeriodYears: 5,
      annualAppreciationPct: -15.0,
      buyerClosingCostsPct: 3.0,
      sellingCostsPct: 6.0,
      terminalValueMethod: 'appreciation_pct' as const,
    };

    const grids = computeSensitivityGrids(extremeNegativeInputs);
    const html = renderToString(<SensitivityGridsView sensitivityGrids={grids} />);

    expect(html).toContain('No Sign');
    expect(html).toContain('data-testid="sensitivity-grids-container"');
  });
});
