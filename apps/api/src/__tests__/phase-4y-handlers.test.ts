import { describe, expect, it } from '@jest/globals';
import { handleBridgeSearchGet } from '../routes/bridge/search/handler.js';
import { handleBridgeAgentsGet } from '../routes/bridge/agents/handler.js';
import { handleBridgeSyncGet, handleBridgeSyncPost } from '../routes/bridge/sync/handler.js';
import { handleBridgeWebhookPost } from '../routes/webhooks/bridge/handler.js';
import { handleWorkerDrainGet, handleWorkerDrainPost } from '../routes/worker/drain/handler.js';
import { handleProjectsRehabPost } from '../routes/projects/rehab/handler.js';
import { handleProjectsTodosPost } from '../routes/projects/todos/handler.js';
import {
  handleProjectsLenderPackageGet,
  handleProjectsLenderPackagePost,
} from '../routes/projects/lender-package/handler.js';
import {
  handleProjectsLoansGet,
  handleProjectsLoansPost,
} from '../routes/projects/loans/handler.js';
import { handleProjectsLoanEstimateChoosePost } from '../routes/projects/loan-estimates/choose/handler.js';
import { createHmac } from 'node:crypto';

const auth = { uid: 'user-1', email: 'user@test.com' };

describe('Phase 4y handlers', () => {
  it('bridge search and agents handlers', async () => {
    const search = await handleBridgeSearchGet(
      { q: '123 Main' },
      {
        requireAuth: async () => auth,
        searchProperties: async () => [
          { ListingKey: '1', UnparsedAddress: '123 Main St', ListPrice: 250000 },
        ],
      },
    );
    expect(search.status).toBe(200);

    const agents = await handleBridgeAgentsGet(
      { key: 'member-1' },
      {
        requireAuth: async () => auth,
        getAgent: async () => ({ MemberKey: 'member-1', MemberFullName: 'Agent One' }),
      },
    );
    expect(agents.status).toBe(200);
  });

  it('bridge sync and webhook handlers', async () => {
    const status = await handleBridgeSyncGet({
      requireAuth: async () => auth,
      loadSyncState: async () => ({
        lastWatermark: '2026-01-01',
        updatedAt: '2026-01-02',
      }),
      getQueueDepth: async () => 3,
    });
    expect(status.status).toBe(200);

    const enqueue = await handleBridgeSyncPost({
      requireAuth: async () => auth,
      checkAdmin: async () => true,
      enqueueSync: async () => 'job-1',
    });
    expect(enqueue.status).toBe(202);

    const rawBody = JSON.stringify({ listingKey: 'L1', status: 'Closed' });
    const signature = createHmac('sha256', 'secret').update(rawBody).digest('hex');
    const webhook = await handleBridgeWebhookPost(
      rawBody,
      { bridgeSignature: signature },
      {
        webhookSecret: 'secret',
        enqueueWebhook: async () => 'job-2',
      },
    );
    expect(webhook.status).toBe(200);
  });

  it('worker drain handlers', async () => {
    const monitor = await handleWorkerDrainGet(
      { authorization: 'Bearer worker-secret' },
      {
        workerSecret: 'worker-secret',
        getQueueDepths: async () => ({
          bridge_sync: 1,
          member_sync: 0,
          office_sync: 0,
          webhook_process: 2,
        }),
        peekDlq: async () => [],
      },
    );
    expect(monitor.status).toBe(200);

    const drain = await handleWorkerDrainPost(
      { batch: '5' },
      { authorization: 'Bearer worker-secret' },
      {
        workerSecret: 'worker-secret',
        drainQueues: async () => ({ bridge_sync: 1 }),
        getQueueDepths: async () => ({
          bridge_sync: 0,
          member_sync: 0,
          office_sync: 0,
          webhook_process: 0,
        }),
      },
    );
    expect(drain.status).toBe(200);
  });

  it('projects rehab, todos, lender package, loans handlers', async () => {
    const rehab = await handleProjectsRehabPost(
      { idToken: 'tok', projectId: 'p1', updates: { budget: 10000 } },
      {
        verifyIdToken: async () => ({ uid: auth.uid }),
        loadContext: async () => ({
          exists: true,
          organizationId: 'org-1',
          profile: { organizationId: 'org-1' },
          currentRehab: {},
        }),
        saveRehab: async () => undefined,
      },
    );
    expect(rehab.status).toBe(200);

    const todos = await handleProjectsTodosPost(
      { idToken: 'tok', projectId: 'p1', todos: [{ id: 't1', completed: false }] },
      {
        verifyIdToken: async () => ({ uid: auth.uid, email: auth.email }),
        loadContext: async () => ({
          exists: true,
          organizationId: 'org-1',
          actionItems: [{ id: 't1', completed: false }],
          profile: { organizationId: 'org-1', subscriptionPlan: 'Team', subscriptionStatus: 'active', email: auth.email },
        }),
        saveTodos: async () => undefined,
      },
    );
    expect(todos.status).toBe(200);

    const lenderList = await handleProjectsLenderPackageGet('p1', {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
      listItems: async () => [{ id: 'item-1', name: 'Tax Returns' }],
    });
    expect(lenderList.status).toBe(200);

    const lenderCreate = await handleProjectsLenderPackagePost(
      'p1',
      { name: 'Custom Doc' },
      {
        requireAuth: async () => auth,
        verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
        createItem: async (_projectId, item) => item,
      },
    );
    expect(lenderCreate.status).toBe(201);

    const loansList = await handleProjectsLoansGet('p1', {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
      listLoans: async () => [{ id: 'loan-1', instrument: 'Conventional' }],
    });
    expect(loansList.status).toBe(200);

    const loansCreate = await handleProjectsLoansPost(
      'p1',
      { instrument: 'Bridge' },
      {
        requireAuth: async () => auth,
        verifyAccess: async () => ({
          authorized: true,
          role: 'Lead Investor',
          project: { fundingPlan: { modality: [] } },
        }),
        replaceLoans: async ({ loans }) => loans,
      },
    );
    expect(loansCreate.status).toBe(201);

    const choose = await handleProjectsLoanEstimateChoosePost('p1', 'est-1', {
      requireAuth: async () => auth,
      verifyAccess: async () => ({ authorized: true, role: 'Lead Investor', project: {} }),
      loadEstimate: async () => ({ lenderName: 'Chase', amountCents: 100000 }),
      chooseEstimate: async () => undefined,
    });
    expect(choose.status).toBe(200);
  });
});
