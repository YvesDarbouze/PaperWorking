import { describe, expect, it } from '@jest/globals';
import { handleFinancialTransactionsListGet } from '../routes/financial-transactions/list/handler.js';
import { handleFinancialTransactionClassifyPost } from '../routes/financial-transactions/classify/handler.js';
import { handlePlaidConnectionsGet } from '../routes/plaid/connections/handler.js';
import { handlePlaidConnectionDisconnectPost } from '../routes/plaid/connections/disconnect/handler.js';
import { handleInvitationsBroadcastPost } from '../routes/invitations/broadcast/handler.js';
import { handleInvitationsTokenGet } from '../routes/invitations/token/handler.js';
import { handleInvitesPost, handleInvitesGet } from '../routes/invites/handler.js';
import { handleProjectsCreatePost } from '../routes/projects/create/handler.js';

const adminAuth = { uid: 'user-1' };
const authFailure = { status: 401, body: { error: 'Unauthorized' } };

describe('Phase 4m route handlers', () => {
  it('GET financial-transactions lists and filters', async () => {
    const result = await handleFinancialTransactionsListGet(
      'proj-1',
      { tab: 'REVENUE' },
      {
        requireAuth: async () => adminAuth,
        listTransactions: async () => [
          {
            id: 't1',
            projectId: 'proj-1',
            source: 'PLAID',
            plaidTransactionId: null,
            amount: 100,
            direction: 'INFLOW',
            transactionDate: new Date(),
            payee: 'Tenant',
            description: 'Rent',
            category: 'RENT_INCOME',
            subCategory: null,
            matchedLeaseId: null,
            status: 'PENDING_REVIEW',
            confidenceScore: 0.9,
            isRecurring: true,
            isSplit: false,
            notes: null,
          },
          {
            id: 't2',
            projectId: 'proj-1',
            source: 'PLAID',
            plaidTransactionId: null,
            amount: 50,
            direction: 'OUTFLOW',
            transactionDate: new Date(),
            payee: 'Vendor',
            description: 'Repair',
            category: 'MAINTENANCE_REPAIR',
            subCategory: null,
            matchedLeaseId: null,
            status: 'PENDING_REVIEW',
            confidenceScore: 0.5,
            isRecurring: false,
            isSplit: false,
            notes: null,
          },
        ],
      },
    );

    expect(result.status).toBe(200);
    const body = result.body as { count: number };
    expect(body.count).toBe(1);
  });

  it('POST financial-transactions classify validates splits', async () => {
    const badSplit = await handleFinancialTransactionClassifyPost(
      't1',
      { isSplit: true, splits: [{ amount: 10, category: 'MISC', reason: 'x' }] },
      {
        requireAuth: async () => adminAuth,
        getTransaction: async () => ({
          id: 't1',
          projectId: 'proj-1',
          payee: 'Vendor',
          amount: 100,
          category: null,
          matchedLeaseId: null,
          notes: null,
        }),
      },
    );
    expect(badSplit.status).toBe(400);

    const ok = await handleFinancialTransactionClassifyPost(
      't1',
      { category: 'RENT_INCOME' },
      {
        requireAuth: async () => adminAuth,
        getTransaction: async () => ({
          id: 't1',
          projectId: 'proj-1',
          payee: 'Tenant',
          amount: 100,
          category: 'RENT_INCOME',
          matchedLeaseId: null,
          notes: null,
        }),
        classifyTransaction: async () => ({
          id: 't1',
          projectId: 'proj-1',
          payee: 'Tenant',
          amount: 100,
          category: 'RENT_INCOME',
          matchedLeaseId: null,
          notes: null,
        }),
      },
    );
    expect(ok.status).toBe(200);
  });

  it('GET plaid/connections returns safe records', async () => {
    const result = await handlePlaidConnectionsGet(
      { model: 'v2', projectId: 'proj-1' },
      {
        requireAuth: async () => adminAuth,
        listConnections: async () => ({
          connections: [{ id: 'conn-1', status: 'ACTIVE' }],
        }),
      },
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      success: true,
      connections: [{ id: 'conn-1', status: 'ACTIVE' }],
      model: 'v2',
    });
  });

  it('POST plaid disconnect enforces ownership', async () => {
    const forbidden = await handlePlaidConnectionDisconnectPost('conn-1', {
      requireAuth: async () => adminAuth,
      getConnection: async () => ({
        id: 'conn-1',
        userId: 'other-user',
        status: 'ACTIVE',
      }),
    });
    expect(forbidden.status).toBe(403);

    const ok = await handlePlaidConnectionDisconnectPost('conn-1', {
      requireAuth: async () => adminAuth,
      getConnection: async () => ({
        id: 'conn-1',
        userId: 'user-1',
        status: 'ACTIVE',
      }),
      disconnectConnection: async () => {},
    });
    expect(ok.status).toBe(200);
  });

  it('POST invitations/broadcast validates required fields', async () => {
    const missing = await handleInvitationsBroadcastPost({}, {
      requireAuth: async () => adminAuth,
    });
    expect(missing.status).toBe(400);

    const ok = await handleInvitationsBroadcastPost(
      {
        projectId: 'proj-1',
        subject: 'Invest',
        bodyTemplate: 'Hello {{PROPERTY_ADDRESS}}',
      },
      {
        requireAuth: async () => adminAuth,
        authorizeBroadcast: async () => ({ ok: true }),
        runBroadcast: async () => ({
          emailSentCount: 2,
          inAppSentCount: 1,
          totalCount: 3,
        }),
      },
    );
    expect(ok.status).toBe(200);
    expect(resultBody(ok).totalCount).toBe(3);
  });

  it('GET invitations/[token] returns guest portal payload', async () => {
    const result = await handleInvitationsTokenGet('a'.repeat(20), {}, {
      loadGuestPortal: async () => ({
        invitation: {
          name: 'Investor',
          email: 'inv@example.com',
          projectId: 'proj-1',
          status: 'pending',
          expiresAt: new Date('2026-12-31'),
        },
        project: { propertyName: 'Deal', financials: {} },
        raiseTarget: 100000,
        raiseProgress: { raiseRaised: 0, raisePercentage: 0 },
        daysLeft: 30,
        hoursLeft: 0,
        metricHistory: { noiHistory: [], capRateHistory: [], cashFlowHistory: [] },
        commitmentStatus: 'pending',
        commitmentId: null,
        inquiries: [],
      }),
    });

    expect(result.status).toBe(200);
    expect(resultBody(result).investorEmail).toBe('inv@example.com');
  });

  it('POST /api/invites creates invite for investment team', async () => {
    const result = await handleInvitesPost(
      { email: 'new@example.com', role: 'team_member' },
      {
        requireAuth: async () => adminAuth,
        getInviterAccountType: async () => 'investment_team',
        saveInvite: async () => 'invite-1',
        generateInviteId: () => 'invite-1',
      },
    );

    expect(result.status).toBe(201);
    expect(resultBody(result).inviteId).toBe('invite-1');
  });

  it('GET /api/invites lists caller invites', async () => {
    const result = await handleInvitesGet({
      requireAuth: async () => adminAuth,
      listInvites: async () => [{ id: 'invite-1', status: 'pending' }],
    });
    expect(result.status).toBe(200);
    expect(resultBody(result).invites).toHaveLength(1);
  });

  it('POST /api/projects/create validates and creates project', async () => {
    const denied = await handleProjectsCreatePost(
      { property_address: '123 Main' },
      {
        requireAuth: async () => adminAuth,
        getUser: async () => ({ role: 'vendor', account_type: 'vendor' }),
      },
    );
    expect(denied.status).toBe(403);

    const ok = await handleProjectsCreatePost(
      { property_address: '123 Main St', phase: 'acquisition' },
      {
        requireAuth: async () => adminAuth,
        getUser: async () => ({ organizationId: 'org-1', account_type: 'standard' }),
        countOrgProjects: async () => 1,
        createProject: async ({ payload }) => ({
          projectId: 'proj-new',
          project: { property_address: payload.property_address },
        }),
      },
    );
    expect(ok.status).toBe(201);
    expect(resultBody(ok).projectId).toBe('proj-new');
  });

  it('requires auth when configured', async () => {
    const result = await handleInvitesGet({
      requireAuth: async () => authFailure,
    });
    expect(result.status).toBe(401);
  });
});

function resultBody(result: { body: unknown }): Record<string, unknown> {
  return result.body as Record<string, unknown>;
}
