import { describe, expect, it } from '@jest/globals';
import { handleProjectTimelineGet } from '../routes/projects/timeline/handler.js';
import {
  handleProjectCommitmentsGet,
  handleProjectCommitmentsPost,
} from '../routes/projects/commitments/handler.js';
import {
  handleProjectCommitmentPatch,
  handleProjectCommitmentDelete,
} from '../routes/projects/commitments/by-id/handler.js';
import { handleProjectKpisCurrentGet } from '../routes/projects/kpis/current/handler.js';
import { handleProjectKpisBreakdownGet } from '../routes/projects/kpis/breakdown/handler.js';
import { handleProjectKpisImpactPreviewGet } from '../routes/projects/kpis/impact-preview/handler.js';
import { handleProjectKpisRecalculatePost } from '../routes/projects/kpis/recalculate/handler.js';
import {
  handleProjectDealUpdatesGet,
  handleProjectDealUpdatesPost,
} from '../routes/projects/deal-updates/handler.js';
import { handleProjectTransactionsGet } from '../routes/projects/transactions/handler.js';
import { handleProjectProofOfFundsPost } from '../routes/projects/proof-of-funds/handler.js';

const adminAuth = { uid: 'user-1', email: 'lead@test.com' };

describe('Phase 4q project sub-route handlers', () => {
  it('GET /api/projects/[id]/timeline returns filtered timeline', async () => {
    const result = await handleProjectTimelineGet('proj-1', {
      requireAuth: async () => adminAuth,
      loadTimeline: async () => ({
        ok: true,
        activities: [
          { id: '1', type: 'edit', createdAt: '2026-01-02' },
          { id: '2', type: 'indication', metadata: {}, createdAt: '2026-01-01' },
        ],
        isLeadInvestorOrTeammate: true,
        viewerEmails: ['lead@test.com'],
      }),
    });
    expect(result.status).toBe(200);
    expect((result.body as { timeline: unknown[] }).timeline).toHaveLength(2);
  });

  it('commitments GET/POST handlers', async () => {
    const list = await handleProjectCommitmentsGet('proj-1', {
      requireAuth: async () => adminAuth,
      verifyAccess: async () => ({ role: 'Lead Investor' }),
      listCommitments: async () => [{ id: 'c1', email: 'lp@test.com' }],
    });
    expect(list.status).toBe(200);

    const create = await handleProjectCommitmentsPost(
      'proj-1',
      { name: 'Investor A', amountCents: 100000 },
      {
        requireAuth: async () => adminAuth,
        verifyAccess: async () => ({ role: 'Lead Investor' }),
        createCommitment: async (input) => ({ id: 'c-new', ...input.body }),
      },
    );
    expect(create.status).toBe(201);
  });

  it('commitments PATCH/DELETE handlers', async () => {
    const patch = await handleProjectCommitmentPatch(
      'proj-1',
      'c1',
      { status: 'signed' },
      {
        requireAuth: async () => adminAuth,
        verifyAccess: async () => ({ role: 'Lead Investor' }),
        getCommitment: async () => ({ status: 'pledged' }),
        updateCommitment: async () => undefined,
      },
    );
    expect(patch.status).toBe(200);

    const del = await handleProjectCommitmentDelete('proj-1', 'c1', {
      requireAuth: async () => adminAuth,
      verifyAccess: async () => ({ role: 'Lead Investor' }),
      getCommitment: async () => ({ id: 'c1' }),
      deleteCommitment: async () => undefined,
    });
    expect(del.status).toBe(200);
  });

  it('KPI handlers current/breakdown/impact/recalculate', async () => {
    const current = await handleProjectKpisCurrentGet('proj-1', {
      requireAuth: async () => adminAuth,
      recalculateKpis: async () => ({ cashOnCash: 8.1 }),
      loadRecentTransactions: async () => [],
    });
    expect(current.status).toBe(200);

    const breakdown = await handleProjectKpisBreakdownGet(
      'proj-1',
      { groupBy: 'classification' },
      {
        requireAuth: async () => adminAuth,
        loadTransactions: async () => [{ category: 'RENT_INCOME', amount: 100 }],
      },
    );
    expect(breakdown.status).toBe(200);

    const preview = await handleProjectKpisImpactPreviewGet(
      'proj-1',
      { transactionId: 'tx-1' },
      {
        requireAuth: async () => adminAuth,
        getImpactPreview: async () => ({ delta: { noi: 100 } }),
      },
    );
    expect(preview.status).toBe(200);

    const recalc = await handleProjectKpisRecalculatePost('proj-1', {
      requireAuth: async () => adminAuth,
      recalculateKpis: async () => ({ cashOnCash: 8.2 }),
    });
    expect(recalc.status).toBe(200);
  });

  it('dealUpdates GET/POST handlers', async () => {
    const list = await handleProjectDealUpdatesGet('proj-1', {
      requireAuth: async () => adminAuth,
      verifyMembership: async () => ({ organizationId: 'org-1' }),
      listUpdates: async () => [{ id: 'u1', body: 'Progress update' }],
    });
    expect(list.status).toBe(200);

    const create = await handleProjectDealUpdatesPost(
      'proj-1',
      { body: 'Closed on property' },
      {
        requireAuth: async () => adminAuth,
        verifyMembership: async () => ({ organizationId: 'org-1' }),
        createUpdate: async (input) => ({ id: 'u-new', ...input }),
      },
    );
    expect(create.status).toBe(201);
  });

  it('GET /api/projects/[id]/transactions paginates results', async () => {
    const result = await handleProjectTransactionsGet(
      'proj-1',
      { limit: '2' },
      {
        requireAuth: async () => adminAuth,
        verifyOrgAccess: async () => ({ ok: true }),
        loadTransactions: async () => [
          { id: '1', plaidId: null, amount: 100, date: '2026-01-02', merchantName: null, reiCategory: null, confidence: null, pending: false, reviewedByUser: true, attributedAt: null, category: null },
          { id: '2', plaidId: null, amount: 50, date: '2026-01-01', merchantName: null, reiCategory: null, confidence: null, pending: false, reviewedByUser: true, attributedAt: null, category: null },
        ],
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { nextCursor: string }).nextCursor).toBe('2026-01-01');
  });

  it('POST /api/projects/[id]/proof-of-funds validates and executes', async () => {
    const blocked = await handleProjectProofOfFundsPost(
      'proj-1',
      { action: 'verify', sourceId: 'src-1' },
      {
        requireAuth: async () => ({ uid: 'lp-1', email: 'lp@test.com' }),
        checkProjectAccess: async () => ({ ok: true, isLead: false, userName: 'LP' }),
      },
    );
    expect(blocked.status).toBe(403);

    const ok = await handleProjectProofOfFundsPost(
      'proj-1',
      { action: 'upload', sourceId: 'src-1', documentUrl: 'https://files/pof.pdf' },
      {
        requireAuth: async () => adminAuth,
        checkProjectAccess: async () => ({ ok: true, isLead: true, userName: 'Lead' }),
        executeAction: async () => ({
          proofOfFunds: [{ id: 'src-1', status: 'received' }],
          completedFundCards: [],
        }),
      },
    );
    expect(ok.status).toBe(200);
  });
});
