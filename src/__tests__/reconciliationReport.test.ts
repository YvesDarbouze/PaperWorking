/**
 * Tests for ReconciliationReportGenerator
 *
 * These tests cover:
 * 1. generateHTML — all 5 sections, metadata, conditional rendering
 * 2. generatePDF  — returns a valid PDF Buffer (non-empty, correct magic bytes)
 *
 * NOTE: The Prisma client is fully mocked — no real database is accessed.
 * PDFKit runs end-to-end (it's a pure Node.js library, no browser required).
 */

import { generateHTML, generatePDF } from '@/lib/accounting/reconciliationReport';
import { ReconciliationItemType, ReconciliationItemStatus, ReconciliationStatus } from '@prisma/client';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    reconciliationPeriod: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

// ─── Fixture factory ──────────────────────────────────────────────────────────

function makeItem(
  overrides: Partial<{
    id: string;
    description: string;
    date: Date;
    itemType: ReconciliationItemType;
    status: ReconciliationItemStatus;
    bankAmount: number | null;
    paperWorkingAmount: number | null;
    notes: string | null;
  }> = {}
) {
  return {
    id: 'item-1',
    description: 'Tenant Rent Payment',
    date: new Date('2026-07-01'),
    itemType: ReconciliationItemType.MATCHED,
    status: ReconciliationItemStatus.VERIFIED,
    bankAmount: 2500,
    paperWorkingAmount: 2500,
    notes: null,
    ...overrides,
  };
}

function makePeriod(overrides: Record<string, unknown> = {}) {
  return {
    id: 'period-1',
    month: 7,
    year: 2026,
    status: ReconciliationStatus.RECONCILED,
    bankStatementBalance: '75000.00',
    paperWorkingBalance: '75000.00',
    difference: '0.00',
    reconciledAt: new Date('2026-07-31T18:00:00Z'),
    reconciledBy: 'user-1',
    notes: null,
    project: {
      displayName: 'Oakwood Apartments',
      addressLine: '123 Main St',
      city: 'Austin',
      state: 'TX',
    },
    reconciler: { id: 'user-1', name: 'Jane CPA', email: 'jane@example.com' },
    items: [makeItem()],
    ...overrides,
  };
}

// ─── HTML Tests ───────────────────────────────────────────────────────────────

describe('ReconciliationReportGenerator - generateHTML', () => {
  beforeEach(() => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(makePeriod());
  });

  afterEach(() => jest.clearAllMocks());

  it('contains all 5 section headings', async () => {
    const html = await generateHTML('period-1');

    expect(html).toContain('Balance Summary');
    expect(html).toContain('Matched Transactions');
    expect(html).toContain('Adjustments');
    expect(html).toContain('Certification');
    expect(html).toContain('Reconciliation Report');
  });

  it('renders project name and address in the cover', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('Oakwood Apartments');
    expect(html).toContain('Austin');
  });

  it('renders the correct month/year label', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('July 2026');
  });

  it('shows RECONCILED status badge when difference is 0', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('RECONCILED');
    expect(html).toContain('Balance Confirmed');
  });

  it('shows DISCREPANCY badge when difference is non-zero', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({
        status: ReconciliationStatus.DISCREPANCY_FOUND,
        bankStatementBalance: '50000.00',
        paperWorkingBalance: '49820.00',
        difference: '180.00',
      })
    );

    const html = await generateHTML('period-1');
    expect(html).toContain('DISCREPANCY FOUND');
  });

  it('renders reconciler name from reconciler relation', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('Jane CPA');
  });

  it('renders bank statement and PaperWorking balances', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('75,000.00');
  });

  it('renders matched item description in transaction table', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('Tenant Rent Payment');
  });

  it('shows "No matched transactions" message when items list is empty', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({ items: [] })
    );
    const html = await generateHTML('period-1');
    expect(html).toContain('No matched transactions');
  });

  it('renders reconciliation notes block when notes are present', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({ notes: 'Check #1024 was manually verified.' })
    );
    const html = await generateHTML('period-1');
    expect(html).toContain('Check #1024 was manually verified.');
    expect(html).toContain('Reconciliation Notes');
  });

  it('omits notes block when notes are null', async () => {
    const html = await generateHTML('period-1');
    expect(html).not.toContain('Reconciliation Notes');
  });

  it('renders CPA sign-off section with signature lines', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('Certification');
    expect(html).toContain('Prepared By');
    expect(html).toContain('Reviewed By');
    expect(html).toContain('CPA / Accountant');
  });

  it('includes project name in certification text body', async () => {
    const html = await generateHTML('period-1');
    expect(html).toContain('Oakwood Apartments');
    expect(html).toContain('July 2026');
  });

  it('shows adjusted items section with notes', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({
        items: [
          makeItem({
            id: 'item-adj',
            itemType: ReconciliationItemType.BANK_ONLY,
            status: ReconciliationItemStatus.ADJUSTED,
            description: 'Adjustment for utilities',
            bankAmount: 250,
            paperWorkingAmount: null,
            notes: 'Created matching PW transaction.',
          }),
        ],
      })
    );
    const html = await generateHTML('period-1');
    expect(html).toContain('Adjustment for utilities');
    expect(html).toContain('Created matching PW transaction.');
  });

  it('throws on non-existent period', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(generateHTML('not-real')).rejects.toThrow('not found');
  });
});

// ─── PDF Tests ────────────────────────────────────────────────────────────────

describe('ReconciliationReportGenerator - generatePDF', () => {
  beforeEach(() => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(makePeriod());
  });

  afterEach(() => jest.clearAllMocks());

  it('returns a non-empty Buffer', async () => {
    const buf = await generatePDF('period-1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('PDF magic bytes start with %PDF-', async () => {
    const buf = await generatePDF('period-1');
    const header = buf.slice(0, 5).toString('ascii');
    expect(header).toBe('%PDF-');
  });

  it('generates successfully with no items (all-empty tables)', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({ items: [] })
    );
    const buf = await generatePDF('period-1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('generates successfully with a discrepancy period', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({
        status: ReconciliationStatus.DISCREPANCY_FOUND,
        bankStatementBalance: '50000.00',
        paperWorkingBalance: '49820.00',
        difference: '180.00',
        notes: 'CHECK #1024 unresolved.',
        items: [
          makeItem({
            id: 'bank-only',
            itemType: ReconciliationItemType.BANK_ONLY,
            status: ReconciliationItemStatus.PENDING,
            bankAmount: 180,
            paperWorkingAmount: null,
            description: 'CHECK #1024',
          }),
        ],
      })
    );
    const buf = await generatePDF('period-1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  });

  it('generates successfully with many matched items (pagination test)', async () => {
    const manyItems = Array.from({ length: 40 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        description: `Transaction ${i + 1}`,
        date: new Date(`2026-07-${String((i % 28) + 1).padStart(2, '0')}`),
        bankAmount: 100 + i,
        paperWorkingAmount: 100 + i,
      })
    );

    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(
      makePeriod({ items: manyItems })
    );

    const buf = await generatePDF('period-1');
    expect(Buffer.isBuffer(buf)).toBe(true);
    // Multi-page PDF with 40 rows should be significantly larger
    expect(buf.length).toBeGreaterThan(5000);
  });

  it('throws on non-existent period', async () => {
    (prisma.reconciliationPeriod.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(generatePDF('not-real')).rejects.toThrow('not found');
  });
});
