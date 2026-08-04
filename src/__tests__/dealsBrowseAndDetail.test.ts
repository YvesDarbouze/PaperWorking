import {
  calculateFundingProgress,
  mapDealCardMetrics,
  formatCurrencyAmount,
} from '@/lib/deals/fundingUtils';

describe('Deals Marketplace Browse & Detail Utilities (PROMPT 3)', () => {
  describe('calculateFundingProgress', () => {
    it('calculates exact percentage committed and remaining funding', () => {
      const funding = calculateFundingProgress(200000, 130000, 5, 'USD');
      expect(funding.percentFunded).toBe(65);
      expect(funding.remainingAmount).toBe(70000);
      expect(funding.isFullyFunded).toBe(false);
      expect(funding.formattedTarget).toBe('$200,000');
      expect(funding.formattedCommitted).toBe('$130,000');
      expect(funding.formattedRemaining).toBe('$70,000');
      expect(funding.investorCount).toBe(5);
    });

    it('handles 100% or over-funded commitments correctly', () => {
      const funding = calculateFundingProgress(200000, 250000, 8, 'USD');
      expect(funding.percentFunded).toBe(100);
      expect(funding.remainingAmount).toBe(0);
      expect(funding.isFullyFunded).toBe(true);
    });

    it('handles 0 funding target gracefully', () => {
      const funding = calculateFundingProgress(0, 0, 0, 'USD');
      expect(funding.percentFunded).toBe(0);
      expect(funding.remainingAmount).toBe(0);
      expect(funding.isFullyFunded).toBe(false);
    });
  });

  describe('mapDealCardMetrics', () => {
    it('extracts and formats headline underwriting metrics', () => {
      const deal = {
        price: 350000,
        rehabCost: 50000,
        arv: 480000,
        capRate: 7.8,
        cashOnCash: 12.4,
        projectedROI: 24.5,
        estimatedRent: 3200,
      };

      const metrics = mapDealCardMetrics(deal);
      expect(metrics.purchasePrice).toBe(350000);
      expect(metrics.rehabCost).toBe(50000);
      expect(metrics.arv).toBe(480000);
      expect(metrics.monthlyRent).toBe(3200);
      expect(metrics.capRate).toBe(7.8);
      expect(metrics.cashOnCash).toBe(12.4);
      expect(metrics.projectedROI).toBe(24.5);
    });

    it('derives cap rate and CoC if missing', () => {
      const deal = {
        price: 400000,
        rehabCost: 40000,
        estimatedRent: 3600,
      };

      const metrics = mapDealCardMetrics(deal);
      expect(metrics.purchasePrice).toBe(400000);
      expect(metrics.rehabCost).toBe(40000);
      expect(metrics.capRate).toBeGreaterThan(0);
      expect(metrics.cashOnCash).toBeGreaterThan(0);
    });
  });

  describe('formatCurrencyAmount', () => {
    it('formats currency numbers into locale currency strings', () => {
      expect(formatCurrencyAmount(350000, 'USD')).toBe('$350,000');
      expect(formatCurrencyAmount(50000, 'USD')).toBe('$50,000');
      expect(formatCurrencyAmount(0, 'USD')).toBe('$0');
    });
  });
});
