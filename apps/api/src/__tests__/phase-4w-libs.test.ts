import { describe, expect, it } from '@jest/globals';
import {
  formatSseEvent,
  formatSseHeartbeat,
  projectEventChannel,
  validateEventsStreamQuery,
} from '../lib/events/sse.js';
import { buildImpersonationCookies, buildPurgeAllSummary } from '../lib/admin/agent-crew.js';
import {
  getFolderForDocument,
  getPhaseForDocument,
  sanitizeDocumentFilename,
  validateDocumentUpload,
} from '../lib/projects/documents.js';
import {
  buildQnaSharedLedgerEvent,
  validateInquiryPatchBody,
} from '../lib/projects/inquiries.js';
import {
  buildFinancialTransactionsPagination,
  parseFinancialTransactionsListQuery,
  serializeFinancialTransactionRow,
  validateManualFinancialTransactionBody,
} from '../lib/financial/transactions.js';

describe('Phase 4w libs', () => {
  it('formats SSE events and validates stream query', () => {
    expect(validateEventsStreamQuery('p1').ok).toBe(true);
    expect(validateEventsStreamQuery('').ok).toBe(false);
    expect(formatSseEvent('transactions:new', { id: 'tx-1' })).toContain('event: transactions:new');
    expect(formatSseHeartbeat()).toContain('heartbeat');
    expect(projectEventChannel('kpi:updated', 'p1')).toBe('kpi:updated:p1');
  });

  it('builds admin agent-crew helpers', () => {
    const cookies = buildImpersonationCookies({
      agentId: 'agent-1',
      email: 'agent@test.com',
      name: 'Agent One',
    });
    expect(cookies[0].name).toBe('__session');
    expect(buildPurgeAllSummary({ usersDeleted: 1, projectsDeleted: 2, listingsDeleted: 3, messagesDeleted: 4, subscriptionsCanceled: 5 }).success).toBe(true);
  });

  it('resolves document folder, phase, and upload validation', () => {
    expect(getFolderForDocument({ documentType: 'appraisal' })).toBe('Debt');
    expect(getPhaseForDocument({ category: 'loi' })).toBe('phase-1');
    expect(sanitizeDocumentFilename('report (final).pdf')).toBe('report__final_.pdf');
    expect(
      validateDocumentUpload({
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        documentType: 'other',
      }).ok,
    ).toBe(true);
  });

  it('validates inquiry patch and ledger event', () => {
    const patch = validateInquiryPatchBody({ isShared: true });
    expect(patch.ok).toBe(true);
    if (patch.ok) {
      expect(patch.shareToggledOn).toBe(true);
    }
    const event = buildQnaSharedLedgerEvent({
      projectId: 'p1',
      inquiryId: 'inq-1',
      listingId: 'l1',
      performedBy: 'u1',
      version: 1,
      visibilityMode: 'PRIVATE',
      question: 'Q?',
      answer: 'A.',
    });
    expect(event.eventType).toBe('QNA_SHARED');
  });

  it('parses and validates financial transactions', () => {
    const filters = parseFinancialTransactionsListQuery({ page: '2', pageSize: '10', direction: 'CREDIT' });
    expect(filters.page).toBe(2);
    expect(filters.pageSize).toBe(10);
    expect(filters.direction).toBe('CREDIT');

    const body = validateManualFinancialTransactionBody({
      projectId: 'p1',
      amount: 100,
      direction: 'DEBIT',
      transactionDate: '2026-01-01',
    });
    expect(body.ok).toBe(true);

    const pagination = buildFinancialTransactionsPagination(1, 50, 120);
    expect(pagination.pages).toBe(3);
    expect(serializeFinancialTransactionRow({ amount: { toString: () => '99.00' } }).amount).toBe('99.00');
  });
});
