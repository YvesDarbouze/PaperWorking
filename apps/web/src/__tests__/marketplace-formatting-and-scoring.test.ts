import { describe, expect, it } from '@jest/globals';
import {
  formatCurrencyCompact,
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatHoldPeriod,
} from '../../lib/format.js';
import { calculateRecommendedScore } from '../../components/marketplace/DealsMarketplacePanel.js';
import type { DealCardData } from '../../components/marketplace/DealCard.js';

describe('Marketplace Formatting Utilities (lib/format.ts)', () => {
  describe('formatCurrencyCompact', () => {
    it('formats millions correctly', () => {
      expect(formatCurrencyCompact(1_250_000)).toBe('$1.25M');
      expect(formatCurrencyCompact(10_000_000)).toBe('$10M');
      expect(formatCurrencyCompact(2_400_000)).toBe('$2.4M');
    });

    it('formats thousands correctly', () => {
      expect(formatCurrencyCompact(485_000)).toBe('$485K');
      expect(formatCurrencyCompact(25_000)).toBe('$25K');
      expect(formatCurrencyCompact(50_000)).toBe('$50K');
    });

    it('formats small amounts and edge cases', () => {
      expect(formatCurrencyCompact(750)).toBe('$750');
      expect(formatCurrencyCompact(0)).toBe('$0');
      expect(formatCurrencyCompact(Number.NaN)).toBe('$0');
    });

    it('handles billions', () => {
      expect(formatCurrencyCompact(1_500_000_000)).toBe('$1.5B');
    });
  });

  describe('formatCurrency', () => {
    it('formats full currency with comma separation', () => {
      expect(formatCurrency(1_250_000)).toBe('$1,250,000');
      expect(formatCurrency(485_000)).toBe('$485,000');
      expect(formatCurrency(0)).toBe('$0');
    });
  });

  describe('formatPercent', () => {
    it('formats percent with 1 decimal place by default', () => {
      expect(formatPercent(18.4)).toBe('18.4%');
      expect(formatPercent(14.234)).toBe('14.2%');
      expect(formatPercent(20)).toBe('20.0%');
    });

    it('handles custom decimal places', () => {
      expect(formatPercent(18.456, 2)).toBe('18.46%');
    });
  });

  describe('formatMultiple', () => {
    it('formats equity multiple with x suffix', () => {
      expect(formatMultiple(1.85)).toBe('1.85x');
      expect(formatMultiple(2.1)).toBe('2.10x');
      expect(formatMultiple(1.75)).toBe('1.75x');
    });
  });

  describe('formatHoldPeriod', () => {
    it('formats hold period range or years', () => {
      expect(formatHoldPeriod('3–5')).toBe('3–5 Years');
      expect(formatHoldPeriod('3–5 Years')).toBe('3–5 Years');
      expect(formatHoldPeriod(3)).toBe('3 Years');
      expect(formatHoldPeriod(1)).toBe('1 Year');
    });
  });
});

describe('Marketplace Deterministic Recommended Scoring', () => {
  it('ranks high-momentum, high-yield opportunities higher than dormant listings', () => {
    const highMomentumDeal: DealCardData = {
      id: 'high-1',
      slug: 'high-1',
      address: '100 Main St, Austin, TX',
      status: 'funding',
      targetIrr: 21.0,
      fundingTarget: 1_000_000,
      committedAmount: 900_000, // 90% funded
      createdAt: new Date().toISOString(), // Brand new
    };

    const dormantDeal: DealCardData = {
      id: 'dormant-1',
      slug: 'dormant-1',
      address: '200 Oak St, Denver, CO',
      status: 'published',
      targetIrr: 10.0,
      fundingTarget: 1_000_000,
      committedAmount: 50_000, // 5% funded
      createdAt: '2025-01-01T00:00:00.000Z', // Old
    };

    const scoreHigh = calculateRecommendedScore(highMomentumDeal);
    const scoreDormant = calculateRecommendedScore(dormantDeal);

    expect(scoreHigh).toBeGreaterThan(scoreDormant);
    expect(scoreHigh).toBeGreaterThan(50);
  });

  it('produces deterministic identical score for identical inputs', () => {
    const deal: DealCardData = {
      id: 'test-1',
      slug: 'test-1',
      address: '1247 Elm St, Austin, TX',
      status: 'funding',
      targetIrr: 18.4,
      fundingTarget: 500_000,
      committedAmount: 250_000,
      createdAt: '2026-07-01T00:00:00.000Z',
    };

    const score1 = calculateRecommendedScore(deal);
    const score2 = calculateRecommendedScore(deal);

    expect(score1).toBe(score2);
  });
});
