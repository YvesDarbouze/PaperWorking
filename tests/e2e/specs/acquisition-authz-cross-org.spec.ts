import { test, expect } from '@playwright/test';
import { createDevSessionForContext } from '../helpers/auth';

test.describe('Multi-Tenant Cross-Organization Security / AuthZ Barrier', () => {
  test('User B (org-beta) cannot read, patch, or mutate User A (org-1) projects', async ({
    context,
    request,
  }) => {
    const port = process.env.PORT ?? '3000';
    const baseUrl = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

    // 1. Establish dev session for User B in org-beta
    await context.addCookies([
      { name: '__e2e_test', value: '1', url: baseUrl },
      { name: 'pw_org_id', value: 'org-beta', url: baseUrl },
    ]);
    await createDevSessionForContext(context, 'investor');

    // 2. User B attempts GET on User A's project (deal-1 in org-1) -> Expect 403 Forbidden
    const getRes = await context.request.get(`${baseUrl}/api/projects/deal-1`);
    expect(getRes.status()).toBe(403);
    const getJson = await getRes.json();
    expect(getJson.error).toBe('Forbidden');

    // 3. User B attempts PATCH acquisition-status on User A's project -> Expect 403 Forbidden
    const patchStatusRes = await context.request.patch(
      `${baseUrl}/api/projects/deal-1/acquisition-status`,
      {
        data: {
          targetStatus: 'dead',
          deadReason: 'numbers_failed',
          deadReasonNotes: 'Malicious external attempt',
        },
      },
    );
    expect(patchStatusRes.status()).toBe(403);
    const patchJson = await patchStatusRes.json();
    expect(patchJson.error).toBe('Forbidden');

    // 4. User B attempts POST offer on User A's project -> Expect 403 Forbidden
    const postOfferRes = await context.request.post(`${baseUrl}/api/projects/deal-1/offers`, {
      data: {
        offerPrice: 400000,
        earnestMoneyAmount: 5000,
      },
    });
    expect(postOfferRes.status()).toBe(403);
    const offerJson = await postOfferRes.json();
    expect(offerJson.error).toBe('Forbidden');

    // 5. User B accesses their own project (deal-org-beta in org-beta) -> Expect 200 OK
    const ownRes = await context.request.get(`${baseUrl}/api/projects/deal-org-beta`);
    expect(ownRes.status()).toBe(200);
    const ownJson = await ownRes.json();
    expect(ownJson.project.propertyName).toBe('100 Beta Tower');
  });
});
