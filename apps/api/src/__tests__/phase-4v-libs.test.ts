import { describe, expect, it } from '@jest/globals';
import { flattenMortgageLiabilities } from '../lib/plaid/liabilities.js';
import { verifyPlaidConnectionOwnership } from '../lib/plaid/connection.js';
import { validateNotificationTestBody } from '../lib/notifications/test.js';
import { validatePropertyLookupBody, isE2ETestContext } from '../lib/deal-analyzer/property-lookup.js';
import { validateLoiGenerateBody, buildLoiDocumentRecord } from '../lib/loi/generate.js';
import { filterProjectsByQuery } from '../lib/projects/list.js';
import { extractRECs, validateZoningScanBody, buildZoningScanResult } from '../lib/zoning/scan.js';
import {
  canCreateShareLink,
  createShareTokenRecord,
  validatePackageTokenAccess,
  validatePackageShareCreateBody,
} from '../lib/packages/share.js';

describe('Phase 4v libs', () => {
  it('formats mortgage liabilities', () => {
    const rows = flattenMortgageLiabilities([
      {
        id: 'conn-1',
        institutionName: 'Chase',
        mortgageLiabilities: [
          {
            id: 'ml-1',
            connectionId: 'conn-1',
            accountId: 'acc-1',
            balance: 200000n,
            fetchedAt: new Date('2026-01-01'),
          },
        ],
      },
    ]);
    expect(rows[0].institutionName).toBe('Chase');
    expect(rows[0].balance).toBe(200000);
  });

  it('validates plaid ownership and notifications', () => {
    expect(verifyPlaidConnectionOwnership({ userId: 'u1' }, 'u1').ok).toBe(true);
    expect(verifyPlaidConnectionOwnership({ userId: 'u1' }, 'u2').ok).toBe(false);
    expect(validateNotificationTestBody({ template: 'RENT_PAYMENT_RECEIVED' }).ok).toBe(true);
  });

  it('property lookup and loi helpers', () => {
    expect(validatePropertyLookupBody({ address: '123 Main' }).ok).toBe(true);
    expect(isE2ETestContext({ e2eHeader: '1' })).toBe(true);
    expect(validateLoiGenerateBody({ projectId: 'p1' }).ok).toBe(true);
    expect(buildLoiDocumentRecord({ docId: 'd1', projectId: 'p1', uploadedByUid: 'u1', uploadedByName: 'Lead' }).id).toBe('d1');
  });

  it('projects list filter', () => {
    const filtered = filterProjectsByQuery(
      [{ propertyName: 'Maple Duplex', address: '1 Main' }, { propertyName: 'Other' }],
      'maple',
    );
    expect(filtered).toHaveLength(1);
  });

  it('zoning scan and package share helpers', () => {
    expect(validateZoningScanBody({ zip: '90210', address: '123 Main' }).ok).toBe(true);
    const recs = extractRECs('underground storage tank found on site');
    expect(recs.length).toBeGreaterThan(0);
    const result = buildZoningScanResult({ zip: '90210', recs });
    expect(result.zipCode).toBe('90210');

    expect(canCreateShareLink('Lead Investor')).toBe(true);
    expect(canCreateShareLink('Team Member')).toBe(false);
    const record = createShareTokenRecord({
      projectId: 'p1',
      packageType: 'Lender',
      creatorUid: 'u1',
      creatorEmail: 'a@b.com',
      creatorRole: 'Lead Investor',
    });
    expect(validatePackageTokenAccess(record).valid).toBe(true);
    expect(validatePackageShareCreateBody({ projectId: 'p1' }).ok).toBe(true);
  });
});
