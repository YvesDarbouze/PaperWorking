/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { Scorecard } from '../Scorecard';
import { deriveAllProjectMetrics } from '@/lib/metrics';
import { canonicalSeedDeal } from '@/lib/metrics/fixtures/canonical-seed-deal';

describe('Agent 5: Scorecard Component Unit Tests', () => {
  test('Renders all 10 headline scorecard metrics from metric engine output', async () => {
    const metrics = await deriveAllProjectMetrics('proj_test_scorecard', { mockData: canonicalSeedDeal });

    render(<Scorecard metrics={metrics} />);

    expect(screen.getByTestId('scorecard-container')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-noi')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-cap-rate')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-cash-on-cash')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-irr')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-cash-flow')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-grm')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-dscr')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-occupancy-rate')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-expense-ratio')).toBeTruthy();
    expect(screen.getByTestId('scorecard-card-long-term-appreciation')).toBeTruthy();
  });
});
