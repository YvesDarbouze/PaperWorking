import { jsPDF } from 'jspdf';
import { ScheduleEPreview } from './scheduleE';
import { ProjectProfitAndLoss } from './profitAndLoss';
import { PortfolioTaxSummary } from './portfolioSummary';

// ── Palette (grayscale, matching our premium design system) ────────
const COLOR = {
  black: [30, 30, 30] as [number, number, number],
  darkGray: [89, 89, 89] as [number, number, number],
  midGray: [127, 127, 127] as [number, number, number],
  lightGray: [220, 220, 220] as [number, number, number],
  offWhite: [248, 249, 250] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  accentRed: [220, 38, 38] as [number, number, number],
};

// NOTE: This module is imported by BOTH a server route and a client component
// (phase-4 generates the PDF in the browser). It must therefore stay free of
// Node built-ins (`fs`/`path`) — pulling them into the client bundle breaks the
// production build ("Can't resolve 'fs'"). The header logo is read from disk
// server-side and passed in via the `logoBase64` argument; the browser simply
// omits it and falls back to the text header. See getLogoBase64 in logo.server.ts.

const DISCLAIMER = "DISCLAIMER: This is not tax advice. Review with a licensed tax professional before filing. PaperWorking does not file taxes on your behalf.";

function fmt$(n: number): string {
  const isNeg = n < 0;
  const abs = Math.abs(n);
  const str = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${isNeg ? '-' : ''}$${str}`;
}

interface PageContext {
  doc: jsPDF;
  y: number;
  pageNumber: number;
  maxY: number;
  margin: number;
  contentWidth: number;
}

function initNewPage(ctx: PageContext, title: string, subtitle: string) {
  const { doc, margin, contentWidth } = ctx;
  ctx.doc.addPage();
  ctx.pageNumber += 1;
  ctx.y = margin;

  // Header Banner
  doc.setFillColor(...COLOR.black);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.white);
  doc.text('PAPERWORKING TAX PACK', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text(`${title.toUpperCase()}  ·  ${subtitle.toUpperCase()}`, margin, 17);

  // Footer Disclaimer line
  doc.setPage(ctx.pageNumber);
  doc.setDrawColor(...COLOR.lightGray);
  doc.line(margin, 275, 210 - margin, 275);
  
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(5.5);
  doc.setTextColor(...COLOR.accentRed);
  doc.text(DISCLAIMER, margin, 279);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text(`Page ${ctx.pageNumber}`, 210 - margin, 279, { align: 'right' });

  ctx.y = 38;
}

export function generateScheduleEPdf(
  previews: ScheduleEPreview[],
  aggregated: Omit<ScheduleEPreview, 'projectId' | 'propertyName' | 'physicalAddress' | 'propertyType'>,
  taxYear: number,
  logoBase64: string = ''
): Uint8Array {
  // Standard A4: 210mm x 297mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  const contentWidth = 210 - margin * 2;
  const ctx: PageContext = {
    doc,
    y: 38,
    pageNumber: 1,
    maxY: 265,
    margin,
    contentWidth
  };

  // Setup first page header (which is page 1, created by default)
  doc.setFillColor(...COLOR.black);
  doc.rect(0, 0, 210, 28, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 7, 24.3, 4);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.white);
    doc.text('PAPERWORKING TAX PACK', margin, 11);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text(`SCHEDULE E (FORM 1040) PREVIEW  ·  TAX YEAR ${taxYear}`, margin, 17);

  // Footer on page 1
  doc.setDrawColor(...COLOR.lightGray);
  doc.line(margin, 275, 210 - margin, 275);
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(5.5);
  doc.setTextColor(...COLOR.accentRed);
  doc.text(DISCLAIMER, margin, 279);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text('Page 1', 210 - margin, 279, { align: 'right' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR.black);
  doc.text(`Schedule E Form 1040 Previews`, margin, ctx.y);
  ctx.y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.darkGray);
  doc.text(`Portfolio Aggregation & Individual Property Breakdown for Tax Year ${taxYear}`, margin, ctx.y);
  ctx.y += 10;

  // Let's render the list of properties first
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.black);
  doc.text('Properties Included in this Return:', margin, ctx.y);
  ctx.y += 5;

  previews.forEach((p, idx) => {
    if (ctx.y > ctx.maxY) {
      initNewPage(ctx, `Schedule E Preview`, `Tax Year ${taxYear}`);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR.black);
    const typeLabel = p.propertyType === 1 ? 'Single-Family' : p.propertyType === 2 ? 'Multi-Family' : p.propertyType === 3 ? 'Short-Term / Vacation' : p.propertyType === 4 ? 'Commercial' : p.propertyType === 5 ? 'Land' : 'Other';
    doc.text(`${String.fromCharCode(65 + idx)}) ${p.propertyName} — ${p.physicalAddress}`, margin + 2, ctx.y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLOR.midGray);
    doc.text(`Type Code: ${p.propertyType} (${typeLabel})  ·  Active Months: ${p.activeMonths}`, margin + 6, ctx.y + 4.5);
    ctx.y += 10;
  });

  ctx.y += 4;

  // Grid Table for Schedule E Fields
  const renderScheduleETable = (
    title: string,
    data: Omit<ScheduleEPreview, 'projectId' | 'propertyName' | 'physicalAddress' | 'propertyType'> & { propertyName?: string }
  ) => {
    if (ctx.y + 110 > ctx.maxY) {
      initNewPage(ctx, `Schedule E Preview`, `Tax Year ${taxYear}`);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.black);
    doc.text(title, margin, ctx.y);
    ctx.y += 5;

    // Draw table border & headers
    doc.setFillColor(...COLOR.black);
    doc.rect(margin, ctx.y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.white);
    doc.text('Schedule E Part I Line Items', margin + 3, ctx.y + 4.2);
    doc.text('Amount (USD)', 210 - margin - 3, ctx.y + 4.2, { align: 'right' });
    ctx.y += 6;

    const rows = [
      { line: '3. Rents received', val: data.grossRents },
      { line: '5. Advertising', val: data.advertising },
      { line: '6. Auto and travel', val: data.autoTravel },
      { line: '7. Cleaning and maintenance', val: data.cleaning },
      { line: '8. Commissions', val: data.commissions },
      { line: '9. Insurance', val: data.insurance },
      { line: '10. Legal and other professional fees', val: data.legalProfessional },
      { line: '11. Management fees', val: data.managementFees },
      { line: '12. Mortgage interest paid to banks, etc.', val: data.mortgageInterest },
      { line: '13. Other interest', val: data.otherInterest },
      { line: '14. Repairs', val: data.repairs },
      { line: '15. Supplies', val: data.supplies },
      { line: '16. Taxes', val: data.taxes },
      { line: '17. Utilities', val: data.utilities },
      { line: '18. Depreciation expense or depletion', val: data.depreciation },
      { line: '19. Other (HOA / misc expenses)', val: data.other },
      { line: 'Total Expenses (Lines 5 through 19)', val: data.totalExpenses, isBold: true },
      { line: 'Net Rental Income / Loss (Line 3 minus Total Expenses)', val: data.netIncome, isBold: true, isNet: true }
    ];

    rows.forEach((row, rIdx) => {
      // Row Background
      if (row.isNet) {
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, ctx.y, contentWidth, 5.5, 'F');
      } else if (rIdx % 2 === 1) {
        doc.setFillColor(...COLOR.offWhite);
        doc.rect(margin, ctx.y, contentWidth, 5.5, 'F');
      }

      // Draw grid line
      doc.setDrawColor(...COLOR.lightGray);
      doc.setLineWidth(0.15);
      doc.line(margin, ctx.y + 5.5, 210 - margin, ctx.y + 5.5);

      // Text
      doc.setFont('helvetica', row.isBold ? 'bold' : 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...(row.isNet ? (row.val >= 0 ? [16, 120, 70] : [180, 20, 20]) : COLOR.black) as [number, number, number]);
      doc.text(row.line, margin + 3, ctx.y + 4);
      doc.text(fmt$(row.val), 210 - margin - 3, ctx.y + 4, { align: 'right' });

      ctx.y += 5.5;
    });

    ctx.y += 8;
  };

  // Render Aggregated Summary
  renderScheduleETable('Aggregated Portfolio Summary', aggregated);

  // Render individual breakdowns
  previews.forEach((p, idx) => {
    renderScheduleETable(`Property ${String.fromCharCode(65 + idx)} breakdown: ${p.propertyName}`, p);
  });

  return new Uint8Array(doc.output('arraybuffer'));
}

export function generateProfitAndLossPdf(
  plReports: ProjectProfitAndLoss[],
  aggregated: PortfolioTaxSummary | null,
  taxYear: number,
  logoBase64: string = ''
): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 15;
  const contentWidth = 210 - margin * 2;
  const ctx: PageContext = {
    doc,
    y: 38,
    pageNumber: 1,
    maxY: 265,
    margin,
    contentWidth
  };

  // Setup first page header
  doc.setFillColor(...COLOR.black);
  doc.rect(0, 0, 210, 28, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 7, 24.3, 4);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.white);
    doc.text('PAPERWORKING TAX PACK', margin, 11);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text(`PROFIT & LOSS STATEMENTS  ·  TAX YEAR ${taxYear}`, margin, 17);

  // Footer on page 1
  doc.setDrawColor(...COLOR.lightGray);
  doc.line(margin, 275, 210 - margin, 275);
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(5.5);
  doc.setTextColor(...COLOR.accentRed);
  doc.text(DISCLAIMER, margin, 279);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLOR.midGray);
  doc.text('Page 1', 210 - margin, 279, { align: 'right' });

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...COLOR.black);
  doc.text(`Profit & Loss Statements`, margin, ctx.y);
  ctx.y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR.darkGray);
  doc.text(`Performance & Tax Summary Statement for Tax Year ${taxYear}`, margin, ctx.y);
  ctx.y += 10;

  const renderPLTable = (
    title: string,
    data: ProjectProfitAndLoss | PortfolioTaxSummary,
    isAggregated: boolean
  ) => {
    if (ctx.y + 130 > ctx.maxY) {
      initNewPage(ctx, `Profit & Loss Statements`, `Tax Year ${taxYear}`);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLOR.black);
    doc.text(title, margin, ctx.y);
    ctx.y += 5;

    // Table Header
    doc.setFillColor(...COLOR.black);
    doc.rect(margin, ctx.y, contentWidth, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR.white);
    doc.text('Financial Metric Line Items', margin + 3, ctx.y + 4.2);
    doc.text('Amount (USD)', 210 - margin - 3, ctx.y + 4.2, { align: 'right' });
    ctx.y += 6;

    const rows = [
      // Operating Revenue
      { type: 'header', label: 'OPERATING INCOME' },
      { type: 'item', label: 'Rental Revenue', val: data.rentalIncome },
      { type: 'item', label: 'Other Operating Income', val: data.otherIncome },
      { type: 'subtotal', label: 'Gross Operating Revenue', val: data.grossRevenue },

      // Operating Expenses
      { type: 'header', label: 'OPERATING EXPENSES' },
      { type: 'item', label: 'Property Taxes', val: data.propertyTaxes },
      { type: 'item', label: 'Property Insurance', val: data.insurance },
      { type: 'item', label: 'Utilities', val: data.utilities },
      { type: 'item', label: 'Management Fees', val: data.managementFees },
      { type: 'item', label: 'Repairs & Maintenance', val: data.repairsMaintenance },
      { type: 'item', label: 'HOA Fees', val: data.hoaFees },
      { type: 'item', label: 'Other Operating Expenses', val: data.otherExpenses },
      { type: 'subtotal', label: 'Total Operating Expenses', val: data.totalOperatingExpenses },

      // NOI
      { type: 'total', label: 'NET OPERATING INCOME (NOI)', val: data.netOperatingIncome },

      // Non-operating / Capital / Deductions
      { type: 'header', label: 'TAX DEDUCTIONS & CAPITAL FLOWS' },
      { type: 'item', label: 'Mortgage Interest paid', val: data.mortgageInterest },
      { type: 'item', label: 'Mortgage Principal paid', val: data.mortgagePrincipal },
      { type: 'item', label: 'Capitalized Rehab Improvements', val: data.capitalizedImprovements },
      { type: 'item', label: 'Depreciation Expense', val: data.depreciation },

      // Result Metrics
      { type: 'total', label: 'NET TAXABLE INCOME / RESULT', val: data.netTaxableIncome, highlight: true },
      { type: 'total', label: 'NET CASH FLOW', val: data.netCashFlow, highlight: true }
    ];

    // If single property exit details are relevant
    if (!isAggregated) {
      const single = data as ProjectProfitAndLoss;
      if (single.isSold) {
        rows.push(
          { type: 'header', label: 'PROPERTY EXIT / CAPITAL GAIN' },
          { type: 'item', label: 'Gross Sale Price', val: single.salePrice },
          { type: 'item', label: 'Selling Costs & Fees', val: single.sellingCosts },
          { type: 'subtotal', label: 'Net Sale Proceeds', val: single.netProceeds },
          { type: 'total', label: 'REALIZED CAPITAL GAIN / LOSS', val: single.realizedGainLoss, highlight: true }
        );
      }
    } else {
      const portfolio = data as PortfolioTaxSummary;
      if (portfolio.propertiesSold > 0) {
        rows.push(
          { type: 'header', label: 'PORTFOLIO EXIT / CAPITAL GAINS' },
          { type: 'item', label: 'Total Sales Price', val: portfolio.totalSalePrice },
          { type: 'item', label: 'Total Selling Costs', val: portfolio.totalSellingCosts },
          { type: 'subtotal', label: 'Total Net Sale Proceeds', val: portfolio.totalNetProceeds },
          { type: 'total', label: 'TOTAL REALIZED GAIN / LOSS', val: portfolio.totalRealizedGainLoss, highlight: true }
        );
      }
    }

    rows.forEach((row) => {
      if (row.type === 'header') {
        doc.setFillColor(235, 238, 240);
        doc.rect(margin, ctx.y, contentWidth, 4.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(...COLOR.darkGray);
        doc.text(row.label, margin + 3, ctx.y + 3.2);
        ctx.y += 4.5;
        return;
      }

      // Draw grid line
      doc.setDrawColor(...COLOR.lightGray);
      doc.setLineWidth(0.1);
      doc.line(margin, ctx.y + 5, 210 - margin, ctx.y + 5);

      const isSub = row.type === 'subtotal';
      const isTot = row.type === 'total';
      const isHighlight = isTot || isSub;

      doc.setFont('helvetica', isHighlight ? 'bold' : 'normal');
      doc.setFontSize(isHighlight ? 7.5 : 7);
      
      let textColor = COLOR.black;
      if (row.highlight) {
        textColor = (row.val ?? 0) >= 0 ? [16, 120, 70] : [180, 20, 20];
      }
      doc.setTextColor(...textColor);

      doc.text(row.label, isHighlight ? margin + 3 : margin + 6, ctx.y + 3.8);
      doc.text(fmt$(row.val ?? 0), 210 - margin - 3, ctx.y + 3.8, { align: 'right' });

      ctx.y += 5;
    });

    ctx.y += 8;
  };

  // Render Aggregated Summary if present
  if (aggregated && plReports.length > 1) {
    renderPLTable('Aggregated Portfolio Profit & Loss', aggregated, true);
  }

  // Render individual breakdowns
  plReports.forEach((report) => {
    renderPLTable(`Profit & Loss Statement: ${report.propertyName}`, report, false);
  });

  return new Uint8Array(doc.output('arraybuffer'));
}
