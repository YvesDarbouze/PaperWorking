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

  it('Bug_49: authorizes investor sessions on GET and POST /api/vendor-portal/requests and enriches custom RFP labels', async () => {
    process.env.TEST_AUTH_UID = 'investor-user-1';
    process.env.TEST_AUTH_ACCOUNT_TYPE = 'investor';

    const { GET: getRequests, POST: postRequest, PUT: putRequest } = await import(
      '../../app/api/vendor-portal/requests/route.js'
    );

    const getRes = await getRequests();
    expect(getRes.status).toBe(200);
    const getJson = (await getRes.json()) as {
      success: boolean;
      requests: Array<{ id: string; dealName: string }>;
    };
    expect(getJson.success).toBe(true);
    expect(Array.isArray(getJson.requests)).toBe(true);

    const postReq = new Request('http://localhost/api/vendor-portal/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'general-rfp',
        projectLabel: '1247 Elm Street Rehab RFP',
        type: 'General Contractor',
        location: '1247 Elm Street, Austin, TX 78702',
        message: 'Full interior and roof scope quote needed within 5 business days.',
      }),
    });
    const postRes = await postRequest(postReq);
    expect(postRes.status).toBe(201);
    const postJson = (await postRes.json()) as {
      success: boolean;
      request: { id: string; dealName: string; location: string; status: string };
    };
    expect(postJson.success).toBe(true);
    expect(postJson.request.dealName).toBe('1247 Elm Street Rehab RFP');
    expect(postJson.request.location).toBe('1247 Elm Street, Austin, TX 78702');
    expect(postJson.request.status).toBe('PENDING');

    // Verify subsequent GET returns the newly created RFP with its custom projectLabel and location
    const getAfterRes = await getRequests();
    const getAfterJson = (await getAfterRes.json()) as {
      requests: Array<{ id: string; dealName: string; location: string; status: string }>;
    };
    const found = getAfterJson.requests.find((r) => r.id === postJson.request.id);
    expect(found).toBeDefined();
    expect(found?.dealName).toBe('1247 Elm Street Rehab RFP');
    expect(found?.location).toBe('1247 Elm Street, Austin, TX 78702');

    // Verify declining via targetStatus or status works even without explicit projectId
    const declineReq = new Request('http://localhost/api/vendor-portal/requests', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: postJson.request.id,
        targetStatus: 'DECLINED',
      }),
    });
    const declineRes = await putRequest(declineReq);
    expect(declineRes.status).toBe(200);
  });
});

