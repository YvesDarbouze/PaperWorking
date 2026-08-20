import { describe, expect, it } from '@jest/globals';
import { handleDriveProvisionPost } from '../routes/drive/provision/handler.js';
import { handleE2eFollowsGet, handleE2eFollowsPost } from '../routes/e2e/follows/handler.js';
import { handleEventsPost } from '../routes/events/handler.js';
import { handleLawyersGet } from '../routes/lawyers/handler.js';
import { handleMapTileGet } from '../routes/map-tile/handler.js';
import { handleMarketVitalsGet } from '../routes/market-vitals/handler.js';
import { handleMlsSearchGet } from '../routes/mls/search/handler.js';
import { handleNotificationsDeadlineAlertPost } from '../routes/notifications/deadline-alert/handler.js';
import { handlePermitsGet } from '../routes/permits/handler.js';
import { handlePlacesGeocodeGet } from '../routes/places/geocode/handler.js';
import { handlePresenceHeartbeatPost } from '../routes/presence/heartbeat/handler.js';
import { handleReportingExportPost } from '../routes/reporting/export/handler.js';
import { handleReportsPeriodGet } from '../routes/reports/period/handler.js';
import { handleVendorPortalRequestsGet, handleVendorPortalRequestsPut } from '../routes/vendor-portal/requests/handler.js';
import { handleVendorsRequestPost } from '../routes/vendors/request/handler.js';
import { handleWebhooksSourcingPost } from '../routes/webhooks/sourcing/handler.js';
import {
  handleReilListingsGet,
  handleReilMarketStatsGet,
  handleReilCronRefreshPost,
} from '../routes/reil/listings/handler.js';
import {
  handleReilProjectPropertyPost,
  handleReilProjectValuationGet,
  handleReilProjectValuationPost,
} from '../routes/reil/projects/enrichment/handler.js';
import { handleReilClosingLedgerExportGet } from '../routes/reil/projects/closing-ledger/handler.js';
import { handleProjectsHoldAutoAdvancePost } from '../routes/projects/hold/auto-advance/handler.js';
import { handlePlaidExchangeV2Post } from '../routes/plaid/exchange-v2/handler.js';

const auth = { uid: 'user-1', email: 'user@test.com' };

describe('Phase 4aa handlers', () => {
  it('utility handlers batch 1', async () => {
    expect(
      (
        await handleDriveProvisionPost(
          { idToken: 'tok', projectId: 'p1', propertyAddress: '123 Main' },
          {
            verifyIdToken: async () => ({ uid: auth.uid }),
            loadContext: async () => ({ exists: true, dealOrgId: 'org', userOrgId: 'org' }),
          },
        )
      ).status,
    ).toBe(200);

    expect((await handleE2eFollowsGet({ nodeEnv: 'test', load: async () => ({ follows: [], consents: [] }) })).status).toBe(200);
    expect((await handleE2eFollowsPost({ nodeEnv: 'test' })).status).toBe(200);

    expect(
      (
        await handleEventsPost(
          { event: 'first_project_created', properties: { source: 'test' } },
          { requireAuth: async () => auth, authToken: { provider_id: 'password' } },
        )
      ).status,
    ).toBe(200);

    expect(
      (await handleLawyersGet({ state: 'GA' }, { requireAuth: async () => auth, queryLawyers: async () => [] })).status,
    ).toBe(200);

    expect(
      (
        await handleMapTileGet(
          { lat: '33.7', lng: '-84.3' },
          {
            requireAuth: async () => auth,
            placesApiKey: 'key',
            fetchTile: async () => ({ buffer: new Uint8Array([1, 2, 3]).buffer, contentType: 'image/png' }),
          },
        )
      ).status,
    ).toBe(200);
  });

  it('utility handlers batch 2', async () => {
    expect(
      (
        await handleMarketVitalsGet(
          { zip: '30318' },
          {
            requireAuth: async () => auth,
            fetchAcsYear: async () => ({
              B01003_001E: 1000,
              B19013_001E: 50000,
              B25077_001E: 200000,
              B17001_002E: 100,
              B01002_001E: 35,
              B25003_002E: 400,
              B25003_003E: 600,
            }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (await handleMlsSearchGet({ q: 'Atlanta' }, { requireAuth: async () => auth, search: async () => [] })).status,
    ).toBe(200);

    expect(
      (
        await handleNotificationsDeadlineAlertPost(
          {
            recipientId: 'u2',
            projectId: 'p1',
            dealAddress: '123 Main',
            contingencyType: 'Inspection',
            deadlineDate: '2026-02-01',
            daysUntil: 3,
          },
          { authorization: 'Bearer tok' },
          { verifyBearer: async () => ({ uid: auth.uid }) },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handlePermitsGet(
          { propertyAddress: '123 Main', jurisdictionId: 'miami-dade' },
          { requireAuth: async () => auth, lookupPermit: async () => ({ status: 'OPEN' }) },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handlePlacesGeocodeGet(
          { address: '123 Main St' },
          {
            requireAuth: async () => auth,
            placesApiKey: 'key',
            fetchGeocode: async () => ({
              status: 'OK',
              results: [{ formatted_address: '123 Main St', geometry: { location: { lat: 1, lng: 2 } } }],
            }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (await handlePresenceHeartbeatPost({ authorization: 'Bearer tok' }, { verifyBearer: async () => ({ uid: auth.uid }) }))
        .status,
    ).toBe(200);
  });

  it('reporting, vendor, webhook, reil handlers', async () => {
    expect(
      (
        await handleReportingExportPost(
          { format: 'json', type: 'pl', projectIds: ['p1'] },
          {
            requireAuth: async () => auth,
            authorizeProjects: async () => [{ id: 'p1' }],
            buildRows: async () => [['Net', '$0']],
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleReportsPeriodGet(
          'monthly',
          { organizationId: 'org-1' },
          {
            requireAuth: async () => auth,
            verifyOrgAccess: async () => true,
            loadTransactions: async () => [{ amount: 100 }],
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleVendorPortalRequestsGet({
          requireAuth: async () => auth,
          listRequests: async () => [{ id: 'r1', projectId: 'p1', requestedAt: new Date().toISOString() }],
          loadProjects: async () => ({ p1: { propertyName: 'Deal' } }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await handleVendorPortalRequestsPut(
          { requestId: 'r1', projectId: 'p1', quotedFee: 500 },
          { requireAuth: async () => auth },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleVendorsRequestPost(
          { idToken: 'tok', projectId: 'p1', vendorUid: 'v1', message: 'Need quote' },
          {
            verifyIdToken: async () => ({ uid: auth.uid }),
            loadContext: async () => ({ hasSubscription: true, hasProjectAccess: true, vendorExists: true }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleWebhooksSourcingPost(
          { organizationId: 'org-1', sourceVendor: 'VendorX', address: '123 Main' },
          { authorization: 'Bearer secret' },
          { webhookSecret: 'secret', createLead: async (data) => data },
        )
      ).status,
    ).toBe(200);

    const params = new URLSearchParams({ zipCode: '30318' });
    expect(
      (await handleReilListingsGet(params, { requireAuth: async () => auth, searchListings: async () => [] })).status,
    ).toBe(200);
    expect(
      (await handleReilMarketStatsGet({ zipCode: '30318' }, { requireAuth: async () => auth, fetchStats: async () => ({}) }))
        .status,
    ).toBe(200);
    expect(
      (await handleReilCronRefreshPost({ authorization: 'Bearer cron' }, { cronSecret: 'cron', runRefresh: async () => ({ scanned: 1, refreshed: 1, apiCallsMade: 1 }) }))
        .status,
    ).toBe(200);
  });

  it('reil enrichment, closing ledger, hold auto-advance, plaid v2', async () => {
    const reilProject = { id: 'rp1', createdById: auth.uid, addressLine: '123 Main' };
    expect(
      (
        await handleReilProjectPropertyPost(
          'rp1',
          {},
          {
            requireAuth: async () => auth,
            getProject: async () => reilProject,
            enrichProperty: async () => ({ facts: {}, compsCount: 0, rentalCompsCount: 0 }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleReilProjectValuationGet('rp1', {
          requireAuth: async () => auth,
          getProject: async () => reilProject,
          getSnapshots: async () => [],
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await handleReilProjectValuationPost('rp1', {
          requireAuth: async () => auth,
          getProject: async () => reilProject,
          createSnapshot: async () => ({
            id: 's1',
            projectId: 'rp1',
            valueCents: 100,
            valueLowCents: 90,
            valueHighCents: 110,
            source: 'mock',
          }),
        })
      ).status,
    ).toBe(200);

    expect(
      (
        await handleReilClosingLedgerExportGet(
          'rp1',
          { format: 'csv' },
          {
            requireAuth: async () => auth,
            loadProject: async () => ({ authorized: true, address: '123 Main', financials: {} }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handleProjectsHoldAutoAdvancePost(
          'p1',
          { costBasis: 100, capitalizedImprovements: 20, holdingCosts: 10, outcome: 'sell' },
          {
            requireAuth: async () => auth,
            verifyAccess: async () => ({ authorized: true, project: { financials: { sale_under_contract: true } } }),
            authorizeMutation: () => ({ authorized: true }),
          },
        )
      ).status,
    ).toBe(200);

    expect(
      (
        await handlePlaidExchangeV2Post(
          { publicToken: 'public-tok' },
          {
            requireAuth: async () => auth,
            exchangePublicToken: async () => ({
              itemId: 'item-1',
              plaidConnectionId: 'conn-1',
              connectionPurpose: 'OPERATING_EXPENSES',
              institutionName: 'Bank',
              accountMask: '0000',
            }),
          },
        )
      ).status,
    ).toBe(200);
  });
});
