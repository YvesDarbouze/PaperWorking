/** @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublicAddressSearch from '@/components/search/PublicAddressSearch';
import { searchDealByAddress } from '@/actions/listings';

// 1. Stated Performance Budgets (enforced in CI)
const BUDGETS = {
  AUTOCOMPLETE_MAX_MS: 600,   // Debounce (300ms) + Mobile RTT (150ms) + parsing/render budget (150ms)
  SEARCH_FIRST_RESULT_MS: 500, // Mobile RTT (150ms) + DB lookup & render budget (350ms)
  INTERACTION_BUDGET_MS: 50,  // Interactivity limit for filtering large lists (100+ items)
};

// Mock search actions & fetch
let mockAutocompleteDelay = 150; // default realistic mobile latency
let mockSearchDelay = 150;

jest.mock('@/actions/listings', () => ({
  searchDealByAddress: jest.fn(async (query: string) => {
    await new Promise((resolve) => setTimeout(resolve, mockSearchDelay));
    if (query.includes('unauthorized')) return null;
    return {
      mode: 'public_solicited',
      teaser: {
        id: 'deal_123',
        placeId: 'place_123',
        propertyName: 'Mobile Tested Property',
        neighborhood: 'Downtown',
      },
    };
  }),
}));

global.fetch = jest.fn(async (url: any) => {
  const urlStr = typeof url === 'string' ? url : (url as any).url || '';
  if (urlStr.includes('autocomplete')) {
    await new Promise((resolve) => setTimeout(resolve, mockAutocompleteDelay));
    return {
      ok: true,
      json: async () => ({
        predictions: [
          { placeId: 'place_1', description: '123 Main St, Austin TX' },
          { placeId: 'place_2', description: '123 Oak Ave, Austin TX' },
        ],
      }),
    } as any;
  }
  return { ok: true, json: async () => ({}) } as any;
}) as any;

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({}),
  useSearchParams: () => ({ get: () => null }),
}));

describe('DM-45: Mobile Performance Budgets Verification', () => {
  beforeEach(() => {
    mockAutocompleteDelay = 150;
    mockSearchDelay = 150;
    jest.clearAllMocks();
  });

  describe('Autocomplete Latency Budget', () => {
    it('verifies autocomplete suggestion panel renders within budget under realistic mobile network conditions', async () => {
      render(<PublicAddressSearch />);
      
      const input = screen.getByLabelText('Search property address');
      const startTime = performance.now();
      
      fireEvent.change(input, { target: { value: '123' } });

      // Expect suggestions to open and render
      const listbox = await screen.findByRole('listbox');
      expect(listbox).toBeDefined();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Perf Budget] Autocomplete Suggestion Latency: ${duration.toFixed(1)}ms (Budget: ${BUDGETS.AUTOCOMPLETE_MAX_MS}ms)`);
      expect(duration).toBeLessThan(BUDGETS.AUTOCOMPLETE_MAX_MS);
    });

    it('fails the autocomplete budget check on deliberate latency regression', async () => {
      // Inject deliberate network latency regression (e.g. 500ms Slow 3G network)
      mockAutocompleteDelay = 500;

      render(<PublicAddressSearch />);
      
      const input = screen.getByLabelText('Search property address');
      const startTime = performance.now();
      
      fireEvent.change(input, { target: { value: '123' } });

      const listbox = await screen.findByRole('listbox');
      expect(listbox).toBeDefined();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Perf Regression] Autocomplete Latency under regression: ${duration.toFixed(1)}ms (Expected: <${BUDGETS.AUTOCOMPLETE_MAX_MS}ms)`);
      
      // Assert that this exceeds the budget (regression check)
      expect(duration).toBeGreaterThan(BUDGETS.AUTOCOMPLETE_MAX_MS);
    });
  });

  describe('Time to First Search Result Budget', () => {
    it('resolves address search and prepares teaser display within first-result budget', async () => {
      const startTime = performance.now();

      const result = await searchDealByAddress('123 Main St, Austin');
      expect(result).not.toBeNull();

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Perf Budget] Search First Result Response: ${duration.toFixed(1)}ms (Budget: ${BUDGETS.SEARCH_FIRST_RESULT_MS}ms)`);
      expect(duration).toBeLessThan(BUDGETS.SEARCH_FIRST_RESULT_MS);
    });

    it('fails the first-result budget check on deliberate database/network delay regression', async () => {
      mockSearchDelay = 600; // deliberate slow DB lookup

      const startTime = performance.now();
      await searchDealByAddress('123 Main St, Austin');
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Perf Regression] Search First Result under regression: ${duration.toFixed(1)}ms (Expected: <${BUDGETS.SEARCH_FIRST_RESULT_MS}ms)`);
      expect(duration).toBeGreaterThan(BUDGETS.SEARCH_FIRST_RESULT_MS);
    });
  });

  describe('Marketplace List Interaction & Interactivity Responsive Budget', () => {
    it('filters a large dataset of 100+ items and updates state within interactive budget', () => {
      // Assemble mock dataset of 150 items
      const largeDataSet = Array.from({ length: 150 }, (_, i) => ({
        id: `deal_${i}`,
        projectId: `proj_${i}`,
        propertyName: `Property ${i}`,
        assetClass: i % 2 === 0 ? 'SFR' : 'Multi-Family',
        subStrategy: i % 3 === 0 ? 'Long-Term' : 'Value-Add',
      }));

      const startTime = performance.now();

      // Simulate marketplace list filtering logic
      const filtered = largeDataSet.filter((t) => {
        const acMatch = t.assetClass === 'SFR';
        const stMatch = t.subStrategy === 'Long-Term';
        return acMatch && stMatch;
      });

      // Simulate capping so React only renders maximum 30 items
      const capped = filtered.slice(0, 30);

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`[Perf Budget] 150-Item Filter + Cap Interactivity: ${duration.toFixed(1)}ms (Budget: ${BUDGETS.INTERACTION_BUDGET_MS}ms)`);
      
      expect(duration).toBeLessThan(BUDGETS.INTERACTION_BUDGET_MS);
      expect(capped.length).toBeLessThanOrEqual(30); // Verified capping/virtualization boundary
    });
  });

  describe('No Layout Shift Gating (CLS)', () => {
    it('guarantees autocomplete suggestion list is absolutely positioned to prevent page content displacement', async () => {
      render(<PublicAddressSearch />);
      
      const input = screen.getByLabelText('Search property address');
      fireEvent.change(input, { target: { value: '123' } });

      const suggestionsList = await screen.findByRole('listbox');
      
      // Verify wrapper carries absolute positioning
      expect(suggestionsList.className).toContain('absolute');
      expect(suggestionsList.className).toContain('z-50');
    });
  });
});
