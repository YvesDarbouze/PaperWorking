import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { Project } from '@/types/schema';
import { AutopsyMetrics } from '@/lib/math/calculatorUtils';

// ── Palette (grayscale, matches design system) ──────────────
const COLOR = {
  black:      [30,  30,  30]  as [number, number, number],
  darkGray:   [89,  89,  89]  as [number, number, number],
  midGray:    [127, 127, 127] as [number, number, number],
  lightGray:  [204, 204, 204] as [number, number, number],
  offWhite:   [242, 242, 242] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
  green:      [16,  185, 129] as [number, number, number],
  red:        [239, 68,  68]  as [number, number, number],
  amber:      [245, 158, 11]  as [number, number, number],
};

function fmt$(n: number): string {
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return `${n < 0 ? '-' : ''}$${str}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function variance(est: number, act: number): string {
  if (!est) return '—';
  const diff = act - est;
  return `${diff >= 0 ? '+' : ''}${fmt$(diff)}`;
}

function varianceColor(est: number, act: number, invertPositive = false): [number, number, number] {
  if (!est) return COLOR.midGray;
  const isGood = invertPositive ? act < est : act > est;
  if (act === est) return COLOR.midGray;
  return isGood ? COLOR.green : COLOR.red;
}

export function generateAutopsyPDF(deal: Project, m: AutopsyMetrics): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PAGE_W = 210;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const isSold = deal.status === 'Sold';
  let y = MARGIN;

  // ── Header Banner ─────────────────────────────────────────
  doc.setFillColor(...COLOR.black);
  doc.rect(0, 0, PAGE_W, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLOR.white);
  doc.text('PAPERWORKING', MARGIN, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text('DEAL AUTOPSY REPORT  ·  PHASE 4 EXIT INTELLIGENCE', MARGIN, 16);

  // Lock badge when finalized
  if (isSold) {
    doc.setFillColor(...COLOR.green);
    doc.roundedRect(PAGE_W - MARGIN - 28, 7, 28, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.white);
    doc.text('FINALIZED', PAGE_W - MARGIN - 14, 12.5, { align: 'center' });
  } else {
    doc.setFillColor(...COLOR.amber);
    doc.roundedRect(PAGE_W - MARGIN - 26, 7, 26, 8, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.black);
    doc.text('PROJECTED', PAGE_W - MARGIN - 13, 12.5, { align: 'center' });
  }

  y = 36;

  // ── Deal Identity Block ───────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...COLOR.black);
  doc.text(deal.propertyName, MARGIN, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.midGray);
  doc.text(deal.address || '—', MARGIN, y);

  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated: ${generated}`, PAGE_W - MARGIN, y, { align: 'right' });
  y += 10;

  // ── Section: KPI Hero Row ─────────────────────────────────
  doc.setFillColor(...COLOR.offWhite);
  doc.rect(MARGIN, y, CONTENT_W, 28, 'F');

  const kpis = [
    { label: 'Net Profit',      value: fmt$(m.netProfit),         color: m.netProfit >= 0 ? COLOR.green : COLOR.red },
    { label: 'ROI',             value: fmtPct(m.roi),             color: m.roi >= 25 ? COLOR.green : m.roi >= 15 ? COLOR.amber : COLOR.red },
    { label: 'Cash-on-Cash',    value: fmtPct(m.coc),             color: m.coc >= 25 ? COLOR.green : m.coc >= 15 ? COLOR.amber : COLOR.red },
    { label: 'Profit Margin',   value: fmtPct(m.profitMargin),    color: m.profitMargin >= 20 ? COLOR.green : m.profitMargin >= 10 ? COLOR.amber : COLOR.red },
  ];

  const kpiW = CONTENT_W / 4;
  kpis.forEach((kpi, i) => {
    const kx = MARGIN + i * kpiW + kpiW / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR.midGray);
    doc.text(kpi.label.toUpperCase(), kx, y + 8, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...kpi.color);
    doc.text(kpi.value, kx, y + 18, { align: 'center' });
  });

  y += 34;

  // ── Section: Time Metrics ─────────────────────────────────
  doc.setFillColor(...COLOR.black);
  doc.rect(MARGIN, y, CONTENT_W, 13, 'F');

  const timeItems = [
    { label: 'Days on Market', value: m.dom !== null ? `${m.dom} days` : '—' },
    { label: 'Total Hold Period', value: m.holdDays !== null ? `${m.holdDays} days` : '—' },
    { label: 'Status', value: isSold ? 'SOLD — FINALIZED' : 'PROJECTED' },
  ];

  const timeW = CONTENT_W / 3;
  timeItems.forEach((item, i) => {
    const tx = MARGIN + i * timeW + timeW / 2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.midGray);
    doc.text(item.label.toUpperCase(), tx, y + 5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.white);
    doc.text(item.value, tx, y + 10.5, { align: 'center' });
  });

  y += 19;

  // ── Section: Estimates vs Actuals ─────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.black);
  doc.text('ORIGINAL ESTIMATES  vs.  FINAL ACTUALS', MARGIN, y);
  y += 4;

  const estRows: (string | { content: string; styles: object })[][] = [
    [
      'Purchase Price',
      fmt$(m.purchasePrice),
      fmt$(m.purchasePrice),
      '—',
    ],
    [
      'Rehab Budget',
      m.projectedRehabCost ? fmt$(m.projectedRehabCost) : '—',
      fmt$(m.actualRehabCost),
      m.projectedRehabCost
        ? { content: variance(m.projectedRehabCost, m.actualRehabCost), styles: { textColor: varianceColor(m.projectedRehabCost, m.actualRehabCost, true) } }
        : '—',
    ],
    [
      'After-Repair Value (ARV)',
      fmt$(m.estimatedARV),
      fmt$(m.grossSalePrice),
      { content: variance(m.estimatedARV, m.grossSalePrice), styles: { textColor: varianceColor(m.estimatedARV, m.grossSalePrice) } },
    ],
    [
      'Acquisition Costs',
      '—',
      fmt$(m.acquisitionCosts),
      '—',
    ],
    [
      'Holding Costs',
      '—',
      fmt$(m.holdingCosts),
      '—',
    ],
    [
      'Sell-Side Fees & Commissions',
      '—',
      fmt$(m.sellClosingCosts),
      '—',
    ],
    [
      { content: 'TOTAL COST BASIS', styles: { fontStyle: 'bold' } },
      { content: m.projectedRehabCost ? fmt$(m.purchasePrice + m.projectedRehabCost) : '—', styles: { fontStyle: 'bold' } },
      { content: fmt$(m.totalCostBasis), styles: { fontStyle: 'bold' } },
      {
        content: m.projectedRehabCost ? variance(m.purchasePrice + m.projectedRehabCost, m.totalCostBasis) : '—',
        styles: {
          fontStyle: 'bold',
          textColor: m.projectedRehabCost
            ? varianceColor(m.purchasePrice + m.projectedRehabCost, m.totalCostBasis, true)
            : COLOR.midGray,
        },
      },
    ],
    [
      { content: 'NET PROFIT', styles: { fontStyle: 'bold' } },
      { content: m.projectedRehabCost ? fmt$(m.estimatedARV - m.purchasePrice - m.projectedRehabCost) : '—', styles: { fontStyle: 'bold' } },
      { content: fmt$(m.netProfit), styles: { fontStyle: 'bold', textColor: m.netProfit >= 0 ? COLOR.green : COLOR.red } },
      '—',
    ],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Line Item', 'Estimated', 'Actual', 'Variance']],
    body: estRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineColor: COLOR.lightGray,
      lineWidth: 0.2,
      textColor: COLOR.black,
    },
    headStyles: {
      fillColor: COLOR.black,
      textColor: COLOR.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: COLOR.offWhite },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { halign: 'right', cellWidth: 32 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 26 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Section: Detailed KPI Table ───────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR.black);
  doc.text('CORE PERFORMANCE KPIs', MARGIN, y);
  y += 4;

  const kpiRows = [
    ['Net Profit',             fmt$(m.netProfit),       'Positive = deal succeeded',     m.netProfit >= 0 ? '✓ Positive' : '✗ Loss'],
    ['Return on Investment',   fmtPct(m.roi),           'Target: ≥ 25%',                 m.roi >= 25 ? '✓ Target met' : m.roi >= 15 ? '△ Below target' : '✗ Underperforming'],
    ['Cash-on-Cash Return',    fmtPct(m.coc),           'Net Profit / Out-of-Pocket Cash', m.coc >= 25 ? '✓ Target met' : m.coc >= 15 ? '△ Below target' : '✗ Underperforming'],
    ['Profit Margin',          fmtPct(m.profitMargin),  'Target: ≥ 20%',                 m.profitMargin >= 20 ? '✓ Target met' : m.profitMargin >= 10 ? '△ Below target' : '✗ Underperforming'],
    ['Days on Market (DOM)',   m.dom !== null ? `${m.dom} days` : '—', 'Listing date → Contract accepted', '—'],
    ['Total Hold Period',      m.holdDays !== null ? `${m.holdDays} days` : '—', 'Acquisition → Closed',  '—'],
    ['Out-of-Pocket Cash',     fmt$(m.outOfPocketCash), `Loan: ${fmt$(m.loanAmount)}`,   '—'],
    ['Total Project Cost Basis', fmt$(m.totalCostBasis), 'All costs aggregated',         '—'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metric', 'Value', 'Formula / Note', 'Health']],
    body: kpiRows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineColor: COLOR.lightGray,
      lineWidth: 0.2,
      textColor: COLOR.black,
    },
    headStyles: {
      fillColor: COLOR.black,
      textColor: COLOR.white,
      fontStyle: 'bold',
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: COLOR.offWhite },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 28 },
      2: { cellWidth: 68, textColor: COLOR.midGray, fontSize: 7 },
      3: { cellWidth: 28, fontSize: 7 },
    },
  });

  // ── Footer ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...COLOR.lightGray);
    doc.line(MARGIN, 284, PAGE_W - MARGIN, 284);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR.midGray);
    doc.text('PaperWorking · Confidential Deal Intelligence', MARGIN, 289);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, 289, { align: 'right' });
    if (isSold) {
      doc.text('Values locked at closing — FINALIZED RECORD', PAGE_W / 2, 289, { align: 'center' });
    }
  }

  const slug = deal.propertyName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  doc.save(`${slug}_Autopsy_Report.pdf`);
}
