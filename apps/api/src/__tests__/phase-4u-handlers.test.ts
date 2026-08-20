import { describe, expect, it } from '@jest/globals';
import { handleInsightsPortfolioGet } from '../routes/insights/portfolio/handler.js';
import { handleInsightsTrendsGet } from '../routes/insights/trends/handler.js';
import { handleInsightsMarketGet } from '../routes/insights/market/handler.js';
import { handleRulesProjectSuggestionsGet } from '../routes/rules/project/suggestions/handler.js';
import { handleInvitationsAcceptGet } from '../routes/invitations/accept/handler.js';
import { handleInvestTokenGet } from '../routes/invest/token/handler.js';
import { handleMessagesThreadGet } from '../routes/messages/thread/handler.js';
import { handlePlacesDetailsPost } from '../routes/places/details/handler.js';
import { handlePlacesAutocompletePublicPost } from '../routes/places/autocomplete-public/handler.js';

const token = 'bearer-token';
const auth = { uid: 'user-1' };

describe('Phase 4u handlers', () => {
  it('insights portfolio and trends handlers', async () => {
    const portfolio = await handleInsightsPortfolioGet({
      loadProjects: async () => [{ id: 'p1', financials: {} }],
    });
    expect(portfolio.status).toBe(200);

    const trends = await handleInsightsTrendsGet(
      { metric: 'occupancy', projectId: 'p1' },
      token,
      {
        verifyIdToken: async () => ({ uid: auth.uid, organizationId: 'org-1' }),
        loadTrendsData: async () => ({
          occupancySnapshots: [{ period: '2026-01', occupancyRate: 98 }],
        }),
      },
    );
    expect(trends.status).toBe(200);
  });

  it('insights market handler', async () => {
    const market = await handleInsightsMarketGet(
      { projectId: 'p1', metric: 'cap_rate' },
      token,
      {
        verifyIdToken: async () => ({ uid: auth.uid, organizationId: 'org-1' }),
        loadMarketData: async () => ({
          project: { organizationId: 'org-1', zip: '90210' },
          snapshots: [{ period: '2026-01', capRate: 6 }],
          marketStats: null,
        }),
      },
    );
    expect(market.status).toBe(200);
  });

  it('rules suggestions and invitations accept', async () => {
    const suggestions = await handleRulesProjectSuggestionsGet('p1', {
      requireAuth: async () => auth,
      generateSuggestions: async () => [{ pattern: 'AMZN' }],
    });
    expect(suggestions.status).toBe(200);

    const accept = await handleInvitationsAcceptGet(
      { token: 'invite-token-12345678' },
      {
        resolveInvitation: async () => ({
          status: 'pending',
          expiresAt: new Date(Date.now() + 86400000),
          projectId: 'p1',
        }),
      },
    );
    expect(accept.status).toBe(200);
  });

  it('legacy invest, messages thread, and places handlers', async () => {
    const invest = await handleInvestTokenGet();
    expect(invest.status).toBe(410);

    const thread = await handleMessagesThreadGet('thread-1', {
      loadMessages: async () => [{ id: 'm1', body: 'Hi' }],
    });
    expect(thread.status).toBe(200);

    const details = await handlePlacesDetailsPost(
      { placeId: 'place-1', sessionToken: 'sess' },
      {
        requireAuth: async () => auth,
        fetchDetails: async () => ({ placeId: 'place-1', formattedAddress: '123 Main' }),
      },
    );
    expect(details.status).toBe(200);

    const autocomplete = await handlePlacesAutocompletePublicPost(
      { input: '123 Main St' },
      {
        fetchAutocomplete: async () => [{ placeId: 'p1', description: '123 Main St' }],
      },
    );
    expect(autocomplete.status).toBe(200);
    expect(autocomplete.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
