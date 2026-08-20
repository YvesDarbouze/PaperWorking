import { describe, expect, it } from '@jest/globals';
import {
  projectPatchBodySchema,
  detectMaterialProjectChanges,
  mergeProjectFinancials,
  buildProjectPatchPayload,
} from '../lib/projects/patch-schema.js';
import { validateBulkClassifyBody } from '../lib/financial-transactions/bulk-classify.js';
import {
  parsePlaidExchangeBody,
  resolvePlaidConnectionPurpose,
} from '../lib/plaid/exchange.js';
import { validateCreateRuleBody, buildRuleUpdatePatch } from '../lib/rules/validation.js';
import {
  validateStartReconciliationBody,
  parseReconciliationListQuery,
} from '../lib/reconciliations/validation.js';

describe('project patch libs', () => {
  it('projectPatchBodySchema rejects read-only annualDebtService', () => {
    const result = projectPatchBodySchema.safeParse({
      financials: { annualDebtService: 1000 },
    });
    expect(result.success).toBe(false);
  });

  it('mergeProjectFinancials deep merges', () => {
    expect(
      mergeProjectFinancials({ purchasePrice: 100 }, { estimatedARV: 200 }),
    ).toEqual({ purchasePrice: 100, estimatedARV: 200 });
  });

  it('detectMaterialProjectChanges finds purchase price change', () => {
    const result = detectMaterialProjectChanges({
      projectData: { financials: { purchasePrice: 100000 } },
      financials: { purchasePrice: 150000 },
      topLevelUpdates: {},
    });
    expect(result.hasMaterialChanges).toBe(true);
    expect(result.changedFields[0]).toContain('Purchase Price');
  });

  it('buildProjectPatchPayload merges financials', () => {
    const payload = buildProjectPatchPayload(
      { status: 'fund' },
      { purchasePrice: 200 },
      { purchasePrice: 100 },
    );
    expect(payload.status).toBe('fund');
    expect((payload.financials as { purchasePrice: number }).purchasePrice).toBe(200);
  });
});

describe('financial bulk classify libs', () => {
  it('validateBulkClassifyBody requires ids and category', () => {
    expect(validateBulkClassifyBody({}).ok).toBe(false);
    expect(
      validateBulkClassifyBody({ ids: ['t1'], category: 'RENT_INCOME' }).ok,
    ).toBe(true);
  });
});

describe('plaid exchange libs', () => {
  it('resolvePlaidConnectionPurpose defaults to OPERATING_EXPENSES', () => {
    expect(resolvePlaidConnectionPurpose('invalid')).toBe('OPERATING_EXPENSES');
    expect(resolvePlaidConnectionPurpose('RENT_COLLECTION')).toBe('RENT_COLLECTION');
  });

  it('parsePlaidExchangeBody accepts snake_case aliases', () => {
    const parsed = parsePlaidExchangeBody({
      public_token: 'public-sandbox-token',
      project_id: 'proj-1',
      connection_purpose: 'MORTGAGE_LIABILITY',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.publicToken).toBe('public-sandbox-token');
      expect(parsed.value.connectionPurpose).toBe('MORTGAGE_LIABILITY');
    }
  });
});

describe('rules validation libs', () => {
  it('validateCreateRuleBody requires core fields', () => {
    expect(validateCreateRuleBody({}).ok).toBe(false);
    const ok = validateCreateRuleBody({
      projectId: 'p1',
      name: 'Rule',
      conditions: [],
      action: {},
    });
    expect(ok.ok).toBe(true);
  });

  it('buildRuleUpdatePatch coerces types', () => {
    expect(buildRuleUpdatePatch({ name: 'Updated', isActive: false, priority: 50 })).toEqual({
      name: 'Updated',
      conditions: undefined,
      action: undefined,
      isActive: false,
      priority: 50,
    });
  });
});

describe('reconciliation validation libs', () => {
  it('validateStartReconciliationBody parses numbers', () => {
    const ok = validateStartReconciliationBody({
      projectId: 'p1',
      month: '3',
      year: '2026',
      bankStatementBalance: '1000.50',
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.month).toBe(3);
      expect(ok.value.bankStatementBalance).toBe(1000.5);
    }
  });

  it('parseReconciliationListQuery requires projectId', () => {
    expect(parseReconciliationListQuery({}).ok).toBe(false);
    expect(parseReconciliationListQuery({ projectId: 'p1', month: '1' }).ok).toBe(true);
  });
});
