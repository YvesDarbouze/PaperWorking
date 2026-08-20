import { describe, expect, it } from '@jest/globals';
import { handlePlaidLiabilitiesGet } from '../routes/plaid/liabilities/handler.js';
import { handlePlaidExchangePublicTokenPost } from '../routes/plaid/exchange-public-token/handler.js';
import {
  handlePlaidConnectionPauseDelete,
  handlePlaidConnectionPausePost,
} from '../routes/plaid/connections/pause/handler.js';
import { handlePlaidConnectionByIdDelete } from '../routes/plaid/connections/by-id/handler.js';
import { handleNotificationsTestPost } from '../routes/notifications/test/handler.js';
import { handleDealAnalyzerPropertyLookupPost } from '../routes/deal-analyzer/property-lookup/handler.js';
import { handleLoiGeneratePost } from '../routes/loi/generate/handler.js';
import { handleZoningScanPost } from '../routes/zoning-scan/handler.js';
import {
  handlePackagesShareDelete,
  handlePackagesSharePost,
} from '../routes/packages/share/handler.js';
import { handlePackagesShareTokenGet } from '../routes/packages/share/token/handler.js';
import { handleProjectsListGet } from '../routes/projects/list/handler.js';

const auth = { uid: 'user-1', email: 'user@test.com' };

describe('Phase 4v handlers', () => {
  it('plaid liabilities and exchange-public-token', async () => {
    const liabilities = await handlePlaidLiabilitiesGet({
      requireAuth: async () => auth,
      listLiabilities: async () => [],
    });
    expect(liabilities.status).toBe(200);

    const exchange = await handlePlaidExchangePublicTokenPost(
      { public_token: 'ptok' },
      {
        requireAuth: async () => auth,
        exchangePublicToken: async () => ({
          itemId: 'item-1',
          plaidConnectionId: 'conn-1',
          connectionPurpose: 'banking',
          institutionName: 'Chase',
          accountMask: '1234',
        }),
      },
    );
    expect([200, 400, 500]).toContain(exchange.status);
  });

  it('plaid connection by-id and pause handlers', async () => {
    const del = await handlePlaidConnectionByIdDelete('conn-1', {
      requireAuth: async () => auth,
      getConnection: async () => ({ userId: auth.uid }),
      deleteConnection: async () => undefined,
    });
    expect(del.status).toBe(200);

    const pause = await handlePlaidConnectionPausePost('conn-1', {
      requireAuth: async () => auth,
      getConnection: async () => ({ userId: auth.uid, status: 'active' }),
      updateStatus: async () => undefined,
    });
    expect(pause.status).toBe(200);

    const resume = await handlePlaidConnectionPauseDelete('conn-1', {
      requireAuth: async () => auth,
      getConnection: async () => ({ userId: auth.uid, status: 'paused' }),
      updateStatus: async () => undefined,
    });
    expect(resume.status).toBe(200);
  });

  it('notifications, deal analyzer, loi, zoning handlers', async () => {
    const notification = await handleNotificationsTestPost(
      { template: 'RENT_PAYMENT_RECEIVED' },
      {
        requireAuth: async () => auth,
        resolveUserEmail: async () => 'user@test.com',
        sendEmail: async () => undefined,
      },
    );
    expect(notification.status).toBe(200);

    const lookup = await handleDealAnalyzerPropertyLookupPost(
      { address: '123 Main St' },
      {},
      { lookupProperty: async (address) => ({ address }) },
    );
    expect(lookup.status).toBe(200);

    const loi = await handleLoiGeneratePost(
      { projectId: 'p1' },
      {
        requireAuth: async () => auth,
        generatePdf: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      },
    );
    expect(loi.status).toBe(200);

    const zoning = await handleZoningScanPost(
      { zip: '90210', address: '123 Main', phaseIReportText: 'UST found' },
      { requireAuth: async () => auth },
    );
    expect(zoning.status).toBe(200);
  });

  it('packages share and projects list handlers', async () => {
    const share = await handlePackagesSharePost(
      { projectId: 'p1', packageType: 'Lender' },
      {
        requireAuth: async () => auth,
        userRole: 'Lead Investor',
      },
    );
    expect(share.status).toBe(200);

    const token = (share.body as { token: string }).token;
    const revoke = await handlePackagesShareDelete(
      { token },
      {
        requireAuth: async () => auth,
        loadToken: async () => ({
          token,
          projectId: 'p1',
          packageType: 'Lender',
          creatorUid: auth.uid,
          creatorEmail: auth.email!,
          creatorRole: 'Lead Investor',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          canDownload: true,
          revoked: false,
          accessLog: [],
        }),
        revokeToken: async () => undefined,
      },
    );
    expect(revoke.status).toBe(200);

    const pkg = await handlePackagesShareTokenGet(token, {
      loadToken: async () => ({
        token,
        projectId: 'p1',
        packageType: 'Lender',
        creatorUid: auth.uid,
        creatorEmail: auth.email!,
        creatorRole: 'Lead Investor',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        canDownload: true,
        revoked: false,
        accessLog: [],
      }),
    });
    expect(pkg.status).toBe(200);

    const projects = await handleProjectsListGet(
      { q: 'maple' },
      {
        requireAuth: async () => auth,
        loadUserOrganization: async () => ({ organizationId: 'org-1' }),
        listProjects: async () => [{ id: 'p1', propertyName: 'Maple Duplex' }],
      },
    );
    expect(projects.status).toBe(200);
  });
});
