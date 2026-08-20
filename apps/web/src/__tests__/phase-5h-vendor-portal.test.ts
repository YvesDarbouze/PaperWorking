import {
  handleVendorPortalRequestsGet,
  handleVendorPortalRequestsPut,
} from '@paperworking/api';
import { WEB_APP_STATUS } from '../index.js';
import {
  getSeedVendorProfile,
  listSeedVendorRequests,
  loadSeedProjectsMap,
  updateSeedVendorProfile,
  updateSeedVendorRequest,
} from '../../lib/vendor-portal/seed-data.js';

describe('phase 5h — web app status', () => {
  it('includes vendor portal routes', () => {
    expect(WEB_APP_STATUS.vendorPortalRoutes).toContain('/vendor-portal');
    expect(WEB_APP_STATUS.vendorPortalRoutes).toContain('/vendor-portal/profile');
  });
});

describe('phase 5h — vendor portal seed data', () => {
  it('lists seeded vendor requests', () => {
    const requests = listSeedVendorRequests('dev-user-1');
    expect(requests.length).toBeGreaterThanOrEqual(3);
    expect(requests.some((request) => request.status === 'PENDING')).toBe(true);
  });

  it('enriches requests with project metadata', () => {
    const requests = listSeedVendorRequests('dev-user-1');
    const projectsMap = loadSeedProjectsMap(
      requests.map((request) => String(request.projectId)),
    );
    expect(projectsMap['deal-1']?.propertyName).toBeTruthy();
  });

  it('updates profile and quote state in memory', () => {
    updateSeedVendorRequest({
      requestId: 'vreq-1',
      projectId: 'deal-1',
      targetStatus: 'QUOTED',
      quotedFee: 12500,
    });
    const updated = listSeedVendorRequests('dev-user-1').find(
      (request) => request.id === 'vreq-1',
    );
    expect(updated?.status).toBe('QUOTED');
    expect(updated?.quotedFee).toBe(12500);

    const profile = updateSeedVendorProfile({ companyName: 'Updated Vendor Co.' });
    expect(profile.companyName).toBe('Updated Vendor Co.');
    expect(getSeedVendorProfile().companyName).toBe('Updated Vendor Co.');
  });
});

describe('phase 5h — vendor portal handlers', () => {
  it('returns enriched vendor requests', async () => {
    const requests = listSeedVendorRequests('dev-user-1');
    const result = await handleVendorPortalRequestsGet({
      requireAuth: async () => ({ uid: 'dev-user-1' }),
      listRequests: async () => requests,
      loadProjects: async (projectIds) => loadSeedProjectsMap(projectIds),
    });
    expect(result.status).toBe(200);
    const body = result.body as { success: boolean; requests: Array<{ dealName: string }> };
    expect(body.success).toBe(true);
    expect(body.requests[0]?.dealName).toBeTruthy();
  });

  it('accepts quote updates via PUT handler', async () => {
    const result = await handleVendorPortalRequestsPut(
      { requestId: 'vreq-2', projectId: 'deal-2', quotedFee: 2600 },
      {
        requireAuth: async () => ({ uid: 'dev-user-1' }),
        updateRequest: async (input) => updateSeedVendorRequest(input),
      },
    );
    expect(result.status).toBe(200);
    const body = result.body as { success: boolean };
    expect(body.success).toBe(true);
  });
});
