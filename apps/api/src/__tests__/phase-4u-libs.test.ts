import { describe, expect, it } from '@jest/globals';
import {
  buildOccupancyTrendSeries,
  buildTransactionTrendSeries,
  generateLastNMonths,
  parseTrendsQuery,
} from '../lib/insights/trends.js';
import {
  buildProjectMarketSeries,
  extractProjectZipCode,
  generateLastNQuarters,
  getQuarterKey,
  parseMarketQuery,
} from '../lib/insights/market.js';
import {
  computeTrendDirection,
  getBenchmarkColor,
  parseMetricsQuery,
} from '../lib/insights/metrics-display.js';
import {
  buildAcceptInvitationResponse,
  checkInvitationAcceptable,
} from '../lib/invitations/accept.js';
import { stripPublicPredictions, validatePlaceDetailsBody } from '../lib/places/autocomplete.js';
import { validateThreadId } from '../lib/messages/thread.js';

describe('Phase 4u libs', () => {
  it('parses trends query and builds series', () => {
    expect(parseTrendsQuery({ metric: 'noi' }).metric).toBe('noi');
    const months = generateLastNMonths(3);
    expect(months).toHaveLength(3);

    const occupancy = buildOccupancyTrendSeries(
      months,
      [{ period: months[0], occupancyRate: 95 }],
      'p1',
    );
    expect(occupancy[0].value).toBe(95);

    const txSeries = buildTransactionTrendSeries(
      months,
      [{ date: `${months[0]}-15`, amount: 100000, reiCategory: 'rental_income' }],
      'revenue',
    );
    expect(txSeries[0].value).toBeGreaterThan(0);
  });

  it('parses market query and builds overlay series', () => {
    expect(parseMarketQuery({ projectId: 'p1' }).ok).toBe(true);
    expect(extractProjectZipCode({ zip: '90210' })).toBe('90210');
    expect(getQuarterKey('2026-02')).toBe('2026-Q1');

    const quarters = ['2026-Q1', '2026-Q2'];
    const projectSeries = buildProjectMarketSeries(
      quarters,
      [{ period: '2026-02', capRate: 5 }],
      'cap_rate',
    );
    expect(projectSeries[0]).toBe(5);
  });

  it('metrics display helpers', () => {
    const parsed = parseMetricsQuery({ category: 'returns', portfolio: 'true' });
    expect(parsed.ok).toBe(true);

    const color = getBenchmarkColor(
      {
        id: 'cap_rate',
        name: 'Cap Rate',
        category: 'returns',
        formula: 'x',
        unit: 'percent',
        benchmark: { good: 8, warning: 6, bad: 4 },
      },
      9,
    );
    expect(color).toBe('good');
    expect(computeTrendDirection(10, 8)).toBe('up');
  });

  it('accept invitation and places helpers', () => {
    expect(
      checkInvitationAcceptable({ status: 'pending', expiresAt: new Date(Date.now() + 1000) }).ok,
    ).toBe(true);

    const response = buildAcceptInvitationResponse({
      token: 'tok',
      projectId: 'p1',
    });
    expect(response.action).toBe('redirect_to_register');

    expect(validatePlaceDetailsBody({ placeId: 'p', sessionToken: 's' }).ok).toBe(true);
    expect(
      stripPublicPredictions([
        { placeId: '1', description: 'A', mainText: 'hidden' },
      ]),
    ).toEqual([{ placeId: '1', description: 'A' }]);

    expect(validateThreadId('thread-1').ok).toBe(true);
  });
});
