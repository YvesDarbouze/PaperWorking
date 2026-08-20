import { describe, expect, it } from '@jest/globals';
import { handleProjectPatch } from '../routes/projects/patch/handler.js';
import { handleFinancialTransactionApprovePost } from '../routes/financial-transactions/approve/handler.js';
import { handleFinancialTransactionsBulkClassifyPost } from '../routes/financial-transactions/bulk-classify/handler.js';
import { handlePlaidExchangePost } from '../routes/plaid/exchange/handler.js';
import { handleRulesPost } from '../routes/rules/handler.js';
import { handleRulesPut, handleRulesDelete } from '../routes/rules/by-id/handler.js';
import { handleRulesProjectGet } from '../routes/rules/project/handler.js';
import { handleReconciliationsPost, handleReconciliationsGet } from '../routes/reconciliations/handler.js';

const adminAuth = { uid: 'user-1' };

describe('Phase 4n route handlers', () => {
  it('PATCH /api/projects/[id] validates and patches', async () => {
    const bad = await handleProjectPatch('proj-1', {
      financials: { annualDebtService: 1 },
    }, { requireAuth: async () => adminAuth });
    expect(bad.status).toBe(400);

    const ok = await handleProjectPatch(
      'proj-1',
      { financials: { purchasePrice: 200000 } },
      {
        requireAuth: async () => adminAuth,
        patchProject: async () => ({
          ok: true,
          project: { id: 'proj-1', financials: { purchasePrice: 200000 } },
        }),
      },
    );
    expect(ok.status).toBe(200);
  });

  it('POST financial-transactions approve', async () => {
    const result = await handleFinancialTransactionApprovePost('t1', {
      requireAuth: async () => adminAuth,
      approveTransaction: async () => ({
        id: 't1',
        projectId: 'proj-1',
        status: 'MANUALLY_APPROVED',
      }),
    });
    expect(result.status).toBe(200);
  });

  it('POST financial-transactions bulk-classify', async () => {
    const result = await handleFinancialTransactionsBulkClassifyPost(
      { ids: ['t1', 't2'], category: 'RENT_INCOME' },
      {
        requireAuth: async () => adminAuth,
        bulkClassify: async () => ({ updatedCount: 2, projectId: 'proj-1' }),
      },
    );
    expect(result.status).toBe(200);
    expect((result.body as { updatedCount: number }).updatedCount).toBe(2);
  });

  it('POST plaid/exchange parses token exchange', async () => {
    const missing = await handlePlaidExchangePost({}, {
      requireAuth: async () => adminAuth,
    });
    expect(missing.status).toBe(400);

    const ok = await handlePlaidExchangePost(
      { publicToken: 'public-sandbox', projectId: 'proj-1' },
      {
        requireAuth: async () => adminAuth,
        exchangePublicToken: async () => ({
          itemId: 'item-1',
          plaidConnectionId: 'conn-1',
          connectionPurpose: 'OPERATING_EXPENSES',
          institutionName: 'Chase',
          accountMask: '1234',
        }),
      },
    );
    expect(ok.status).toBe(200);
    expect((ok.body as { itemId: string }).itemId).toBe('item-1');
  });

  it('rules CRUD handlers', async () => {
    const created = await handleRulesPost(
      {
        projectId: 'proj-1',
        name: 'Auto rent',
        conditions: [],
        action: { category: 'RENT_INCOME' },
      },
      {
        requireAuth: async () => adminAuth,
        createRule: async () => ({ rule: { id: 'rule-1' }, applyResults: { matched: 3 } }),
      },
    );
    expect(created.status).toBe(200);

    const listed = await handleRulesProjectGet('proj-1', {
      requireAuth: async () => adminAuth,
      listRules: async () => [{ id: 'rule-1', name: 'Auto rent' }],
    });
    expect(listed.status).toBe(200);

    const updated = await handleRulesPut(
      'rule-1',
      { name: 'Updated' },
      {
        requireAuth: async () => adminAuth,
        updateRule: async (_id, patch) => ({ rule: { id: 'rule-1', ...patch } }),
      },
    );
    expect(updated.status).toBe(200);

    const deleted = await handleRulesDelete('rule-1', {
      requireAuth: async () => adminAuth,
      deactivateRule: async () => {},
    });
    expect(deleted.status).toBe(200);
  });

  it('reconciliations POST and GET', async () => {
    const started = await handleReconciliationsPost(
      { projectId: 'proj-1', month: 1, year: 2026 },
      {
        requireAuth: async () => adminAuth,
        startReconciliation: async (input) => ({ id: 'period-1', ...input }),
      },
    );
    expect(started.status).toBe(200);

    const listed = await handleReconciliationsGet(
      { projectId: 'proj-1', year: '2026' },
      {
        requireAuth: async () => adminAuth,
        listPeriods: async () => [{ id: 'period-1', month: 1, year: 2026 }],
      },
    );
    expect(listed.status).toBe(200);
    expect((listed.body as { periods: unknown[] }).periods).toHaveLength(1);
  });
});
