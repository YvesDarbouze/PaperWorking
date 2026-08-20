import { describe, expect, it } from '@jest/globals';
import {
  validateCreateInboxItemBody,
  buildInboxItemUpdate,
  isInboxAction,
  appendProjectNote,
  isInboxBackfillAdmin,
  generateInboxItemId,
} from '../lib/inbox/validation.js';
import {
  parseFinancialTransactionsQuery,
  categoriesForTab,
  formatFinancialTransactionRow,
} from '../lib/financial-transactions/filters.js';
import { deriveChainOfTitleStatus, validateTitleSearchBody } from '../lib/closing/title-search.js';
import {
  validateInvitationAskBody,
  isInvitationExpired,
  buildInvestorInquiryMessage,
} from '../lib/invitations/token-ask.js';
import { filterInvestorTimeline } from '../lib/investor/timeline.js';
import { buildChangelogMetadata } from '../lib/changelog/metadata.js';

describe('Phase 4s inbox libs', () => {
  it('validateCreateInboxItemBody requires core fields', () => {
    expect(validateCreateInboxItemBody({}).ok).toBe(false);
    expect(
      validateCreateInboxItemBody({
        recipientUid: 'u2',
        organizationId: 'org-1',
        type: 'alert',
        category: 'rent',
        title: 'Missed rent',
        body: 'Please review',
        senderName: 'System',
      }).ok,
    ).toBe(true);
  });

  it('buildInboxItemUpdate whitelists read/archived/actionTaken', () => {
    expect(buildInboxItemUpdate({ read: true })?.read).toBe(true);
    expect(buildInboxItemUpdate({})).toBeNull();
  });

  it('isInboxAction recognizes rent actions', () => {
    expect(isInboxAction('confirm_paid')).toBe(true);
    expect(isInboxAction('unknown')).toBe(false);
  });

  it('appendProjectNote supports string or array notes', () => {
    expect(appendProjectNote('old', 'new')).toBe('old\nnew');
    expect(appendProjectNote(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('isInboxBackfillAdmin allows lead investor/admin', () => {
    expect(isInboxBackfillAdmin({ orgRole: 'Admin' })).toBe(true);
    expect(isInboxBackfillAdmin({ orgRole: 'Member' })).toBe(false);
  });

  it('generateInboxItemId uses inb prefix', () => {
    expect(generateInboxItemId(() => 1)).toMatch(/^inb_1_/);
  });
});

describe('Phase 4s financial/closing/invitation libs', () => {
  it('parseFinancialTransactionsQuery defaults status/tab', () => {
    expect(parseFinancialTransactionsQuery({}).status).toBe('PENDING_REVIEW');
    expect(categoriesForTab('REVENUE')).toContain('RENT_INCOME');
  });

  it('formatFinancialTransactionRow coerces amount', () => {
    expect(formatFinancialTransactionRow({ id: '1', amount: '100' }).amount).toBe(100);
  });

  it('validateTitleSearchBody requires provider checks array', () => {
    expect(validateTitleSearchBody({ projectId: 'p1' }).ok).toBe(false);
    const ok = validateTitleSearchBody({ projectId: 'p1', checks: [{ status: 'Cleared' }] });
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(deriveChainOfTitleStatus(ok.checks)).toBe('verified');
  });

  it('validateInvitationAskBody enforces message length', () => {
    expect(validateInvitationAskBody('x'.repeat(20), { message: 'hi' }).ok).toBe(true);
    expect(validateInvitationAskBody('short', { message: 'hi' }).ok).toBe(false);
  });

  it('isInvitationExpired detects past dates', () => {
    expect(isInvitationExpired('2000-01-01')).toBe(true);
  });

  it('filterInvestorTimeline includes owned projects', () => {
    const filtered = filterInvestorTimeline(
      [{ id: '1', projectId: 'p1', type: 'edit', createdAt: '2026-01-01' }],
      new Set(['p1']),
      'u1',
      [],
    );
    expect(filtered).toHaveLength(1);
  });

  it('buildChangelogMetadata returns latest date', () => {
    const meta = buildChangelogMetadata([{ version: '1.0', date: '2026-01-01', title: 'Launch' }]);
    expect(meta.latestDate).toBe('2026-01-01');
  });

  it('buildInvestorInquiryMessage tags sender as investor', () => {
    expect(buildInvestorInquiryMessage('Question?').sender).toBe('investor');
  });
});
