/**
 * ReconciliationReportGenerator
 * ─────────────────────────────────────────────────────────────────────────────
 * Produces CPA-ready PDF and print-friendly HTML reconciliation reports.
 *
 * PDF: Built with PDFKit (server-side, no browser required).
 * HTML: Responsive with print-optimised CSS.
 *
 * Both formats carry the same 5-section structure:
 *   Page 1 — Cover
 *   Page 2 — Balance Summary
 *   Page 3 — Matched Transactions
 *   Page 4 — Adjustments & Discrepancies
 *   Page 5 — Sign-Off / Certification
 */

import PDFDocument from 'pdfkit';
import prisma from '@/lib/prisma';
import { ReconciliationItemType, ReconciliationItemStatus } from '@prisma/client';

// ─── Internal types ───────────────────────────────────────────────────────────

interface ReportItem {
  id: string;
  description: string;
  date: Date;
  itemType: ReconciliationItemType;
  status: ReconciliationItemStatus;
  bankAmount: number | null;
  paperWorkingAmount: number | null;
  notes: string | null;
}

interface ReportData {
  periodId: string;
  projectName: string;
  address: string;
  month: number;
  year: number;
  status: string;
  bankStatementBalance: number;
  paperWorkingBalance: number;
  difference: number;
  reconciledAt: Date | null;
  reconcilerName: string | null;
  reconciledBy: string | null;
  notes: string | null;
  totalBankDeposits: number;
  totalBankWithdrawals: number;
  totalPWDeposits: number;
  totalPWWithdrawals: number;
  matchedItems: ReportItem[];
  adjustedItems: ReportItem[];
  ignoredItems: ReportItem[];
  pendingItems: ReportItem[];
  totalItems: number;
  generatedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Data Fetcher ─────────────────────────────────────────────────────────────

async function fetchReportData(reconciliationPeriodId: string): Promise<ReportData> {
  const period = await prisma.reconciliationPeriod.findUnique({
    where: { id: reconciliationPeriodId },
    include: {
      items: { orderBy: { date: 'asc' } },
      project: true,
      reconciler: { select: { id: true, name: true, email: true } },
    },
  });

  if (!period) throw new Error('Reconciliation period not found');

  const items: ReportItem[] = period.items.map((item) => ({
    id: item.id,
    description: item.description,
    date: item.date,
    itemType: item.itemType,
    status: item.status,
    bankAmount: item.bankAmount !== null ? Number(item.bankAmount) : null,
    paperWorkingAmount: item.paperWorkingAmount !== null ? Number(item.paperWorkingAmount) : null,
    notes: item.notes,
  }));

  // Bank deposits = positive bank amounts; withdrawals = negative
  const totalBankDeposits = items
    .filter((i) => (i.bankAmount ?? 0) > 0)
    .reduce((s, i) => s + (i.bankAmount ?? 0), 0);
  const totalBankWithdrawals = Math.abs(
    items.filter((i) => (i.bankAmount ?? 0) < 0).reduce((s, i) => s + (i.bankAmount ?? 0), 0)
  );
  const totalPWDeposits = items
    .filter((i) => (i.paperWorkingAmount ?? 0) > 0)
    .reduce((s, i) => s + (i.paperWorkingAmount ?? 0), 0);
  const totalPWWithdrawals = Math.abs(
    items.filter((i) => (i.paperWorkingAmount ?? 0) < 0).reduce((s, i) => s + (i.paperWorkingAmount ?? 0), 0)
  );

  return {
    periodId: period.id,
    projectName: period.project?.displayName || period.project?.addressLine || 'Investment Property',
    address: [period.project?.addressLine, period.project?.city, period.project?.state]
      .filter(Boolean)
      .join(', '),
    month: period.month,
    year: period.year,
    status: period.status,
    bankStatementBalance: Number(period.bankStatementBalance),
    paperWorkingBalance: Number(period.paperWorkingBalance),
    difference: Number(period.difference),
    reconciledAt: period.reconciledAt,
    reconcilerName: period.reconciler?.name ?? null,
    reconciledBy: period.reconciledBy,
    notes: period.notes,
    totalBankDeposits,
    totalBankWithdrawals,
    totalPWDeposits,
    totalPWWithdrawals,
    matchedItems: items.filter((i) => i.itemType === ReconciliationItemType.MATCHED),
    adjustedItems: items.filter((i) => i.status === ReconciliationItemStatus.ADJUSTED),
    ignoredItems: items.filter((i) => i.status === ReconciliationItemStatus.IGNORED),
    pendingItems: items.filter((i) => i.status === ReconciliationItemStatus.PENDING),
    totalItems: items.length,
    generatedAt: new Date(),
  };
}

// ─── PDF Generation ───────────────────────────────────────────────────────────

/** PDFKit colour palette */
const PDF = {
  brand: '#10b981',      // emerald-500
  brandDark: '#065f46',  // emerald-900
  dark: '#0f172a',       // slate-900
  text: '#1e293b',       // slate-800
  muted: '#64748b',      // slate-500
  border: '#e2e8f0',     // slate-200
  light: '#f8fafc',      // slate-50
  white: '#ffffff',
  red: '#dc2626',        // red-600
  green: '#16a34a',      // green-600
  amber: '#d97706',      // amber-600
};

function bufferToHex(n: number): string {
  return '#' + [Math.floor(n / 65536), Math.floor((n % 65536) / 256), n % 256]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Draws a horizontal rule across the current content width.
 */
function hRule(doc: PDFKit.PDFDocument, y?: number, color = PDF.border): void {
  const _y = y ?? doc.y;
  doc
    .moveTo(doc.page.margins.left, _y)
    .lineTo(doc.page.width - doc.page.margins.right, _y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke();
}

/**
 * Draws a coloured rectangle header band.
 */
function sectionHeader(doc: PDFKit.PDFDocument, label: string): void {
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  doc.rect(x, y, w, 22).fill(PDF.brandDark);
  doc
    .fillColor(PDF.white)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label.toUpperCase(), x + 8, y + 7, { width: w - 16 });
  doc.moveDown(0.5);
}

/**
 * Page footer — page number + generation timestamp.
 */
function addFooter(doc: PDFKit.PDFDocument, pageNum: number, total: number, generatedAt: Date): void {
  const x = doc.page.margins.left;
  const w = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.page.height - 40;
  doc
    .moveTo(x, y)
    .lineTo(x + w, y)
    .strokeColor(PDF.border)
    .lineWidth(0.5)
    .stroke();
  doc
    .fillColor(PDF.muted)
    .font('Helvetica')
    .fontSize(8)
    .text(`Page ${pageNum} of ${total}`, x, y + 6, { align: 'left', width: w / 2 })
    .text(
      `Generated ${generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} · PaperWorking`,
      x,
      y + 6,
      { align: 'right', width: w }
    );
}

/**
 * Draws a simple data table on the current page.
 * Returns the y-position after the table.
 */
function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: (string | number | null)[][],
  colWidths: number[],
  options: { startY?: number; rowHeight?: number } = {}
): number {
  const x = doc.page.margins.left;
  const startY = options.startY ?? doc.y;
  const rowH = options.rowHeight ?? 18;
  const headerH = 20;
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);

  // Header row background
  doc.rect(x, startY, totalWidth, headerH).fill(PDF.light);

  // Header text
  doc.fillColor(PDF.muted).font('Helvetica-Bold').fontSize(8);
  let cx = x;
  headers.forEach((h, i) => {
    doc.text(h, cx + 4, startY + 6, { width: colWidths[i] - 8, lineBreak: false });
    cx += colWidths[i];
  });

  // Header bottom border
  doc
    .moveTo(x, startY + headerH)
    .lineTo(x + totalWidth, startY + headerH)
    .strokeColor(PDF.border)
    .lineWidth(0.5)
    .stroke();

  // Data rows
  let y = startY + headerH;
  rows.forEach((row, ri) => {
    // Alternate row background
    if (ri % 2 === 1) {
      doc.rect(x, y, totalWidth, rowH).fill('#f1f5f9');
    }

    doc.fillColor(PDF.text).font('Helvetica').fontSize(8);
    cx = x;
    row.forEach((cell, ci) => {
      const cellStr = cell === null || cell === undefined ? '—' : String(cell);
      doc.text(cellStr, cx + 4, y + 5, {
        width: colWidths[ci] - 8,
        lineBreak: false,
        ellipsis: true,
      });
      cx += colWidths[ci];
    });

    // Row bottom border
    y += rowH;
    doc
      .moveTo(x, y)
      .lineTo(x + totalWidth, y)
      .strokeColor(PDF.border)
      .lineWidth(0.3)
      .stroke();
  });

  return y + 8;
}

// ─── Public: generatePDF ──────────────────────────────────────────────────────

export async function generatePDF(reconciliationPeriodId: string): Promise<Buffer> {
  const data = await fetchReportData(reconciliationPeriodId);
  const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;
  const isBalanced = Math.abs(data.difference) <= 0.01;
  const contentW = 612 - 60 - 60; // LETTER width minus margins

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 60, left: 60, right: 60 },
      info: {
        Title: `Bank Reconciliation Report — ${data.projectName} (${monthLabel})`,
        Author: 'PaperWorking',
        Subject: 'Bank Reconciliation',
        Keywords: 'reconciliation, bank statement, real estate, accounting',
        CreationDate: data.generatedAt,
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── PAGE 1: COVER ─────────────────────────────────────────────────────────

    // Green header band
    doc.rect(0, 0, doc.page.width, 180).fill(PDF.brandDark);

    // Logo wordmark
    doc
      .fillColor(PDF.white)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('PaperWorking', 60, 60);
    doc
      .fillColor(PDF.brand)
      .font('Helvetica')
      .fontSize(11)
      .text('Real Estate Portfolio Intelligence', 60, 88);

    // Divider
    doc
      .moveTo(60, 110)
      .lineTo(doc.page.width - 60, 110)
      .strokeColor('rgba(255,255,255,0.2)')
      .lineWidth(0.5)
      .stroke();

    // Report type label
    doc
      .fillColor(PDF.white)
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Bank Reconciliation Report', 60, 124);

    // Cover content (below header)
    const coverY = 220;

    doc
      .fillColor(PDF.text)
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(data.projectName, 60, coverY, { width: contentW });

    doc
      .fillColor(PDF.muted)
      .font('Helvetica')
      .fontSize(12)
      .text(data.address || 'Address on file', 60, doc.y + 4);

    doc.moveDown(2);
    hRule(doc, undefined, PDF.border);
    doc.moveDown(1.5);

    // Cover metadata grid
    const metaItems = [
      ['Reporting Period', monthLabel],
      ['Report Status', data.status.replace(/_/g, ' ')],
      ['Bank Statement Balance', `$${fmt(data.bankStatementBalance)}`],
      ['PaperWorking Balance', `$${fmt(data.paperWorkingBalance)}`],
      ['Difference / Variance', `$${fmt(data.difference)}`],
      ['Reconciled By', data.reconcilerName || data.reconciledBy || 'Not yet finalized'],
      [
        'Reconciliation Date',
        data.reconciledAt ? fmtDate(data.reconciledAt) : 'Pending',
      ],
      ['Report Generated', fmtDate(data.generatedAt)],
    ];

    metaItems.forEach(([label, value]) => {
      const yPos = doc.y;
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(9)
        .text(label, 60, yPos, { width: 200, continued: false });
      doc
        .fillColor(label === 'Difference / Variance'
          ? (isBalanced ? PDF.green : PDF.red)
          : PDF.text)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(value, 280, yPos, { width: contentW - 220 });
      doc.moveDown(0.6);
    });

    // Status badge at bottom of cover
    const badgeY = doc.page.height - 160;
    const badgeColor = isBalanced ? PDF.green : PDF.red;
    const badgeLabel = isBalanced ? '✓  RECONCILED — Balance Confirmed' : '⚠  DISCREPANCY FOUND';
    doc.rect(60, badgeY, contentW, 40).fill(isBalanced ? '#dcfce7' : '#fee2e2');
    doc
      .fillColor(badgeColor)
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(badgeLabel, 60, badgeY + 12, { width: contentW, align: 'center' });

    addFooter(doc, 1, 5, data.generatedAt);

    // ── PAGE 2: SUMMARY ───────────────────────────────────────────────────────
    doc.addPage();

    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Balance Summary', 60, doc.page.margins.top);
    doc.moveDown(0.3);
    hRule(doc, undefined, PDF.brand);
    doc.moveDown(1.2);

    // Balance comparison boxes
    const boxW = (contentW - 20) / 2;
    const boxY = doc.y;

    // Bank statement box
    doc.rect(60, boxY, boxW, 80).fill(PDF.light);
    doc
      .fillColor(PDF.muted)
      .font('Helvetica')
      .fontSize(9)
      .text('BANK STATEMENT ENDING BALANCE', 68, boxY + 12, { width: boxW - 16 });
    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(`$${fmt(data.bankStatementBalance)}`, 68, boxY + 30, { width: boxW - 16 });

    // PaperWorking box
    const box2X = 60 + boxW + 20;
    doc.rect(box2X, boxY, boxW, 80).fill(PDF.light);
    doc
      .fillColor(PDF.muted)
      .font('Helvetica')
      .fontSize(9)
      .text('PAPERWORKING LEDGER BALANCE', box2X + 8, boxY + 12, { width: boxW - 16 });
    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(`$${fmt(data.paperWorkingBalance)}`, box2X + 8, boxY + 30, { width: boxW - 16 });

    // Difference row
    const diffY = boxY + 96;
    doc.rect(60, diffY, contentW, 44).fill(isBalanced ? '#dcfce7' : '#fee2e2');
    doc
      .fillColor(PDF.muted)
      .font('Helvetica')
      .fontSize(9)
      .text('NET VARIANCE / DIFFERENCE', 68, diffY + 8);
    doc
      .fillColor(isBalanced ? PDF.green : PDF.red)
      .font('Helvetica-Bold')
      .fontSize(20)
      .text(
        `$${fmt(data.difference)}${isBalanced ? '  ✓' : '  ⚠'}`,
        68,
        diffY + 22,
        { width: contentW - 16 }
      );

    doc.y = diffY + 60;
    doc.moveDown(1);

    // Deposits / Withdrawals breakdown
    sectionHeader(doc, 'Deposit & Withdrawal Breakdown');
    doc.moveDown(0.5);

    drawTable(
      doc,
      ['Category', 'Bank Statement', 'PaperWorking', 'Variance'],
      [
        [
          'Total Deposits (Credits)',
          `$${fmt(data.totalBankDeposits)}`,
          `$${fmt(data.totalPWDeposits)}`,
          `$${fmt(Math.abs(data.totalBankDeposits - data.totalPWDeposits))}`,
        ],
        [
          'Total Withdrawals (Debits)',
          `$${fmt(data.totalBankWithdrawals)}`,
          `$${fmt(data.totalPWWithdrawals)}`,
          `$${fmt(Math.abs(data.totalBankWithdrawals - data.totalPWWithdrawals))}`,
        ],
      ],
      [220, 110, 110, 100]
    );

    doc.moveDown(1.5);

    // Item count summary
    sectionHeader(doc, 'Reconciliation Item Summary');
    doc.moveDown(0.5);

    drawTable(
      doc,
      ['Status', 'Count'],
      [
        ['Matched & Verified', String(data.matchedItems.length)],
        ['Adjusted', String(data.adjustedItems.length)],
        ['Ignored', String(data.ignoredItems.length)],
        ['Pending Review', String(data.pendingItems.length)],
        ['Total Items', String(data.totalItems)],
      ],
      [300, 100]
    );

    addFooter(doc, 2, 5, data.generatedAt);

    // ── PAGE 3: MATCHED TRANSACTIONS ─────────────────────────────────────────
    doc.addPage();

    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Matched Transactions', 60, doc.page.margins.top);
    doc.moveDown(0.3);
    hRule(doc, undefined, PDF.brand);
    doc.moveDown(1);

    if (data.matchedItems.length === 0) {
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(11)
        .text('No matched transactions for this period.', { align: 'center' });
    } else {
      // Split into chunks that fit on each page (~26 rows per page at 18px row height)
      const chunkSize = 26;
      const chunks: ReportItem[][] = [];
      for (let i = 0; i < data.matchedItems.length; i += chunkSize) {
        chunks.push(data.matchedItems.slice(i, i + chunkSize));
      }

      chunks.forEach((chunk, chunkIdx) => {
        if (chunkIdx > 0) {
          doc.addPage();
          doc
            .fillColor(PDF.dark)
            .font('Helvetica-Bold')
            .fontSize(16)
            .text('Matched Transactions (continued)', 60, doc.page.margins.top);
          doc.moveDown(0.5);
          hRule(doc, undefined, PDF.brand);
          doc.moveDown(1);
        }

        drawTable(
          doc,
          ['Date', 'Description', 'Bank Amount', 'PaperWorking', 'Status'],
          chunk.map((item) => [
            fmtDate(item.date),
            item.description,
            item.bankAmount !== null ? `$${fmt(item.bankAmount)}` : '—',
            item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—',
            item.status,
          ]),
          [72, 168, 90, 90, 80]
        );
      });
    }

    addFooter(doc, 3, 5, data.generatedAt);

    // ── PAGE 4: ADJUSTMENTS & DISCREPANCIES ───────────────────────────────────
    doc.addPage();

    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Adjustments & Discrepancies', 60, doc.page.margins.top);
    doc.moveDown(0.3);
    hRule(doc, undefined, PDF.brand);
    doc.moveDown(1);

    // Adjusted items table
    sectionHeader(doc, 'Adjusted Items');
    doc.moveDown(0.5);

    if (data.adjustedItems.length === 0) {
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(10)
        .text('No adjustments were made for this period.', 60, doc.y, { width: contentW });
    } else {
      drawTable(
        doc,
        ['Date', 'Description', 'Bank Amt', 'PW Amt', 'Notes'],
        data.adjustedItems.map((item) => [
          fmtDate(item.date),
          item.description,
          item.bankAmount !== null ? `$${fmt(item.bankAmount)}` : '—',
          item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—',
          item.notes || '',
        ]),
        [72, 140, 80, 80, 148]
      );
    }

    doc.moveDown(1.5);

    // Ignored items
    sectionHeader(doc, 'Ignored Items');
    doc.moveDown(0.5);

    if (data.ignoredItems.length === 0) {
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(10)
        .text('No items were ignored for this period.', 60, doc.y, { width: contentW });
    } else {
      drawTable(
        doc,
        ['Date', 'Description', 'PW Amount', 'Reason'],
        data.ignoredItems.map((item) => [
          fmtDate(item.date),
          item.description,
          item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—',
          item.notes || 'Not on bank statement',
        ]),
        [72, 180, 90, 178]
      );
    }

    doc.moveDown(1.5);

    // Pending items (if any — should be zero in a finalized report)
    if (data.pendingItems.length > 0) {
      sectionHeader(doc, 'Pending / Unresolved Items');
      doc.moveDown(0.5);

      drawTable(
        doc,
        ['Date', 'Description', 'Type', 'Bank Amt', 'PW Amt'],
        data.pendingItems.map((item) => [
          fmtDate(item.date),
          item.description,
          item.itemType.replace(/_/g, ' '),
          item.bankAmount !== null ? `$${fmt(item.bankAmount)}` : '—',
          item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—',
        ]),
        [72, 160, 100, 90, 98]
      );
      doc.moveDown(1);
    }

    // Overall reconciliation notes
    if (data.notes) {
      doc.moveDown(0.5);
      sectionHeader(doc, 'Reconciliation Notes');
      doc.moveDown(0.5);
      doc
        .rect(60, doc.y, contentW, 60)
        .fill('#fffbeb');
      doc
        .fillColor('#92400e')
        .font('Helvetica')
        .fontSize(10)
        .text(data.notes, 68, doc.y + 6, { width: contentW - 16, height: 48 });
      doc.y += 68;
    }

    addFooter(doc, 4, 5, data.generatedAt);

    // ── PAGE 5: SIGN-OFF ──────────────────────────────────────────────────────
    doc.addPage();

    doc
      .fillColor(PDF.dark)
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Certification & Sign-Off', 60, doc.page.margins.top);
    doc.moveDown(0.3);
    hRule(doc, undefined, PDF.brand);
    doc.moveDown(2);

    // Certification text
    doc.rect(60, doc.y, contentW, 80).fill(PDF.light);
    const certY = doc.y + 12;
    doc
      .fillColor(PDF.text)
      .font('Helvetica')
      .fontSize(11)
      .text(
        `I certify that the above reconciliation accurately reflects the financial activity for ` +
          `${data.projectName} for ${MONTH_NAMES[data.month - 1]} ${data.year}. ` +
          `All transactions have been reviewed and accounted for in accordance with generally accepted accounting principles.`,
        68,
        certY,
        { width: contentW - 16, lineGap: 3 }
      );
    doc.y = certY + 80;
    doc.moveDown(2);

    // Signature lines
    const sigSections = [
      { label: 'Prepared By', sublabel: 'Investor / Property Manager' },
      { label: 'Reviewed By', sublabel: 'CPA / Accountant' },
    ];

    sigSections.forEach((sig, idx) => {
      const sigX = idx === 0 ? 60 : 60 + contentW / 2 + 20;
      const sigW = contentW / 2 - 20;
      const sigY = doc.y;

      // Signature underline
      doc
        .moveTo(sigX, sigY + 50)
        .lineTo(sigX + sigW, sigY + 50)
        .strokeColor(PDF.dark)
        .lineWidth(0.8)
        .stroke();

      doc
        .fillColor(PDF.text)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(sig.label, sigX, sigY + 56, { width: sigW });

      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(8)
        .text(sig.sublabel, sigX, sigY + 70, { width: sigW });

      // Printed name line
      doc
        .moveTo(sigX, sigY + 100)
        .lineTo(sigX + sigW, sigY + 100)
        .strokeColor(PDF.border)
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(8)
        .text('Printed Name', sigX, sigY + 106, { width: sigW });

      // Date line
      doc
        .moveTo(sigX, sigY + 130)
        .lineTo(sigX + sigW / 2, sigY + 130)
        .strokeColor(PDF.border)
        .lineWidth(0.5)
        .stroke();
      doc
        .fillColor(PDF.muted)
        .font('Helvetica')
        .fontSize(8)
        .text('Date', sigX, sigY + 136, { width: sigW / 2 });
    });

    doc.moveDown(16);

    // License & disclaimer
    hRule(doc, undefined, PDF.border);
    doc.moveDown(0.5);
    doc
      .fillColor(PDF.muted)
      .font('Helvetica')
      .fontSize(7.5)
      .text(
        'This report was generated by PaperWorking. It is intended for internal review and tax preparation purposes. ' +
          'PaperWorking is not a licensed CPA firm. Please have this document reviewed by a qualified accountant or tax professional.',
        60,
        doc.y,
        { width: contentW, lineGap: 2 }
      );

    addFooter(doc, 5, 5, data.generatedAt);

    doc.end();
  });
}

// ─── Public: generateHTML ─────────────────────────────────────────────────────

export async function generateHTML(reconciliationPeriodId: string): Promise<string> {
  const data = await fetchReportData(reconciliationPeriodId);
  const monthLabel = `${MONTH_NAMES[data.month - 1]} ${data.year}`;
  const isBalanced = Math.abs(data.difference) <= 0.01;

  const itemRowHTML = (item: ReportItem): string => `
    <tr>
      <td>${fmtDate(item.date)}</td>
      <td class="desc">${item.description}</td>
      <td class="amt">${item.bankAmount !== null ? `$${fmt(item.bankAmount)}` : '—'}</td>
      <td class="amt">${item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—'}</td>
      <td><span class="badge badge-${item.status.toLowerCase()}">${item.status}</span></td>
      <td class="note">${item.notes || ''}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bank Reconciliation Report — ${data.projectName} (${monthLabel})</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      background: #fff;
      line-height: 1.5;
      font-size: 14px;
    }

    /* ── Cover ── */
    .cover {
      background: #065f46;
      color: #fff;
      padding: 48px 60px 40px;
      border-bottom: 4px solid #10b981;
    }
    .cover-logo { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .cover-sub { font-size: 12px; color: #6ee7b7; margin-top: 4px; }
    .cover-title { font-size: 16px; margin-top: 28px; font-weight: 500; opacity: 0.8; }
    .cover-project { font-size: 32px; font-weight: 800; margin-top: 8px; }
    .cover-address { font-size: 14px; color: #6ee7b7; margin-top: 6px; }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 36px;
      padding-top: 28px;
      border-top: 1px solid rgba(255,255,255,0.15);
    }
    .cover-meta-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.6; }
    .cover-meta-item span { display: block; font-size: 16px; font-weight: 700; margin-top: 4px; }
    .cover-meta-item.diff span { color: ${isBalanced ? '#6ee7b7' : '#fca5a5'}; }
    .status-badge-cover {
      display: inline-block;
      margin-top: 28px;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 800;
      background: ${isBalanced ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'};
      color: ${isBalanced ? '#6ee7b7' : '#fca5a5'};
      border: 1px solid ${isBalanced ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'};
    }

    /* ── Content ── */
    .content { padding: 40px 60px; max-width: 1100px; }

    /* ── Section headers ── */
    .section-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      padding-bottom: 8px;
      border-bottom: 3px solid #10b981;
    }
    .section-sub {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #fff;
      background: #065f46;
      padding: 8px 16px;
      border-radius: 4px;
      margin: 24px 0 12px;
    }

    /* ── Balance summary cards ── */
    .balance-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    @media (max-width: 600px) { .balance-grid { grid-template-columns: 1fr; } }
    .balance-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
    }
    .balance-card label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; font-weight: 700; }
    .balance-card .val { font-size: 28px; font-weight: 800; margin-top: 8px; font-variant-numeric: tabular-nums; }
    .diff-card {
      border-radius: 12px;
      padding: 20px 24px;
      border: 1px solid ${isBalanced ? '#86efac' : '#fca5a5'};
      background: ${isBalanced ? '#f0fdf4' : '#fef2f2'};
    }
    .diff-card label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: ${isBalanced ? '#15803d' : '#b91c1c'}; font-weight: 700; }
    .diff-card .val { font-size: 28px; font-weight: 800; margin-top: 8px; color: ${isBalanced ? '#15803d' : '#b91c1c'}; }

    /* ── Tables ── */
    .table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead { background: #f1f5f9; }
    th { text-align: left; padding: 10px 14px; font-size: 11px; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e1; white-space: nowrap; }
    td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .amt { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; }
    .desc { max-width: 280px; }
    .note { font-size: 12px; color: #64748b; }

    /* ── Badges ── */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .badge-verified, .badge-matched  { background: #dcfce7; color: #166534; }
    .badge-adjusted { background: #dbeafe; color: #1e40af; }
    .badge-ignored  { background: #f1f5f9; color: #64748b; }
    .badge-pending  { background: #fef9c3; color: #854d0e; }

    /* ── Breakdown table ── */
    .breakdown { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
    .breakdown-cell { background: #f8fafc; padding: 14px 20px; }
    .breakdown-cell label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .breakdown-cell .bval { font-size: 18px; font-weight: 800; margin-top: 6px; }

    /* ── Sign-off ── */
    .cert-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 24px;
      margin: 20px 0 36px;
      font-size: 14px;
      line-height: 1.7;
      color: #334155;
    }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    @media (max-width: 600px) { .sig-grid { grid-template-columns: 1fr; } }
    .sig-block { border-top: 1.5px solid #0f172a; padding-top: 8px; margin-top: 48px; }
    .sig-block .sig-label { font-size: 12px; font-weight: 700; color: #0f172a; }
    .sig-block .sig-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
    .sig-block .sig-name-line, .sig-block .sig-date-line { border-bottom: 1px solid #cbd5e1; margin-top: 32px; margin-bottom: 4px; }
    .sig-block .sig-hint { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }

    /* ── Notes box ── */
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px 20px;
      font-size: 13px;
      color: #78350f;
      margin: 16px 0;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 60px;
      padding: 20px 60px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ── Print ── */
    @media print {
      body { font-size: 12px; }
      .cover { -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-after: always; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
      .content { padding: 24px 40px; }
    }
  </style>
</head>
<body>

  <!-- COVER -->
  <div class="cover">
    <div class="cover-logo">PaperWorking</div>
    <div class="cover-sub">Real Estate Portfolio Intelligence</div>
    <div class="cover-title">Bank Reconciliation Report</div>
    <div class="cover-project">${data.projectName}</div>
    <div class="cover-address">${data.address || ''}</div>

    <div class="cover-meta">
      <div class="cover-meta-item">
        <label>Reporting Period</label>
        <span>${monthLabel}</span>
      </div>
      <div class="cover-meta-item">
        <label>Reconciliation Status</label>
        <span>${data.status.replace(/_/g, ' ')}</span>
      </div>
      <div class="cover-meta-item">
        <label>Reconciled By</label>
        <span>${data.reconcilerName || data.reconciledBy || 'Pending'}</span>
      </div>
      <div class="cover-meta-item">
        <label>Reconciliation Date</label>
        <span>${data.reconciledAt ? fmtDate(data.reconciledAt) : '—'}</span>
      </div>
      <div class="cover-meta-item">
        <label>Report Generated</label>
        <span>${fmtDate(data.generatedAt)}</span>
      </div>
      <div class="cover-meta-item diff">
        <label>Net Variance</label>
        <span>$${fmt(data.difference)}</span>
      </div>
    </div>

    <div class="status-badge-cover">
      ${isBalanced ? '✓  RECONCILED — Balance Confirmed' : '⚠  DISCREPANCY FOUND'}
    </div>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <!-- SECTION 2: BALANCE SUMMARY -->
    <h2 class="section-title" style="margin-top: 40px;">Balance Summary</h2>

    <div class="balance-grid" style="margin-top: 20px;">
      <div class="balance-card">
        <label>Bank Statement Ending Balance</label>
        <div class="val">$${fmt(data.bankStatementBalance)}</div>
      </div>
      <div class="balance-card">
        <label>PaperWorking Calculated Balance</label>
        <div class="val">$${fmt(data.paperWorkingBalance)}</div>
      </div>
    </div>
    <div class="diff-card">
      <label>Net Variance / Difference ${isBalanced ? '✓' : '⚠'}</label>
      <div class="val">$${fmt(data.difference)}</div>
    </div>

    <div class="section-sub">Deposit &amp; Withdrawal Breakdown</div>
    <div class="breakdown">
      <div class="breakdown-cell">
        <label>Total Deposits — Bank</label>
        <div class="bval">$${fmt(data.totalBankDeposits)}</div>
      </div>
      <div class="breakdown-cell">
        <label>Total Deposits — PaperWorking</label>
        <div class="bval">$${fmt(data.totalPWDeposits)}</div>
      </div>
      <div class="breakdown-cell">
        <label>Deposit Variance</label>
        <div class="bval" style="color:${Math.abs(data.totalBankDeposits - data.totalPWDeposits) < 0.01 ? '#15803d' : '#b91c1c'}">
          $${fmt(Math.abs(data.totalBankDeposits - data.totalPWDeposits))}
        </div>
      </div>
      <div class="breakdown-cell">
        <label>Total Withdrawals — Bank</label>
        <div class="bval">$${fmt(data.totalBankWithdrawals)}</div>
      </div>
      <div class="breakdown-cell">
        <label>Total Withdrawals — PaperWorking</label>
        <div class="bval">$${fmt(data.totalPWWithdrawals)}</div>
      </div>
      <div class="breakdown-cell">
        <label>Withdrawal Variance</label>
        <div class="bval" style="color:${Math.abs(data.totalBankWithdrawals - data.totalPWWithdrawals) < 0.01 ? '#15803d' : '#b91c1c'}">
          $${fmt(Math.abs(data.totalBankWithdrawals - data.totalPWWithdrawals))}
        </div>
      </div>
    </div>

    <!-- SECTION 3: MATCHED TRANSACTIONS -->
    <h2 class="section-title page-break" style="margin-top: 48px;">Matched Transactions</h2>
    ${data.matchedItems.length === 0
      ? `<p style="color:#64748b;margin-top:12px;">No matched transactions for this period.</p>`
      : `
    <div class="table-wrap" style="margin-top: 16px;">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th class="amt">Bank Amount</th>
            <th class="amt">PaperWorking</th>
            <th>Status</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${data.matchedItems.map(itemRowHTML).join('')}
        </tbody>
      </table>
    </div>`}

    <!-- SECTION 4: ADJUSTMENTS -->
    <h2 class="section-title page-break" style="margin-top: 48px;">Adjustments &amp; Discrepancies</h2>

    <div class="section-sub">Adjusted Items</div>
    ${data.adjustedItems.length === 0
      ? `<p style="color:#64748b;">No adjustments were made for this period.</p>`
      : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Description</th><th class="amt">Bank Amt</th><th class="amt">PW Amt</th><th>Status</th><th>Notes</th></tr>
        </thead>
        <tbody>${data.adjustedItems.map(itemRowHTML).join('')}</tbody>
      </table>
    </div>`}

    <div class="section-sub">Ignored Items</div>
    ${data.ignoredItems.length === 0
      ? `<p style="color:#64748b;">No items were ignored for this period.</p>`
      : `
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>Date</th><th>Description</th><th class="amt">PW Amount</th><th>Status</th><th>Reason</th></tr>
        </thead>
        <tbody>${data.ignoredItems.map((item) => `
          <tr>
            <td>${fmtDate(item.date)}</td>
            <td class="desc">${item.description}</td>
            <td class="amt">${item.paperWorkingAmount !== null ? `$${fmt(item.paperWorkingAmount)}` : '—'}</td>
            <td><span class="badge badge-ignored">IGNORED</span></td>
            <td class="note">${item.notes || 'Not on bank statement'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}

    ${data.notes ? `
    <div class="section-sub">Reconciliation Notes</div>
    <div class="notes-box">${data.notes}</div>` : ''}

    <!-- SECTION 5: SIGN-OFF -->
    <h2 class="section-title page-break" style="margin-top: 48px;">Certification &amp; Sign-Off</h2>

    <div class="cert-box">
      I certify that the above reconciliation accurately reflects the financial activity for
      <strong>${data.projectName}</strong> for <strong>${monthLabel}</strong>.
      All transactions have been reviewed and accounted for in accordance with generally accepted
      accounting principles.
    </div>

    <div class="sig-grid">
      <div class="sig-block">
        <div class="sig-name-line"></div>
        <div class="sig-hint">Signature</div>
        <div class="sig-label" style="margin-top:16px;">Prepared By</div>
        <div class="sig-sub">Investor / Property Manager</div>
        <div class="sig-date-line"></div>
        <div class="sig-hint">Printed Name</div>
        <div class="sig-date-line" style="width:50%"></div>
        <div class="sig-hint">Date</div>
      </div>
      <div class="sig-block">
        <div class="sig-name-line"></div>
        <div class="sig-hint">Signature</div>
        <div class="sig-label" style="margin-top:16px;">Reviewed By</div>
        <div class="sig-sub">CPA / Accountant</div>
        <div class="sig-date-line"></div>
        <div class="sig-hint">Printed Name</div>
        <div class="sig-date-line" style="width:50%"></div>
        <div class="sig-hint">Date</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div>PaperWorking · Bank Reconciliation Report · ${monthLabel}</div>
    <div>Generated ${fmtDate(data.generatedAt)}</div>
  </div>

</body>
</html>`;
}
