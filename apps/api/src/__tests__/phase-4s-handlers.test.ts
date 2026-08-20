import { describe, expect, it } from '@jest/globals';
import { handleInboxPost } from '../routes/inbox/handler.js';
import {
  handleInboxByIdPatch,
  handleInboxByIdDelete,
} from '../routes/inbox/by-id/handler.js';
import { handleInboxActionsPost } from '../routes/inbox/actions/handler.js';
import { handleInboxBackfillPost } from '../routes/inbox/backfill/handler.js';
import { handleFinancialTransactionsByProjectGet } from '../routes/financial-transactions/by-project/handler.js';
import { handleTransactionIdentifyPost } from '../routes/transactions/identify/handler.js';
import {
  handleTransactionAttributionPatch,
  handleTransactionAttributionSearchPost,
} from '../routes/transactions/attribution/handler.js';
import { handleTransactionIdentificationSuggestionsGet } from '../routes/transactions/identification-suggestions/handler.js';
import { handleInvestorTimelineGet } from '../routes/investor/timeline/handler.js';
import { handleChangelogMetadataGet } from '../routes/changelog/metadata/handler.js';
import { handleClosingTitleSearchPost } from '../routes/closing/title-search/handler.js';
import { handleInvitationsTokenAskPost } from '../routes/invitations/ask/handler.js';

const adminAuth = { uid: 'user-1', email: 'lead@test.com' };
const token = 'valid-token';

describe('Phase 4s route handlers', () => {
  it('POST /api/inbox creates item', async () => {
    const result = await handleInboxPost(
      {
        recipientUid: 'u2',
        organizationId: 'org-1',
        type: 'alert',
        category: 'rent',
        title: 'Alert',
        body: 'Body',
        senderName: 'System',
      },
      token,
      {
        verifyIdToken: async () => adminAuth,
        createInboxItem: async () => undefined,
        generateItemId: () => 'inb_test',
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { itemId: string }).itemId).toBe('inb_test');
  });

  it('inbox by-id patch/delete handlers', async () => {
    const patch = await handleInboxByIdPatch(
      'inb-1',
      { read: true },
      token,
      {
        verifyIdToken: async () => adminAuth,
        getInboxItem: async () => ({ recipientUid: 'user-1' }),
        updateInboxItem: async () => undefined,
      },
    );
    expect(patch.status).toBe(200);

    const del = await handleInboxByIdDelete('inb-1', token, {
      verifyIdToken: async () => adminAuth,
      getInboxItem: async () => ({ recipientUid: 'user-1' }),
      deleteInboxItem: async () => undefined,
    });
    expect(del.status).toBe(200);
  });

  it('inbox actions and backfill handlers', async () => {
    const action = await handleInboxActionsPost(
      'inb-1',
      { action: 'confirm_paid' },
      token,
      {
        verifyIdToken: async () => adminAuth,
        getInboxItem: async () => ({ recipientUid: 'user-1', metadata: { projectId: 'p1' } }),
      },
    );
    expect(action.status).toBe(200);

    const backfill = await handleInboxBackfillPost(token, {
      verifyIdToken: async () => adminAuth,
      getUserProfile: async () => ({ orgRole: 'Admin' }),
      runBackfill: async () => ({ created: 2, skipped: 1, totalInvitations: 3 }),
    });
    expect((backfill.body as { created: number }).created).toBe(2);
  });

  it('financial transactions by project GET', async () => {
    const result = await handleFinancialTransactionsByProjectGet(
      'proj-1',
      { tab: 'REVENUE' },
      {
        requireAuth: async () => adminAuth,
        listTransactions: async () => [{ id: 'tx-1', amount: 100, category: 'RENT_INCOME' }],
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { count: number }).count).toBe(1);
  });

  it('transaction identify/attribution/suggestions handlers', async () => {
    const identify = await handleTransactionIdentifyPost('tx-1', {
      requireAuth: async () => adminAuth,
      identifyTransaction: async () => ({
        transactionId: 'tx-1',
        result: { paperWorkingCategory: 'RENT_INCOME', confidenceScore: 0.9 },
      }),
    });
    expect(identify.status).toBe(200);

    const patch = await handleTransactionAttributionPatch(
      'tx-1',
      { projectId: 'p1' },
      token,
      {
        verifyIdToken: async () => adminAuth,
        getTransaction: async () => ({ userId: 'user-1', projectId: null }),
        updateAttribution: async () => ({ id: 'tx-1', projectId: 'p1' }),
      },
    );
    expect(patch.status).toBe(200);

    const search = await handleTransactionAttributionSearchPost('tx-1', token, {
      verifyIdToken: async () => adminAuth,
      getTransaction: async () => ({ userId: 'user-1', projectId: null }),
      searchAttribution: async () => ({
        projectId: 'p1',
        projectName: 'Deal A',
        matchType: 'merchant',
        confidence: 0.8,
      }),
    });
    expect(search.status).toBe(200);

    const suggestions = await handleTransactionIdentificationSuggestionsGet('proj-1', {
      requireAuth: async () => adminAuth,
      loadSuggestions: async () => [{ financialTransactionId: 'ft-1' }],
    });
    expect(suggestions.status).toBe(200);
  });

  it('investor timeline + changelog + closing + invitation ask', async () => {
    const timeline = await handleInvestorTimelineGet({
      requireAuth: async () => adminAuth,
      loadTimeline: async () => ({
        activities: [{ id: '1', projectId: 'p1', type: 'edit', createdAt: '2026-01-01' }],
        ownedProjectIds: new Set(['p1']),
        viewerEmails: ['lead@test.com'],
        isVendor: false,
      }),
    });
    expect(timeline.status).toBe(200);

    const changelog = await handleChangelogMetadataGet({
      loadEntries: async () => [{ version: '1.0', date: '2026-01-01', title: 'Launch' }],
    });
    expect(changelog.status).toBe(200);

    const title = await handleClosingTitleSearchPost(
      { projectId: 'p1', checks: [{ status: 'Cleared' }] },
      {
        requireAuth: async () => adminAuth,
        verifyProjectAccess: async () => true,
        persistTitleSearch: async () => undefined,
      },
    );
    expect(title.status).toBe(200);

    const ask = await handleInvitationsTokenAskPost(
      'a'.repeat(20),
      { message: 'What is the minimum investment?' },
      { submitAsk: async () => ({ threadId: 'thread-1' }) },
    );
    expect(ask.status).toBe(200);
  });
});
