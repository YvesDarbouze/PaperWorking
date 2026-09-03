import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  buildDealsCommandService,
  buildDealsReadService,
  buildHandlerDeps,
  buildInboxCommandService,
  buildInboxReadService,
  buildMarketplaceFollowCommandService,
  buildMarketplaceInvestorsReadService,
  buildMarketplaceProfileReadService,
  buildProjectDocumentsCommandService,
  buildProjectDocumentsReadService,
  buildProjectKpiReadService,
  buildPortfolioMetricsReadService,
  buildPortfolioInsightsReadService,
  buildProjectsCommandService,
  buildProjectsReadService,
  buildProfileReadService,
  buildProfileCommandService,
  buildBillingReadService,
  buildBillingCheckoutService,
  buildBillingPortalService,
  buildBillingSubscriptionCommandService,
  buildAdminOpsReadService,
  buildAdminRentcastReadService,
  buildAdminLenderReadService,
  buildAdminAgentCrewReadService,
  buildAdminAgentCrewCommandService,
  buildReportsReadService,
  buildReportsGenerateService,
  buildTeamCommandService,
  buildTeamMembersReadService,
  buildVendorPortalCommandService,
  buildVendorPortalReadService,
  buildVendorsReadService,
  resetHandlerDepsForTests,
} from '../../lib/api/handler-deps.js';

describe('Firestore handler deps', () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    resetHandlerDepsForTests();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetHandlerDepsForTests();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });

  it('builds core handler deps without DATABASE_URL', () => {
    expect(() => buildHandlerDeps()).not.toThrow();
    const deps = buildHandlerDeps();
    expect(deps.authorization).toBeDefined();
    expect(deps.authzStore).toBeDefined();
    expect(deps.health.breakers).toBeDefined();
    expect(deps.health.environment).toBeDefined();
    expect(deps.health.appName).toBe('PaperWorking (Next.js)');
    expect(deps.health.pingPostgres).toBeUndefined();
  });

  it('does not require DATABASE_URL to construct Firestore-backed services', () => {
    expect(() => buildProjectsReadService()).not.toThrow();
    expect(() => buildProjectsCommandService()).not.toThrow();
    expect(() => buildDealsReadService()).not.toThrow();
    expect(() => buildDealsCommandService()).not.toThrow();
    expect(() => buildProjectKpiReadService()).not.toThrow();
    expect(() => buildProjectDocumentsReadService()).not.toThrow();
    expect(() => buildProjectDocumentsCommandService()).not.toThrow();
    expect(() => buildPortfolioMetricsReadService()).not.toThrow();
    expect(() => buildPortfolioInsightsReadService()).not.toThrow();
    expect(() => buildInboxReadService()).not.toThrow();
    expect(() => buildInboxCommandService()).not.toThrow();
    expect(() => buildTeamMembersReadService()).not.toThrow();
    expect(() => buildTeamCommandService()).not.toThrow();
    expect(() => buildMarketplaceProfileReadService()).not.toThrow();
    expect(() => buildMarketplaceInvestorsReadService()).not.toThrow();
    expect(() => buildMarketplaceFollowCommandService()).not.toThrow();
    expect(() => buildVendorsReadService()).not.toThrow();
    expect(() => buildVendorPortalReadService()).not.toThrow();
    expect(() => buildVendorPortalCommandService()).not.toThrow();
    expect(() => buildProfileReadService()).not.toThrow();
    expect(() => buildProfileCommandService()).not.toThrow();
    expect(() => buildReportsReadService()).not.toThrow();
    expect(() => buildReportsGenerateService()).not.toThrow();
    expect(() => buildBillingReadService()).not.toThrow();
    expect(() => buildBillingCheckoutService()).not.toThrow();
    expect(() => buildBillingPortalService()).not.toThrow();
    expect(() => buildBillingSubscriptionCommandService()).not.toThrow();
    expect(() => buildAdminOpsReadService()).not.toThrow();
    expect(() => buildAdminRentcastReadService()).not.toThrow();
    expect(() => buildAdminLenderReadService()).not.toThrow();
    expect(() => buildAdminAgentCrewReadService()).not.toThrow();
    expect(() => buildAdminAgentCrewCommandService()).not.toThrow();

    expect(typeof buildProjectsReadService().listProjects).toBe('function');
    expect(typeof buildProjectsCommandService().createProject).toBe('function');
    expect(typeof buildDealsReadService().listDeals).toBe('function');
    expect(typeof buildDealsCommandService().createDeal).toBe('function');
    expect(typeof buildProjectKpiReadService().getCurrentProjectKpis).toBe('function');
    expect(typeof buildProjectDocumentsReadService().listDocuments).toBe('function');
    expect(typeof buildProjectDocumentsCommandService().uploadDocument).toBe('function');
    expect(typeof buildPortfolioMetricsReadService().getPortfolioMetrics).toBe('function');
    expect(typeof buildPortfolioInsightsReadService().getPortfolioInsights).toBe('function');
    expect(typeof buildInboxReadService().listInbox).toBe('function');
    expect(typeof buildInboxCommandService().updateInboxItem).toBe('function');
    expect(typeof buildTeamMembersReadService().listTeamMembers).toBe('function');
    expect(typeof buildTeamCommandService().inviteMember).toBe('function');
    expect(typeof buildMarketplaceProfileReadService().getMarketplaceProfile).toBe('function');
    expect(typeof buildMarketplaceInvestorsReadService().listInvestors).toBe('function');
    expect(typeof buildMarketplaceFollowCommandService().setInvestorFollow).toBe('function');
    expect(typeof buildVendorsReadService().listVendors).toBe('function');
    expect(typeof buildVendorPortalReadService().getPortalProfile).toBe('function');
    expect(typeof buildVendorPortalCommandService().updateRequest).toBe('function');
    expect(typeof buildProfileReadService().getProfile).toBe('function');
    expect(typeof buildProfileCommandService().updateProfile).toBe('function');
    expect(typeof buildReportsReadService().getPortfolioReport).toBe('function');
    expect(typeof buildReportsGenerateService().generateExport).toBe('function');
    expect(typeof buildBillingReadService().getSummary).toBe('function');
    expect(typeof buildBillingCheckoutService().createCheckout).toBe('function');
    expect(typeof buildBillingPortalService().createPortalSession).toBe('function');
    expect(typeof buildBillingSubscriptionCommandService().cancelSubscription).toBe('function');
    expect(typeof buildAdminOpsReadService().getOpsSection).toBe('function');
    expect(typeof buildAdminRentcastReadService().getUsage).toBe('function');
    expect(typeof buildAdminLenderReadService().getRates).toBe('function');
    expect(typeof buildAdminAgentCrewReadService().listAgents).toBe('function');
    expect(typeof buildAdminAgentCrewCommandService().deleteAgent).toBe('function');
  });
});
