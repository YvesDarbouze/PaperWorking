/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { InsightsPanel } from '../InsightsPanel';
import { deriveAllProjectMetrics } from '@/lib/metrics';
import { canonicalSeedDeal } from '@/lib/metrics/fixtures/canonical-seed-deal';

describe('Agent 5: InsightsPanel Component Unit Tests', () => {
  test('Renders all 5 category sections and metrics', async () => {
    const metrics = await deriveAllProjectMetrics('proj_test_insights', { mockData: canonicalSeedDeal });

    render(<InsightsPanel metrics={metrics} />);

    expect(screen.getByTestId('insights-tab')).toBeTruthy();
    expect(screen.getByText(/Financial Performance/i)).toBeTruthy();
    expect(screen.getByText(/Operational Efficiency/i)).toBeTruthy();
    expect(screen.getByText(/Asset & Portfolio Management/i)).toBeTruthy();
    expect(screen.getAllByText(/Marketing & Sales/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Risk & Compliance/i)).toBeTruthy();

    // Verify key metric cards render
    expect(screen.getByTestId('metric-card-ltv')).toBeTruthy();
    expect(screen.getByTestId('metric-card-roi')).toBeTruthy();
    expect(screen.getByTestId('metric-card-tenant-turnover')).toBeTruthy();
    expect(screen.getByTestId('metric-card-listing-to-meeting-ratio')).toBeTruthy();
  });
});
