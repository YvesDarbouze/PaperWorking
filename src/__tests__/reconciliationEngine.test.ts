import { BankReconciliationEngine } from '@/lib/accounting/reconciliationEngine';
import { ReconciliationItemType, ReconciliationItemStatus, ReconciliationStatus } from '@prisma/client';

// ─── Matching Algorithm ───────────────────────────────────────────────────────

describe('BankReconciliationEngine - Matching Algorithm', () => {
  const baseDate = new Date('2026-07-15T12:00:00Z');

  it('correctly pairs exact matches (same amount and date within 1.5 days)', () => {
    const paperWorkingTxs = [
      {
        id: 'pw-1',
        amount: 2500,
        direction: 'CREDIT',
        transactionDate: baseDate,
        payee: 'TENANT RENT',
      },
    ];

    const plaidRawTxs = [
      {
        id: 'plaid-1',
        amount: 2500,
        direction: 'CREDIT',
        postedDate: new Date('2026-07-15T14:00:00Z'),
        name: 'ACH CREDIT TENANT RENT',
      },
    ];

    const result = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    expect(result.itemsToCreate).toHaveLength(1);
    expect(result.itemsToCreate[0].itemType).toBe(ReconciliationItemType.MATCHED);
    expect(result.itemsToCreate[0].status).toBe(ReconciliationItemStatus.VERIFIED);
    expect(result.itemsToCreate[0].financialTransactionId).toBe('pw-1');
    expect(result.itemsToCreate[0].plaidTransactionId).toBe('plaid-1');
    expect(result.paperWorkingBalance).toBe(2500);
  });

  it('correctly pairs partial matches (same amount within 3.5 days)', () => {
    const paperWorkingTxs = [
      {
        id: 'pw-2',
        amount: 1500,
        direction: 'DEBIT',
        transactionDate: new Date('2026-07-10T10:00:00Z'),
        payee: 'ABC PLUMBING',
      },
    ];

    const plaidRawTxs = [
      {
        id: 'plaid-2',
        amount: 1500,
        direction: 'DEBIT',
        postedDate: new Date('2026-07-12T18:00:00Z'),
        name: 'CHECK #1024 ABC PLUMBING',
      },
    ];

    const result = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    expect(result.itemsToCreate).toHaveLength(1);
    expect(result.itemsToCreate[0].itemType).toBe(ReconciliationItemType.MATCHED);
    expect(result.itemsToCreate[0].status).toBe(ReconciliationItemStatus.PENDING);
    expect(result.itemsToCreate[0].financialTransactionId).toBe('pw-2');
    expect(result.itemsToCreate[0].plaidTransactionId).toBe('plaid-2');
    expect(result.paperWorkingBalance).toBe(-1500);
  });

  it('classifies unmatched items as PAPERWORKING_ONLY or BANK_ONLY', () => {
    const paperWorkingTxs = [
      {
        id: 'pw-3',
        amount: 500,
        direction: 'DEBIT',
        transactionDate: new Date('2026-07-01T10:00:00Z'),
        payee: 'HANDYMAN REPAIR',
      },
    ];

    const plaidRawTxs = [
      {
        id: 'plaid-3',
        amount: 120,
        direction: 'DEBIT',
        postedDate: new Date('2026-07-20T10:00:00Z'),
        name: 'STATE FARM INSURANCE',
      },
    ];

    const result = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    expect(result.itemsToCreate).toHaveLength(2);

    const pwItem = result.itemsToCreate.find((i) => i.financialTransactionId === 'pw-3');
    expect(pwItem).toBeDefined();
    expect(pwItem?.itemType).toBe(ReconciliationItemType.PAPERWORKING_ONLY);

    const plaidItem = result.itemsToCreate.find((i) => i.plaidTransactionId === 'plaid-3');
    expect(plaidItem).toBeDefined();
    expect(plaidItem?.itemType).toBe(ReconciliationItemType.BANK_ONLY);
  });

  it('renders report HTML with CPA signature section and summary metrics', () => {
    const reportData = {
      periodId: 'rec-123',
      projectId: 'proj-456',
      projectName: 'Oakwood Apartments',
      address: '123 Main St, Austin TX',
      month: 7,
      year: 2026,
      status: ReconciliationStatus.RECONCILED,
      bankStatementBalance: 75000.0,
      paperWorkingBalance: 75000.0,
      difference: 0.0,
      reconciledAt: new Date('2026-07-31T20:00:00Z'),
      reconciledBy: 'user-789',
      reconcilerName: 'Jane CPA',
      notes: 'All items reconciled clean.',
      summary: {
        totalItems: 2,
        matchedCount: 2,
        verifiedCount: 2,
        adjustedCount: 0,
        ignoredCount: 0,
        pendingCount: 0,
        bankOnlyCount: 0,
        paperWorkingOnlyCount: 0,
        discrepancyCount: 0,
      },
      items: [
        {
          id: 'item-1',
          itemType: ReconciliationItemType.MATCHED,
          status: ReconciliationItemStatus.VERIFIED,
          description: 'Tenant Rent Payment',
          date: new Date('2026-07-01'),
          bankAmount: 2500.0,
          paperWorkingAmount: 2500.0,
          difference: 0.0,
          notes: null,
          financialTransactionId: 'pw-1',
          plaidTransactionId: 'plaid-1',
        },
      ],
    };

    const html = BankReconciliationEngine.renderReportHTML(reportData as any);

    expect(html).toContain('Bank Reconciliation Report');
    expect(html).toContain('Oakwood Apartments');
    expect(html).toContain('STATUS: RECONCILED');
    expect(html).toContain('CPA / Lead Investor Signature');
    expect(html).toContain('$75,000.00');
  });
});

// ─── Balance Calculation Tests ────────────────────────────────────────────────

describe('BankReconciliationEngine - Balance Calculation', () => {
  it('correctly sums mixed CREDIT and DEBIT transactions into paperWorkingBalance', () => {
    const paperWorkingTxs = [
      { id: 'pw-a', amount: 3000, direction: 'CREDIT', transactionDate: new Date('2026-07-01'), payee: 'Rent' },
      { id: 'pw-b', amount: 800, direction: 'DEBIT', transactionDate: new Date('2026-07-05'), payee: 'Utilities' },
      { id: 'pw-c', amount: 200, direction: 'DEBIT', transactionDate: new Date('2026-07-10'), payee: 'Repairs' },
    ];

    const { paperWorkingBalance } = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs: [],
    });

    // 3000 - 800 - 200 = 2000
    expect(paperWorkingBalance).toBe(2000);
  });

  it('returns zero balance for empty transaction lists', () => {
    const { paperWorkingBalance, itemsToCreate } = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs: [],
      plaidRawTxs: [],
    });

    expect(paperWorkingBalance).toBe(0);
    expect(itemsToCreate).toHaveLength(0);
  });

  it('does NOT match when date gap exceeds 3.5 days (beyond partial threshold)', () => {
    const paperWorkingTxs = [
      {
        id: 'pw-far',
        amount: 1000,
        direction: 'DEBIT',
        transactionDate: new Date('2026-07-01T00:00:00Z'),
        payee: 'VENDOR',
      },
    ];

    const plaidRawTxs = [
      {
        id: 'plaid-far',
        amount: 1000,
        direction: 'DEBIT',
        // 5 days later — beyond 3.5-day partial threshold
        postedDate: new Date('2026-07-06T00:00:00Z'),
        name: 'VENDOR PAYMENT',
      },
    ];

    const { itemsToCreate } = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    // Should produce 2 unmatched items (PW_ONLY + BANK_ONLY)
    expect(itemsToCreate).toHaveLength(2);
    expect(itemsToCreate.every((i) => i.itemType !== ReconciliationItemType.MATCHED)).toBe(true);
  });

  it('does NOT match when amount differs by more than $0.01', () => {
    const paperWorkingTxs = [
      {
        id: 'pw-amt',
        amount: 500.00,
        direction: 'DEBIT',
        transactionDate: new Date('2026-07-10T00:00:00Z'),
        payee: 'VENDOR',
      },
    ];

    const plaidRawTxs = [
      {
        id: 'plaid-amt',
        amount: 500.05, // $0.05 difference — exceeds $0.01 threshold
        direction: 'DEBIT',
        postedDate: new Date('2026-07-10T00:00:00Z'),
        name: 'VENDOR',
      },
    ];

    const { itemsToCreate } = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    expect(itemsToCreate).toHaveLength(2);
    expect(itemsToCreate.every((i) => i.itemType !== ReconciliationItemType.MATCHED)).toBe(true);
  });

  it('pairs multiple transactions correctly in one pass — no double matching', () => {
    const paperWorkingTxs = [
      { id: 'pw-x1', amount: 1200, direction: 'CREDIT', transactionDate: new Date('2026-07-01T12:00:00Z'), payee: 'Tenant A' },
      { id: 'pw-x2', amount: 900, direction: 'DEBIT', transactionDate: new Date('2026-07-08T12:00:00Z'), payee: 'Electrician' },
    ];

    const plaidRawTxs = [
      { id: 'pl-x1', amount: 1200, direction: 'CREDIT', postedDate: new Date('2026-07-01T14:00:00Z'), name: 'Tenant A Rent' },
      { id: 'pl-x2', amount: 900, direction: 'DEBIT', postedDate: new Date('2026-07-08T10:00:00Z'), name: 'Electric work' },
    ];

    const { itemsToCreate, paperWorkingBalance } = BankReconciliationEngine.runMatchingAlgorithm({
      paperWorkingTxs,
      plaidRawTxs,
    });

    // Both should match exactly — 2 MATCHED items
    expect(itemsToCreate).toHaveLength(2);
    expect(itemsToCreate.every((i) => i.itemType === ReconciliationItemType.MATCHED)).toBe(true);
    // 1200 - 900 = 300
    expect(paperWorkingBalance).toBe(300);
  });
});

// ─── HTML Report Rendering ────────────────────────────────────────────────────

describe('BankReconciliationEngine - renderReportHTML', () => {
  const baseReport = {
    periodId: 'period-1',
    projectId: 'proj-1',
    projectName: 'Pine Street Duplex',
    address: '456 Pine St, Dallas TX',
    month: 6,
    year: 2026,
    status: ReconciliationStatus.DISCREPANCY_FOUND,
    bankStatementBalance: 50000.0,
    paperWorkingBalance: 49820.0,
    difference: 180.0,
    reconciledAt: null,
    reconciledBy: null,
    reconcilerName: null,
    notes: 'CHECK #1024 not found in PW ledger.',
    summary: {
      totalItems: 3,
      matchedCount: 2,
      verifiedCount: 2,
      adjustedCount: 0,
      ignoredCount: 0,
      pendingCount: 1,
      bankOnlyCount: 1,
      paperWorkingOnlyCount: 0,
      discrepancyCount: 0,
    },
    items: [
      {
        id: 'item-a',
        itemType: ReconciliationItemType.BANK_ONLY,
        status: ReconciliationItemStatus.PENDING,
        description: 'CHECK #1024',
        date: new Date('2026-06-15'),
        bankAmount: 180.0,
        paperWorkingAmount: null,
        difference: 180.0,
        notes: null,
        financialTransactionId: null,
        plaidTransactionId: 'plaid-a',
      },
    ],
  };

  it('shows DISCREPANCY_FOUND status badge', () => {
    const html = BankReconciliationEngine.renderReportHTML(baseReport as any);
    expect(html).toContain('STATUS: DISCREPANCY_FOUND');
  });

  it('includes the reconciliation notes block when notes are present', () => {
    const html = BankReconciliationEngine.renderReportHTML(baseReport as any);
    expect(html).toContain('CHECK #1024 not found in PW ledger.');
    expect(html).toContain('Reconciliation Notes:');
  });

  it('renders June 2026 label correctly', () => {
    const html = BankReconciliationEngine.renderReportHTML(baseReport as any);
    expect(html).toContain('June 2026');
  });

  it('omits notes block when no notes are provided', () => {
    const noNotesReport = { ...baseReport, notes: null };
    const html = BankReconciliationEngine.renderReportHTML(noNotesReport as any);
    expect(html).not.toContain('Reconciliation Notes:');
  });

  it('falls back to "Accountant" label when reconcilerName and reconciledBy are null', () => {
    const html = BankReconciliationEngine.renderReportHTML(baseReport as any);
    expect(html).toContain('Prepared By: Accountant');
  });

  it('shows project name and address in report header', () => {
    const html = BankReconciliationEngine.renderReportHTML(baseReport as any);
    expect(html).toContain('Pine Street Duplex');
    expect(html).toContain('456 Pine St, Dallas TX');
  });
});
