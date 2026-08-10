import {
  generateDealSlug,
  normalizeAddress,
  checkDuplicateDeal,
  createAnalyzerHandoffPayload,
} from '@/lib/deals/slugUtils';

describe('Deals Address-First Search & Creation Utilities (PROMPT 2)', () => {
  describe('generateDealSlug', () => {
    it('generates canonical slug by stripping spaces and punctuation, lowercasing', () => {
      expect(generateDealSlug('123 Main St, Austin, TX 78701')).toBe('123mainstaustintx78701');
      expect(generateDealSlug('456 Oak Ave, Suite 100, Dallas, TX 75201')).toBe('456oakavesuite100dallastx75201');
      expect(generateDealSlug('  789 Pine Rd.,  Houston TX ')).toBe('789pinerdhoustontx');
    });

    it('handles empty or non-string input gracefully', () => {
      expect(generateDealSlug('')).toBe('');
      // @ts-ignore
      expect(generateDealSlug(null)).toBe('');
    });
  });

  describe('normalizeAddress', () => {
    it('normalizes multi-space and comma formatting', () => {
      expect(normalizeAddress('  123   Main St ,  Austin , TX  ')).toBe('123 Main St , Austin , TX');
      expect(normalizeAddress('456 Oak Ave, Austin, TX')).toBe('456 Oak Ave, Austin, TX');
    });
  });

  describe('checkDuplicateDeal', () => {
    const existingDeals = [
      {
        id: 'deal_1',
        placeId: 'ChIJ1234567890',
        slug: '123mainstaustintx78701',
        displayAddress: '123 Main St, Austin, TX 78701',
      },
      {
        id: 'deal_2',
        placeId: 'ChIJ9876543210',
        slug: '456oakavedallastx75201',
        displayAddress: '456 Oak Ave, Dallas, TX 75201',
      },
    ];

    it('detects duplicate by matching placeId', () => {
      const res = checkDuplicateDeal('ChIJ1234567890', 'someotherslug', existingDeals);
      expect(res.isDuplicate).toBe(true);
      expect(res.existingDeal?.id).toBe('deal_1');
    });

    it('detects duplicate by matching slug', () => {
      const res = checkDuplicateDeal('ChIJnewplace', '123mainstaustintx78701', existingDeals);
      expect(res.isDuplicate).toBe(true);
      expect(res.existingDeal?.id).toBe('deal_1');
    });

    it('detects duplicate by matching address derived slug', () => {
      const res = checkDuplicateDeal(null, '123mainstaustintx78701', existingDeals);
      expect(res.isDuplicate).toBe(true);
      expect(res.existingDeal?.id).toBe('deal_1');
    });

    it('returns false for new unique property', () => {
      const res = checkDuplicateDeal('ChIJunique', '789pinerdhoustontx', existingDeals);
      expect(res.isDuplicate).toBe(false);
      expect(res.existingDeal).toBeUndefined();
    });
  });

  describe('createAnalyzerHandoffPayload', () => {
    it('creates correct snapshot payload for deal analyzer handoff', () => {
      const deal = {
        id: 'deal_123',
        displayAddress: '123 Main St, Austin, TX 78701',
        price: 350000,
        rehabCost: 50000,
        arv: 480000,
        estimatedRent: 3200,
        fundingTarget: 200000,
      };

      const payload = createAnalyzerHandoffPayload(deal);
      expect(payload.dealId).toBe('deal_123');
      expect(payload.address).toBe('123 Main St, Austin, TX 78701');
      expect(payload.purchasePrice).toBe(350000);
      expect(payload.rehabBudget).toBe(50000);
      expect(payload.afterRepairValue).toBe(480000);
      expect(payload.monthlyRent).toBe(3200);
      expect(payload.fundingTarget).toBe(200000);
      expect(payload.analyzerSnapshotId).toContain('snap_deal_123_');
    });
  });
});
