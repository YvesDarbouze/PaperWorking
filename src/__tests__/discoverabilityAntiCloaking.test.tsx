/** @jest-environment jsdom */
import { generateMetadata as generateDealMetadata } from '@/app/deals/[slug]/layout';
import { metadata as searchMetadata } from '@/app/search/layout';
import sitemap from '@/app/sitemap';
import { render } from '@testing-library/react';
import DealTeaserView from '@/components/listings/DealTeaserView';
import type { DealListingTeaser } from '@/types/listing';
import React from 'react';

// Mock DB
const mockGet = jest.fn();
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: jest.fn((colName) => ({
      doc: jest.fn((docId) => ({
        get: async () => {
          const res = await mockGet(colName, docId);
          return {
            exists: !!res,
            data: () => res,
            id: docId,
          };
        },
      })),
      where: jest.fn((field, op, val) => {
        const queryChain: any = {
          where: jest.fn(() => queryChain),
          get: async () => {
            const res = await mockGet(colName, 'query_result');
            const docs = Array.isArray(res)
              ? res.map((item, idx) => ({
                  id: item.id || `doc_${idx}`,
                  data: () => item,
                }))
              : [];
            return { empty: docs.length === 0, docs };
          },
        };
        return queryChain;
      }),
    })),
  },
}));

describe('DM-41: Discoverability and Anti-Cloaking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset();
  });

  describe('Sitemap generation', () => {
    it('includes static routes and only published PUBLIC_SOLICITED deals', async () => {
      mockGet.mockImplementation((colName, key) => {
        if (colName === 'dealListings' && key === 'query_result') {
          return [
            { id: 'deal_solicited_1', status: 'published', visibilityMode: 'PUBLIC_SOLICITED', updatedAt: '2026-07-23T19:21:31Z' },
          ];
        }
        return null;
      });

      const sitemapEntries = await sitemap();
      const urls = sitemapEntries.map((e) => e.url);

      // Includes static routes
      expect(urls).toContain('https://paperworking.com/search');
      expect(urls).toContain('https://paperworking.com/pricing');

      // Includes PUBLIC_SOLICITED published deal
      expect(urls).toContain('https://paperworking.com/deals/deal_solicited_1');

      // Excludes MARKETPLACE or PRIVATE deals completely
      expect(urls).not.toContain('https://paperworking.com/deals/deal_marketplace_1');
      expect(urls).not.toContain('https://paperworking.com/deals/deal_private_1');
    });
  });

  describe('Robots and metadata headers', () => {
    it('allows index/follow for published PUBLIC_SOLICITED deals', async () => {
      mockGet.mockResolvedValueOnce({
        status: 'published',
        visibilityMode: 'PUBLIC_SOLICITED',
        propertyName: 'Public Deal',
        neighborhood: 'Brickell',
      });

      const meta = await generateDealMetadata({ params: Promise.resolve({ listingId: 'deal_1' }) });
      expect(meta.robots).toEqual(expect.objectContaining({
        index: true,
        follow: true,
      }));
    });

    it('excludes PRIVATE deals from indexing entirely (noindex, nofollow)', async () => {
      mockGet.mockResolvedValueOnce({
        status: 'published',
        visibilityMode: 'PRIVATE',
      });

      const meta = await generateDealMetadata({ params: Promise.resolve({ listingId: 'deal_2' }) });
      expect(meta.robots).toEqual(expect.objectContaining({
        index: false,
        follow: false,
      }));
    });

    it('excludes MARKETPLACE deals from indexing entirely (noindex, nofollow)', async () => {
      mockGet.mockResolvedValueOnce({
        status: 'published',
        visibilityMode: 'MARKETPLACE',
      });

      const meta = await generateDealMetadata({ params: Promise.resolve({ listingId: 'deal_3' }) });
      expect(meta.robots).toEqual(expect.objectContaining({
        index: false,
        follow: false,
      }));
    });

    it('allows index/follow for the search surface', () => {
      expect(searchMetadata.robots).toEqual(expect.objectContaining({
        index: true,
        follow: true,
      }));
    });
  });

  describe('Anti-cloaking paywall structured data and container', () => {
    it('renders a JSON-LD payload declaring the paywall and matches the cssSelector', () => {
      const teaser: DealListingTeaser = {
        id: 'deal_1',
        projectId: 'project_1',
        status: 'published',
        propertyName: 'Public Deal',
        neighborhood: 'Brickell',
        city: 'Miami',
        state: 'FL',
        assetClass: 'Residential',
        subStrategy: 'FLIP',
        leadInvestorName: 'John Doe',
        followCount: 5,
        viewCount: 10,
      };

      const { container } = render(<DealTeaserView teaser={teaser} />);

      // Verify the gated portions are wrapped in a container matching the cssSelector '.paywall-gate'
      const paywallGateElement = container.querySelector('.paywall-gate');
      expect(paywallGateElement).not.toBeNull();

      // Verify JSON-LD structured data is present and correct
      const scriptTag = container.querySelector('script[type="application/ld+json"]');
      expect(scriptTag).not.toBeNull();
      const jsonLd = JSON.parse(scriptTag?.innerHTML || '{}');

      expect(jsonLd.isAccessibleForFree).toBe(false);
      expect(jsonLd.hasPart).toEqual({
        '@type': 'WebPageElement',
        'isAccessibleForFree': false,
        'cssSelector': '.paywall-gate',
      });
    });
  });
});
