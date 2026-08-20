import { describe, expect, it } from '@jest/globals';
import {
  validateCreateCommitmentBody,
  validatePatchCommitmentFields,
  filterCommitmentsForViewer,
  userOwnsCommitment,
} from '../lib/commitments/validation.js';
import {
  filterTimelineActivities,
  sortTimelineDescending,
  isVendorAccount,
  isLeadInvestorOrTeammateRole,
} from '../lib/timeline/filter.js';
import { validateDealUpdateBody } from '../lib/deal-updates/validation.js';
import {
  parseProjectTransactionsQuery,
  computeTransactionsNextCursor,
} from '../lib/projects/transactions-query.js';
import {
  mapRecentActivityFromTransactions,
  buildMockKpiTrends,
  aggregateKpiBreakdown,
} from '../lib/projects/kpis.js';
import {
  validateProofOfFundsBody,
  computeCompletedFundCards,
} from '../lib/proof-of-funds/actions.js';

describe('Phase 4q commitments libs', () => {
  it('validateCreateCommitmentBody requires name and amount', () => {
    expect(validateCreateCommitmentBody({}, true).ok).toBe(false);
    expect(
      validateCreateCommitmentBody({ name: 'LP A', amountCents: 50000 }, true).ok,
    ).toBe(true);
  });

  it('non-lead investors are forced to pledged status', () => {
    const result = validateCreateCommitmentBody(
      { name: 'LP A', amountCents: 50000, status: 'cleared' },
      false,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.status).toBe('pledged');
  });

  it('validatePatchCommitmentFields blocks privileged self-clear', () => {
    const result = validatePatchCommitmentFields(
      { status: 'cleared' },
      false,
      { status: 'pledged' },
    );
    expect(result.ok).toBe(false);
  });

  it('filterCommitmentsForViewer hides other investors for LPs', () => {
    const filtered = filterCommitmentsForViewer(
      [
        { email: 'a@test.com', createdByUid: 'u1' },
        { email: 'b@test.com', createdByUid: 'u2' },
      ],
      false,
      ['a@test.com'],
      'u1',
    );
    expect(filtered).toHaveLength(1);
  });

  it('userOwnsCommitment matches email or uid', () => {
    expect(userOwnsCommitment({ email: 'a@test.com' }, ['a@test.com'], 'u1')).toBe(true);
  });
});

describe('Phase 4q timeline and deal update libs', () => {
  it('filterTimelineActivities hides private events from invitees', () => {
    const filtered = filterTimelineActivities(
      [
        { id: '1', type: 'indication', metadata: { inviteeEmail: 'other@test.com' }, createdAt: '2026-01-01' },
        { id: '2', type: 'edit', createdAt: '2026-01-02' },
      ],
      'viewer-1',
      ['viewer@test.com'],
      false,
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].type).toBe('edit');
  });

  it('sortTimelineDescending orders newest first', () => {
    const sorted = sortTimelineDescending([
      { id: '1', type: 'edit', createdAt: '2026-01-01' },
      { id: '2', type: 'edit', createdAt: '2026-02-01' },
    ]);
    expect(sorted[0].id).toBe('2');
  });

  it('isVendorAccount detects vendor accounts', () => {
    expect(isVendorAccount({ accountType: 'vendor' })).toBe(true);
    expect(isLeadInvestorOrTeammateRole('GP')).toBe(true);
  });

  it('validateDealUpdateBody enforces body length', () => {
    expect(validateDealUpdateBody({ body: 'hello' }).ok).toBe(true);
    expect(validateDealUpdateBody({ body: 'x'.repeat(4001) }).ok).toBe(false);
  });
});

describe('Phase 4q transactions and kpis libs', () => {
  it('parseProjectTransactionsQuery clamps limit', () => {
    expect(parseProjectTransactionsQuery({ limit: '999' }).limit).toBe(200);
  });

  it('computeTransactionsNextCursor returns last date when full page', () => {
    expect(computeTransactionsNextCursor(['2026-01-03', '2026-01-02'], 2)).toBe('2026-01-02');
  });

  it('mapRecentActivityFromTransactions labels income vs expense', () => {
    const items = mapRecentActivityFromTransactions([
      {
        id: '1',
        payee: 'Tenant',
        category: 'RENT_INCOME',
        amount: 1000,
        transactionDate: '2026-01-01',
      },
    ]);
    expect(items[0].impactNote).toContain('Rent Income');
  });

  it('buildMockKpiTrends returns 6 months', () => {
    expect(buildMockKpiTrends()).toHaveLength(6);
  });

  it('aggregateKpiBreakdown sums by category', () => {
    const breakdown = aggregateKpiBreakdown(
      [
        { category: 'RENT_INCOME', amount: 100 },
        { category: 'RENT_INCOME', amount: 50 },
      ],
      'classification',
    );
    expect(breakdown.RENT_INCOME).toBe(150);
  });
});

describe('Phase 4q proof-of-funds libs', () => {
  it('validateProofOfFundsBody requires sourceId except plaid_sync', () => {
    expect(validateProofOfFundsBody({ action: 'request' }).ok).toBe(false);
    expect(validateProofOfFundsBody({ action: 'plaid_sync' }).ok).toBe(true);
  });

  it('computeCompletedFundCards toggles F1.4 card', () => {
    expect(
      computeCompletedFundCards([{ status: 'verified' }], []).includes('F1.4'),
    ).toBe(true);
    expect(computeCompletedFundCards([{ status: 'received' }], ['F1.4'])).toEqual([]);
  });
});
