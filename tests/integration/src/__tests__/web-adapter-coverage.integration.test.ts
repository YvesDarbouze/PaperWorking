import * as api from '@paperworking/api';

const WEB_ADAPTER_ROUTES: Array<{ path: string; handlers: string[] }> = [
  { path: 'GET /api/health', handlers: ['handleHealthGet'] },
  { path: 'GET /api/auth/me', handlers: ['handleAuthMeGet'] },
  { path: 'GET /api/auth/sessions', handlers: ['handleAuthSessionsGet'] },
  { path: 'POST/DELETE /api/auth/session', handlers: ['handleSessionPost', 'handleSessionDelete'] },
  { path: 'GET /api/projects', handlers: ['handleProjectsListGet'] },
  { path: 'GET /api/projects/[id]', handlers: ['handleProjectGet'] },
  { path: 'GET /api/projects/[id]/kpis/current', handlers: ['handleProjectKpisCurrentGet'] },
  { path: 'GET /api/portfolio/metrics', handlers: ['handlePortfolioMetricsGet'] },
  { path: 'GET /api/insights', handlers: ['handleInsightsGet'] },
  { path: 'GET /api/reports/portfolio', handlers: ['handleReportsPortfolioGet'] },
  { path: 'POST /api/reports/generate', handlers: ['handleReportsGeneratePost'] },
  { path: 'GET /api/reports/[period]', handlers: ['handleReportsPeriodGet'] },
  { path: 'GET /api/marketplace/listings', handlers: ['handleMarketplaceListingsGet'] },
  { path: 'GET /api/marketplace/profile', handlers: ['handleMarketplaceProfileGet'] },
  { path: 'GET /api/marketplace/investors', handlers: ['handleMarketplaceInvestorsGet'] },
  { path: 'POST /api/marketplace/investors/follow', handlers: ['handleMarketplaceInvestorsFollowPost'] },
  { path: 'GET /api/marketplace/investors/[id]', handlers: ['handleMarketplaceInvestorByIdGet'] },
  { path: 'GET /api/deals', handlers: ['handleDealsGet'] },
  { path: 'GET /api/deals/exists', handlers: ['handleDealsExistsGet'] },
  { path: 'GET/PUT /api/vendor-portal/requests', handlers: ['handleVendorPortalRequestsGet', 'handleVendorPortalRequestsPut'] },
  { path: 'GET /api/admin/lender-rates', handlers: ['handleAdminLenderRatesGet'] },
  { path: 'GET /api/admin/lender-checklists', handlers: ['handleAdminLenderChecklistsGet'] },
  { path: 'GET /api/admin/rentcast-usage', handlers: ['handleAdminRentcastUsageGet'] },
  { path: 'GET /api/admin/agent-crew', handlers: ['handleAdminAgentCrewGet'] },
  { path: 'GET/DELETE /api/admin/agent-crew/[id]', handlers: ['handleAdminAgentCrewByIdGet', 'handleAdminAgentCrewByIdDelete'] },
  { path: 'POST /api/admin/agent-crew/[id]/impersonate', handlers: ['handleAdminAgentCrewImpersonatePost'] },
];

describe('integration — web adapter handler registry', () => {
  it('exports every handler referenced by Phase 5 web adapters', () => {
    for (const route of WEB_ADAPTER_ROUTES) {
      for (const handler of route.handlers) {
        expect(api).toHaveProperty(handler);
      }
    }
  });

  it('covers 26 handler-backed routes (health + auth/me + auth/sessions + vendor profile inline)', () => {
    expect(WEB_ADAPTER_ROUTES.length).toBe(26);
  });
});
