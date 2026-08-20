import { describe, expect, it } from '@jest/globals';
import {
  handleInvitationsIndicationDelete,
  handleInvitationsIndicationPost,
} from '../routes/invitations/indication/handler.js';
import { handleInvitationsSubscribePost } from '../routes/invitations/subscribe/handler.js';
import { handleInvitationsUpdatesGet } from '../routes/invitations/updates/handler.js';
import { handleInvitationsSubscriptionPost } from '../routes/invitations/subscription/handler.js';
import { handleInvitationsSendPost } from '../routes/invitations/send/handler.js';

const token = 'a'.repeat(24);
const auth = { uid: 'lead-1', email: 'lead@test.com' };

describe('Phase 4t invitation handlers', () => {
  it('POST/DELETE indication handlers', async () => {
    const post = await handleInvitationsIndicationPost(
      token,
      { type: 'percentage', value: 15 },
      {
        resolveInvitation: async () => ({
          expiresAt: new Date(Date.now() + 86400000),
          projectId: 'p1',
        }),
        updateIndication: async () => undefined,
      },
    );
    expect(post.status).toBe(200);

    const del = await handleInvitationsIndicationDelete(token, {
      resolveInvitation: async () => ({
        expiresAt: new Date(Date.now() + 86400000),
        projectId: 'p1',
      }),
      updateIndication: async () => undefined,
    });
    expect(del.status).toBe(200);
  });

  it('subscribe and updates handlers', async () => {
    const subscribe = await handleInvitationsSubscribePost(
      token,
      { email: 'inv@test.com', name: 'Investor' },
      {
        resolveInvitation: async () => ({ projectId: 'p1', email: 'inv@test.com' }),
        subscribeInvestor: async () => undefined,
      },
    );
    expect(subscribe.status).toBe(200);

    const updates = await handleInvitationsUpdatesGet(token, {
      resolveInvitation: async () => ({ projectId: 'p1' }),
      loadDealUpdates: async () => [
        {
          id: 'u1',
          data: { title: 'T', body: 'B', authorName: 'Lead', createdAt: '2026-01-01T00:00:00.000Z' },
        },
      ],
    });
    expect(updates.status).toBe(200);
    expect((updates.body as { updates: unknown[] }).updates).toHaveLength(1);
  });

  it('subscription and send handlers', async () => {
    const subscription = await handleInvitationsSubscriptionPost(
      token,
      { action: 'esign' },
      {
        resolveInvitation: async () => ({
          projectId: 'p1',
          email: 'inv@test.com',
          expiresAt: new Date(Date.now() + 86400000),
        }),
        findCommitment: async () => ({
          id: 'c1',
          status: 'pending',
          email: 'inv@test.com',
        }),
        signCommitment: async () => undefined,
      },
    );
    expect(subscription.status).toBe(200);

    const send = await handleInvitationsSendPost(
      {
        projectId: 'p1',
        email: 'new@test.com',
        name: 'New',
        proposedEquityPercent: 5,
      },
      {
        requireAuth: async () => auth,
        loadProject: async () => ({
          propertyName: 'Deal',
          organizationId: 'org-1',
          members: { 'lead-1': { role: 'Lead Investor' } },
        }),
        persistInvitation: async (record) => ({ invitationId: String(record.id) }),
        appUrl: 'https://app.test',
      },
    );
    expect(send.status).toBe(200);
    expect((send.body as { inviteUrl: string }).inviteUrl).toContain('/invest/');
  });
});
