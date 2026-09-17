import { describe, expect, it } from '@jest/globals';
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatRatio,
  niceTickRange,
} from '../../lib/viz/format';

describe('Data Visualization Formatter Suite (@/lib/viz/format.ts)', () => {
  describe('formatCurrency', () => {
    it('formats standard integers without decimals and with commas', () => {
      expect(formatCurrency(1250000)).toBe('$1,250,000');
      expect(formatCurrency(0)).toBe('$0');
      expect(formatCurrency(450)).toBe('$450');
    });

    it('formats compact K/M/B boundaries per institutional rules', () => {
      expect(formatCurrency(1250000, { compact: true })).toBe('$1.25M');
      expect(formatCurrency(1200000000, { compact: true })).toBe('$1.2B');
      expect(formatCurrency(450000, { compact: true })).toBe('$450K');
      expect(formatCurrency(8500, { compact: true })).toBe('$8.5K');
      expect(formatCurrency(500, { compact: true })).toBe('$500');
    });

    it('handles negative currency values with minus or parentheses semantics', () => {
      expect(formatCurrency(-50000)).toBe('-$50,000');
      expect(formatCurrency(-50000, { negativeParens: true })).toBe('($50,000)');
      expect(formatCurrency(-1500000, { compact: true })).toBe('-$1.5M');
      expect(formatCurrency(-1500000, { compact: true, negativeParens: true })).toBe('($1.5M)');
    });

    it('supports signDisplay: always for positive gains', () => {
      expect(formatCurrency(25000, { signDisplay: 'always' })).toBe('+$25,000');
      expect(formatCurrency(1500000, { compact: true, signDisplay: 'always' })).toBe('+$1.5M');
    });

    it('handles null, undefined, and NaN gracefully with em dash', () => {
      expect(formatCurrency(null)).toBe('—');
      expect(formatCurrency(undefined)).toBe('—');
      expect(formatCurrency(Number.NaN)).toBe('—');
    });
  });

  describe('formatPercent', () => {
    it('formats percent values with default 1 decimal place', () => {
      expect(formatPercent(18.42)).toBe('18.4%');
      expect(formatPercent(8.0)).toBe('8.0%');
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('multiplies ratio values by 100 when multiply option is enabled', () => {
      expect(formatPercent(0.1842, { multiply: true })).toBe('18.4%');
      expect(formatPercent(0.08, { multiply: true })).toBe('8.0%');
    });

    it('handles negative percentages and explicit plus signs', () => {
      expect(formatPercent(-3.5)).toBe('-3.5%');
      expect(formatPercent(2.5, { signDisplay: 'always' })).toBe('+2.5%');
    });

    it('handles null and undefined gracefully', () => {
      expect(formatPercent(null)).toBe('—');
      expect(formatPercent(undefined)).toBe('—');
      expect(formatPercent(Number.NaN)).toBe('—');
    });
  });

  describe('formatMultiple & formatRatio', () => {
    it('formats equity multiples with multiplication glyph', () => {
      expect(formatMultiple(1.854)).toBe('1.85×');
      expect(formatMultiple(2.0)).toBe('2.00×');
      expect(formatMultiple(1.854, { symbol: 'x' })).toBe('1.85x');
    });

    it('formats ratios to 2 decimal places by default', () => {
      expect(formatRatio(1.254)).toBe('1.25');
      expect(formatRatio(1.5)).toBe('1.50');
    });

    it('handles null and undefined multiples/ratios', () => {
      expect(formatMultiple(null)).toBe('—');
      expect(formatRatio(null)).toBe('—');
    });
  });

  describe('niceTickRange (Article 2)', () => {
    it('generates uniform, rounded tick intervals', () => {
      const result = niceTickRange(0, 100, 5);
      expect(result.step).toBe(25);
      expect(result.ticks).toEqual([0, 25, 50, 75, 100]);
      expect(result.min).toBe(0);
      expect(result.max).toBe(100);
    });

    it('handles small fractional ranges gracefully', () => {
      const result = niceTickRange(0, 1.25, 4);
      expect(result.step).toBeGreaterThan(0);
      expect(result.ticks[0]).toBe(0);
      expect(result.ticks[result.ticks.length - 1]).toBeGreaterThanOrEqual(1.25);
    });

    it('handles identical min and max values without zero division', () => {
      const result = niceTickRange(50, 50, 5);
      expect(result.ticks.length).toBeGreaterThan(1);
      expect(result.step).toBe(1);
    });
  });
});
