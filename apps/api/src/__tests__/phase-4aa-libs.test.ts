import { describe, expect, it } from '@jest/globals';
import { validateDriveProvisionBody, buildDriveFoldersPayload } from '../lib/drive/provision.js';
import { validateEventsPostBody, sanitizeEventProperties, MILESTONE_EVENTS } from '../lib/events/ingestion.js';
import { validateLawyerStateQuery } from '../lib/lawyers/query.js';
import { clampMapTileParams, buildGoogleStaticMapUrl } from '../lib/map-tile/static.js';
import { validateMarketVitalsZip, buildZipDemographics } from '../lib/market-vitals/census.js';
import { validateMlsSearchQuery, buildMlsSearchFilter } from '../lib/mls/search.js';
import { validateDeadlineAlertBody, buildDeadlineTimeLabel } from '../lib/notifications/deadline-alert.js';
import { validatePermitLookupQuery } from '../lib/permits/lookup.js';
import { validateGeocodeQuery, parseGeocodeApiResponse } from '../lib/places/geocode.js';
import { validateReportingExportBody, rowsToCsv } from '../lib/reporting/export.js';
import { validateReportsPeriod, computePeriodStart } from '../lib/reports/period.js';
import { validateReilListingsQuery, shouldReturnCachedProperty } from '../lib/reil/listings.js';
import { validateVendorRequestBody, validateVendorPortalQuoteBody } from '../lib/vendors/portal.js';
import { validateSourcingWebhookAuth, parseSourcingOwnershipShares } from '../lib/webhooks/sourcing.js';
import { validateHoldAutoAdvanceBody, checkHoldExitGating } from '../lib/projects/hold-auto-advance.js';
import { buildClosingLedgerCsv } from '../lib/reil/closing-ledger.js';

describe('Phase 4aa libs', () => {
  it('drive, events, lawyers helpers', () => {
    expect(validateDriveProvisionBody({ idToken: 't', projectId: 'p1', propertyAddress: '123 Main' }).ok).toBe(true);
    const folders = buildDriveFoldersPayload({
      parentFolder: { id: 'p', webViewLink: 'url' },
      subFolders: {
        'Closing Docs': { id: 'c', webViewLink: 'c-url' },
        Receipts: { id: 'r', webViewLink: 'r-url' },
        Permits: { id: 'pm', webViewLink: 'pm-url' },
      },
    });
    expect(folders.parentFolderId).toBe('p');
    expect(validateEventsPostBody({ event: 'first_metric_lit' }).ok).toBe(true);
    expect(MILESTONE_EVENTS.has('onboarding_completed')).toBe(true);
    expect(sanitizeEventProperties({ uid: 'x', foo: 'bar' }).foo).toBe('bar');
    expect(validateLawyerStateQuery('ga').ok).toBe(true);
  });

  it('map, market, mls helpers', () => {
    expect(clampMapTileParams({ lat: '33.7', lng: '-84.3' }).ok).toBe(true);
    expect(buildGoogleStaticMapUrl({ lat: 1, lng: 2, zoom: 15, w: 640, h: 320, apiKey: 'key' })).toContain(
      'maps.googleapis.com',
    );
    expect(validateMarketVitalsZip('30318').ok).toBe(true);
    const demo = buildZipDemographics({
      zip: '30318',
      yearlyData: new Map([[2023, { B01003_001E: 1000, B19013_001E: 50000, B25077_001E: 200000, B17001_002E: 100, B01002_001E: 35, B25003_002E: 400, B25003_003E: 600 }]]),
    });
    expect(demo.zipCode).toBe('30318');
    expect(validateMlsSearchQuery('ab').ok).toBe(true);
    expect(buildMlsSearchFilter('Atlanta')).toContain('UnparsedAddress');
  });

  it('notifications, permits, geocode, reporting helpers', () => {
    expect(
      validateDeadlineAlertBody({
        recipientId: 'u1',
        projectId: 'p1',
        dealAddress: '123 Main',
        contingencyType: 'Inspection',
        deadlineDate: '2026-01-01',
        daysUntil: 2,
      }).ok,
    ).toBe(true);
    expect(buildDeadlineTimeLabel(2)).toBe('2 days');
    expect(validatePermitLookupQuery({ propertyAddress: '123 Main', jurisdictionId: 'miami-dade' }).ok).toBe(true);
    expect(validateGeocodeQuery('123 Main').ok).toBe(true);
    expect(parseGeocodeApiResponse({ status: 'OK', results: [{ formatted_address: '123 Main', geometry: { location: { lat: 1, lng: 2 } } }] }).lat).toBe(1);
    expect(validateReportingExportBody({ format: 'csv', type: 'pl', projectIds: ['p1'] }).ok).toBe(true);
    expect(rowsToCsv([['a', 'b']]).includes('"a"')).toBe(true);
    expect(validateReportsPeriod('monthly').ok).toBe(true);
    expect(computePeriodStart('yearly').getFullYear()).toBeLessThan(new Date().getFullYear());
  });

  it('reil, vendor, webhook, hold helpers', () => {
    expect(validateReilListingsQuery({ zipCode: '30318' }).ok).toBe(true);
    expect(shouldReturnCachedProperty(new Date().toISOString(), false)).toBe(true);
    expect(validateVendorRequestBody({ idToken: 't', projectId: 'p1', vendorUid: 'v1', message: 'hi' }).ok).toBe(true);
    expect(validateVendorPortalQuoteBody({ requestId: 'r1', projectId: 'p1', quotedFee: 100 }).ok).toBe(true);
    expect(validateSourcingWebhookAuth({ webhookSecret: 'sec', authorization: 'Bearer sec' }).ok).toBe(true);
    expect(parseSourcingOwnershipShares('{"A":50,"B":50}')).toEqual({ A: 50, B: 50 });
    expect(validateHoldAutoAdvanceBody({ costBasis: 1, capitalizedImprovements: 2, holdingCosts: 3, outcome: 'sell' }).ok).toBe(true);
    expect(checkHoldExitGating({ sale_under_contract: true }).ok).toBe(true);
    expect(buildClosingLedgerCsv([{ label: 'Title', isOverridden: false, computed: 100, amount: 100 }], 100, '123 Main', '2026-01-01')).toContain('Title');
  });
});
