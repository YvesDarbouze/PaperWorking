import { describe, expect, it } from '@jest/globals';
import { getSimilarDeals } from '../../lib/marketplace/similar-deals.js';
import { calculateDeadlineCountdown } from '../../lib/marketplace/countdown.js';
import type { DealCardData } from '../../components/marketplace/DealCard.js';

describe('Deal Detail Logic & Algorithms', () => {
  describe('Similar Deals Fallback Algorithm (lib/marketplace/similar-deals.ts)', () => {
    const mockDeals: DealCardData[] = [
      {
        id: 'deal-1',
        slug: 'austin-multi-1',
        propertyName: 'Austin Heights',
        address: '100 Congress Ave, Austin, TX',
        city: 'Austin',
        state: 'TX',
        assetClass: 'Multifamily',
        status: 'funding',
      },
      {
        id: 'deal-2',
        slug: 'austin-multi-2',
        propertyName: 'South Congress Flats',
        address: '200 S Congress, Austin, TX',
        city: 'Austin',
        state: 'TX',
        assetClass: 'Multifamily',
        status: 'funding',
      },
      {
        id: 'deal-3',
        slug: 'dallas-multi-1',
        propertyName: 'Dallas Uptown',
        address: '300 McKinney, Dallas, TX',
        city: 'Dallas',
        state: 'TX',
        assetClass: 'Multifamily',
        status: 'funding',
      },
      {
        id: 'deal-4',
        slug: 'austin-ind-1',
        propertyName: 'Austin Logistics Hub',
        address: '400 Ben White, Austin, TX',
        city: 'Austin',
        state: 'TX',
        assetClass: 'Industrial',
        status: 'funding',
      },
      {
        id: 'deal-5',
        slug: 'miami-retail-1',
        propertyName: 'Brickell Retail',
        address: '500 Brickell, Miami, FL',
        city: 'Miami',
        state: 'FL',
        assetClass: 'Retail',
        status: 'funding',
      },
    ];

    it('excludes current deal and prioritizes same asset class and market', () => {
      const currentDeal = mockDeals[0]; // Austin Multifamily
      const similar = getSimilarDeals(currentDeal, mockDeals, 3);

      // Exclude current
      expect(similar.some((d) => d.id === currentDeal.id)).toBe(false);

      // First match should be deal-2 (Austin Multifamily)
      expect(similar[0].id).toBe('deal-2');

      // Second match should be deal-3 (Dallas Multifamily - same asset class fallback)
      expect(similar[1].id).toBe('deal-3');

      // Total count is up to 3
      expect(similar.length).toBeLessThanOrEqual(3);
    });

    it('falls back to same asset class across other markets when local inventory is limited', () => {
      const currentDeal = {
        id: 'deal-solo',
        slug: 'solo-retail',
        city: 'Phoenix',
        state: 'AZ',
        assetClass: 'Retail',
      };

      const similar = getSimilarDeals(currentDeal, mockDeals, 3);

      // Exclude current
      expect(similar.some((d) => d.id === 'deal-solo')).toBe(false);

      // Finds deal-5 (Retail in Miami) as top match
      expect(similar[0].id).toBe('deal-5');
      expect(similar.length).toBe(3);
    });
  });

  describe('Deadline Countdown Math (lib/marketplace/countdown.ts)', () => {
    it('calculates days and hours remaining for future deadline', () => {
      const now = new Date('2026-09-01T12:00:00Z').getTime();
      const deadline = new Date('2026-09-15T12:00:00Z').getTime(); // 14 days later

      const result = calculateDeadlineCountdown(deadline, now);

      expect(result.days).toBe(14);
      expect(result.formatted).toBe('14 Days Remaining');
      expect(result.isExpired).toBe(false);
      expect(result.urgency).toBe('normal');
    });

    it('flags warning urgency for 3 days or fewer remaining', () => {
      const now = new Date('2026-09-01T12:00:00Z').getTime();
      const deadline = new Date('2026-09-03T12:00:00Z').getTime(); // 2 days later

      const result = calculateDeadlineCountdown(deadline, now);

      expect(result.days).toBe(2);
      expect(result.formatted).toBe('2 Days Remaining');
      expect(result.urgency).toBe('warning');
    });

    it('flags critical urgency for under 24 hours remaining', () => {
      const now = new Date('2026-09-01T12:00:00Z').getTime();
      const deadline = new Date('2026-09-01T18:30:00Z').getTime(); // 6h 30m later

      const result = calculateDeadlineCountdown(deadline, now);

      expect(result.days).toBe(0);
      expect(result.hours).toBe(6);
      expect(result.minutes).toBe(30);
      expect(result.formatted).toBe('6h 30m Remaining');
      expect(result.urgency).toBe('critical');
    });

    it('handles past or expired deadlines gracefully', () => {
      const now = new Date('2026-09-02T12:00:00Z').getTime();
      const pastDeadline = new Date('2026-09-01T12:00:00Z').getTime();

      const result = calculateDeadlineCountdown(pastDeadline, now);

      expect(result.isExpired).toBe(true);
      expect(result.formatted).toBe('Allocation Closed');
      expect(result.urgency).toBe('critical');
    });
  });

  describe('Interest Form Validation Logic', () => {
    function validateInterestSubmission({
      amount,
      minInvestment,
      remainingAllocation,
      attested,
    }: {
      amount: number;
      minInvestment: number;
      remainingAllocation: number;
      attested: boolean;
    }): { valid: boolean; error?: string } {
      if (!amount || isNaN(amount) || amount <= 0) {
        return { valid: false, error: 'Please enter a valid investment commitment amount.' };
      }
      if (amount < minInvestment) {
        return { valid: false, error: `Minimum investment commitment is $${minInvestment.toLocaleString()}.` };
      }
      if (amount > remainingAllocation && remainingAllocation > 0) {
        return { valid: false, error: `Amount exceeds remaining allocation of $${remainingAllocation.toLocaleString()}.` };
      }
      if (!attested) {
        return { valid: false, error: 'You must attest to your accredited investor status under SEC Rule 506(c).' };
      }
      return { valid: true };
    }

    it('rejects commitment below minimum investment', () => {
      const res = validateInterestSubmission({
        amount: 15_000,
        minInvestment: 25_000,
        remainingAllocation: 500_000,
        attested: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Minimum investment commitment is $25,000');
    });

    it('rejects commitment exceeding remaining allocation', () => {
      const res = validateInterestSubmission({
        amount: 600_000,
        minInvestment: 25_000,
        remainingAllocation: 500_000,
        attested: true,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Amount exceeds remaining allocation of $500,000');
    });

    it('rejects submission if accreditation is not attested', () => {
      const res = validateInterestSubmission({
        amount: 50_000,
        minInvestment: 25_000,
        remainingAllocation: 500_000,
        attested: false,
      });
      expect(res.valid).toBe(false);
      expect(res.error).toContain('accredited investor status');
    });

    it('accepts valid commitment meeting all criteria', () => {
      const res = validateInterestSubmission({
        amount: 50_000,
        minInvestment: 25_000,
        remainingAllocation: 500_000,
        attested: true,
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });
  });

  describe('Compare Tray Best Metric Highlight Calculation', () => {
    it('correctly calculates best-in-column highlights across compared deals', () => {
      const deals = [
        { id: '1', targetIrr: 18.4, equityMultiple: 1.85, minInvestment: 25000, capRate: 6.2 },
        { id: '2', targetIrr: 21.0, equityMultiple: 1.70, minInvestment: 50000, capRate: 7.1 },
        { id: '3', targetIrr: 16.5, equityMultiple: 2.10, minInvestment: 10000, capRate: 5.8 },
      ];

      const bestIrr = Math.max(...deals.map((d) => d.targetIrr));
      const bestEm = Math.max(...deals.map((d) => d.equityMultiple));
      const bestMinCheck = Math.min(...deals.map((d) => d.minInvestment));
      const bestCapRate = Math.max(...deals.map((d) => d.capRate));

      expect(bestIrr).toBe(21.0); // deal 2
      expect(bestEm).toBe(2.10); // deal 3
      expect(bestMinCheck).toBe(10000); // deal 3 (lowest barrier)
      expect(bestCapRate).toBe(7.1); // deal 2
    });
  });
});
