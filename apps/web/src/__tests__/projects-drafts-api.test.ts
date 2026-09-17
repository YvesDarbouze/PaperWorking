import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  GET as getDraft,
  POST as postDraft,
  DELETE as deleteDraft,
} from '../../app/api/projects/drafts/route';
import { clearAllDrafts } from '@/lib/projects/drafts-store';

describe('Projects Drafts API Route (/api/projects/drafts)', () => {
  beforeEach(() => {
    process.env.TEST_AUTH_UID = 'user-draft-test';
    clearAllDrafts();
  });

  it('requires authentication', async () => {
    process.env.TEST_AUTH_UID = 'unauthenticated';
    const res = await getDraft();
    expect(res.status).toBe(401);
  });

  it('returns null draft initially', async () => {
    const res = await getDraft();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.draft).toBeNull();
  });

  it('saves and retrieves a draft project', async () => {
    const payload = {
      step: 2,
      address: '1204 E 7th St',
      strategy: 'flip' as const,
      purchasePrice: 350000,
      rehabBudget: 65000,
      estimatedARV: 520000,
    };

    const postRes = await postDraft(
      new Request('http://localhost/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    );
    expect(postRes.status).toBe(200);
    const postBody = await postRes.json();
    expect(postBody.draft.address).toBe('1204 E 7th St');
    expect(postBody.draft.step).toBe(2);
    expect(postBody.draft.purchasePrice).toBe(350000);
    expect(postBody.draft.updatedAt).toBeDefined();

    // Verify GET returns the saved draft
    const getRes = await getDraft();
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.draft.address).toBe('1204 E 7th St');
    expect(getBody.draft.strategy).toBe('flip');
  });

  it('updates an existing draft incrementally', async () => {
    // Step 1 save
    await postDraft(
      new Request('http://localhost/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          address: '405 Nueces St',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
        }),
      }),
    );

    // Step 3 save adds numbers
    await postDraft(
      new Request('http://localhost/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 3,
          purchasePrice: 425000,
          rehabBudget: 50000,
        }),
      }),
    );

    const getRes = await getDraft();
    const getBody = await getRes.json();
    expect(getBody.draft.step).toBe(3);
    expect(getBody.draft.address).toBe('405 Nueces St');
    expect(getBody.draft.city).toBe('Austin');
    expect(getBody.draft.purchasePrice).toBe(425000);
    expect(getBody.draft.rehabBudget).toBe(50000);
  });

  it('deletes draft successfully', async () => {
    await postDraft(
      new Request('http://localhost/api/projects/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 1,
          address: '701 Brazos St',
          strategy: 'brrrr' as const,
          purchasePrice: 500000,
        }),
      }),
    );

    const delRes = await deleteDraft();
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    const getRes = await getDraft();
    const getBody = await getRes.json();
    expect(getBody.draft).toBeNull();
  });
});
