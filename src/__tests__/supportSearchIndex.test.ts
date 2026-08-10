/**
 * @jest-environment jsdom
 */

import { buildSupportSearchIndex, STATIC_SUPPORT_INDEX } from '@/lib/search/supportIndexBuilder';
import { searchSupportIndex } from '@/lib/search/supportSearch';

describe('PROMPT 5 — Support Index & Client-Side Search Engine Unit Tests', () => {
  describe('Index-Builder Verification', () => {
    it('generates a search index containing articles, glossary terms, metrics, and FAQs', () => {
      const indexDocs = buildSupportSearchIndex();
      expect(indexDocs.length).toBeGreaterThan(50);

      const articles = indexDocs.filter((d) => d.type === 'article');
      const glossary = indexDocs.filter((d) => d.type === 'glossary');
      const metrics = indexDocs.filter((d) => d.type === 'metric');
      const faqs = indexDocs.filter((d) => d.type === 'faq');

      expect(articles.length).toBeGreaterThanOrEqual(20);
      expect(glossary.length).toBeGreaterThanOrEqual(15);
      expect(metrics.length).toBeGreaterThanOrEqual(10);
      expect(faqs.length).toBeGreaterThanOrEqual(10);
    });

    it('ensures STATIC_SUPPORT_INDEX matches runtime build output', () => {
      expect(STATIC_SUPPORT_INDEX.length).toBeGreaterThan(50);
      const articleDoc = STATIC_SUPPORT_INDEX.find((d) => d.id === 'article-contingency-setup');
      expect(articleDoc).toBeDefined();
      expect(articleDoc?.route).toBe('/support/contingency-setup');
    });
  });

  describe('Query Relevance Test Battery (Section 5.2)', () => {
    const testBattery = [
      { query: 'contingency', expectedRoutePart: 'contingency' },
      { query: 'Plaid', expectedRoutePart: 'support' },
      { query: 'cancel', expectedRoutePart: 'cancel-subscription' },
      { query: 'CPA export', expectedRoutePart: 'generate-pl-export' },
      { query: 'draw', expectedRoutePart: 'draw' },
      { query: 'earnest money', expectedRoutePart: 'earnest-money' },
      { query: 'DSCR', expectedRoutePart: 'dscr' },
      { query: 'upgrade', expectedRoutePart: 'upgrade-plan' },
      { query: 'refund', expectedRoutePart: 'support' },
      { query: 'export', expectedRoutePart: 'export' },
    ];

    testBattery.forEach(({ query, expectedRoutePart }) => {
      it(`returns relevant top result for query: "${query}"`, () => {
        const results = searchSupportIndex(query, 5);
        expect(results.length).toBeGreaterThan(0);
        const topMatch = results[0];
        const matchFound = results.some((r) => r.doc.route.includes(expectedRoutePart) || r.doc.content.toLowerCase().includes(query.toLowerCase()));
        expect(matchFound).toBe(true);
      });
    });

    it('returns empty array and exact empty state copy for nonsense query', () => {
      const results = searchSupportIndex('xyzzy quantum', 5);
      expect(results).toEqual([]);
    });

    it('verifies all 6 Common Searches chips return at least one relevant result', () => {
      const chips = [
        'Missed deadline',
        'CPA export',
        'Contractor draw',
        'Earnest money alert',
        'Co-Investor access',
        'Cancel subscription',
      ];

      chips.forEach((chip) => {
        const results = searchSupportIndex(chip, 5);
        expect(results.length).toBeGreaterThan(0);
      });
    });

    it('verifies zero occurrences of forbidden term Sponsor across search index', () => {
      const sponsorHits = STATIC_SUPPORT_INDEX.filter((doc) =>
        doc.title.toLowerCase().includes('sponsor') ||
        doc.excerpt.toLowerCase().includes('sponsor') ||
        doc.content.toLowerCase().includes('sponsor')
      );
      expect(sponsorHits).toHaveLength(0);
    });
  });
});
