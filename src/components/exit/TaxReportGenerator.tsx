'use client';

import React, { useMemo, useCallback } from 'react';
import { Project, TaxEstimate } from '@/types/schema';
import { computeCapitalGainsTax } from '@/lib/math/calculatorUtils';
import { FileText, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Tax Report Generator — PDF-Ready Capital Gains Summary
   
   Renders a printable tax report and provides browser-
   based PDF download via window.print() isolation.
   ═══════════════════════════════════════════════════════ */

interface TaxReportGeneratorProps {
  deal: Project;
}

export default function TaxReportGenerator({ deal }: TaxReportGeneratorProps) {
  const tax = useMemo(() => computeCapitalGainsTax(deal), [deal]);
  const salePrice = deal.financials?.actualSalePrice || deal.financials?.estimatedARV || 0;

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleDownloadPDF = useCallback(() => {
    // Open a print window with the report content
    const reportContent = generateReportHTML(deal, tax, salePrice);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    } else {
      toast.error('Popup blocked. Allow popups to generate the report.');
    }
  }, [deal, tax, salePrice]);

  const handleCopyText = useCallback(() => {
    const text = generateReportText(deal, tax, salePrice);
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Tax summary copied to clipboard', {
        style: { background: 'black', color: 'white', border: '1px solid #333' },
      });
    });
  }, [deal, tax, salePrice]);

  return (
    <div className="bg-bg-surface border border-border-accent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-accent">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-pw-accent" />
          <h3 className="text-xs font-black tracking-[0.3em] text-text-primary uppercase">
            Tax_Report_Generator
          </h3>
        </div>
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
          Schedule D / Form 8949
        </span>
      </div>

      {/* Preview */}
      <div className="px-6 py-6 space-y-4 bg-bg-primary">
        <div className="bg-bg-surface border border-border-accent p-5 space-y-3">
          <div className="pb-3 border-b border-border-accent">
            <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
              Property: {deal.propertyName || 'Untitled'}
            </p>
            <p className="text-[9px] text-text-secondary">
              Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Summary Table */}
          <div className="space-y-2 text-xs">
            <Row label="Sale Price" value={fmt(salePrice)} />
            <Row label="Cost Basis" value={fmt(tax.costBasis)} />
            <Row label="Sell-Side Costs" value={fmt(salePrice - tax.netProceeds)} />
            <Row label="Net Proceeds" value={fmt(tax.netProceeds)} bold />
            <div className="border-t border-border-accent my-2" />
            <Row label="Capital Gain / (Loss)" value={fmt(tax.capitalGain)} highlight={tax.capitalGain >= 0} />
            <Row label="Holding Period" value={`${tax.holdingPeriodDays} days (${tax.isLongTerm ? 'Long-Term' : 'Short-Term'})`} />
            <Row label="Estimated Tax Rate" value={`${tax.estimatedTaxRate}%`} />
            <Row label="Estimated Tax Liability" value={fmt(tax.estimatedTaxLiability)} negative />
            <div className="border-t-2 border-pw-black my-2" />
            <Row label="Net After Tax" value={fmt(tax.netAfterTax)} bold highlight={tax.netAfterTax >= 0} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-4 border-t border-border-accent flex gap-3">
        <button
          onClick={handleDownloadPDF}
          className="flex-1 flex items-center justify-center gap-2 bg-pw-black text-pw-white font-black text-[10px] py-3 uppercase tracking-[0.3em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black"
        >
          <Printer className="w-3.5 h-3.5" /> Print_Report
        </button>
        <button
          onClick={handleCopyText}
          className="flex-1 flex items-center justify-center gap-2 bg-bg-primary text-text-primary font-black text-[10px] py-3 uppercase tracking-[0.3em] hover:bg-pw-accent hover:text-pw-white transition-all active:scale-95 border border-border-accent"
        >
          <Download className="w-3.5 h-3.5" /> Copy_Text
        </button>
      </div>
    </div>
  );
}

// ─── Helper: Summary Row ──────────────────────────────
function Row({
  label,
  value,
  bold,
  highlight,
  negative,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-text-secondary ${bold ? 'font-black text-text-primary' : 'font-bold'}`}>
        {label}
      </span>
      <span
        className={`font-mono ${bold ? 'font-black text-sm' : 'font-bold'} ${
          highlight !== undefined
            ? highlight
              ? 'text-green-700'
              : 'text-red-700'
            : negative
            ? 'text-red-600'
            : 'text-text-primary'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Helper: Generate Print HTML ──────────────────────
function generateReportHTML(deal: Project, tax: TaxEstimate, salePrice: number): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Capital Gains Tax Report — ${deal.propertyName || 'Property'}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; color: #111; padding: 40px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 18px; text-transform: uppercase; letter-spacing: 6px; margin-bottom: 4px; }
        .subtitle { font-size: 10px; color: #666; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 24px; }
        .meta { font-size: 10px; color: #999; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th, td { text-align: left; padding: 8px 4px; font-size: 12px; }
        th { border-bottom: 2px solid #111; font-weight: 900; text-transform: uppercase; font-size: 10px; letter-spacing: 2px; color: #666; }
        td { border-bottom: 1px solid #eee; }
        .right { text-align: right; }
        .bold { font-weight: 900; }
        .total-row td { border-top: 2px solid #111; border-bottom: none; font-weight: 900; font-size: 14px; }
        .profit { color: #15803d; }
        .loss { color: #b91c1c; }
        .disclaimer { font-size: 9px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <h1>PaperWorking</h1>
      <p class="subtitle">Capital Gains Tax Estimate</p>
      <p class="meta">Property: ${deal.propertyName || 'N/A'} &bull; Generated: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead><tr><th>Description</th><th class="right">Amount</th></tr></thead>
        <tbody>
          <tr><td>Sale Price</td><td class="right">${fmt(salePrice)}</td></tr>
          <tr><td>Cost Basis (Purchase + Rehab + Acquisition + Holding)</td><td class="right">${fmt(tax.costBasis)}</td></tr>
          <tr><td>Sell-Side Costs</td><td class="right">${fmt(salePrice - tax.netProceeds)}</td></tr>
          <tr><td class="bold">Net Proceeds</td><td class="right bold">${fmt(tax.netProceeds)}</td></tr>
          <tr><td>Capital Gain / (Loss)</td><td class="right ${tax.capitalGain >= 0 ? 'profit' : 'loss'}">${fmt(tax.capitalGain)}</td></tr>
          <tr><td>Holding Period</td><td class="right">${tax.holdingPeriodDays} days (${tax.isLongTerm ? 'Long-Term' : 'Short-Term'})</td></tr>
          <tr><td>Estimated Tax Rate</td><td class="right">${tax.estimatedTaxRate}%</td></tr>
          <tr><td>Estimated Tax Liability</td><td class="right loss">${fmt(tax.estimatedTaxLiability)}</td></tr>
          <tr class="total-row"><td>NET AFTER TAX</td><td class="right ${tax.netAfterTax >= 0 ? 'profit' : 'loss'}">${fmt(tax.netAfterTax)}</td></tr>
        </tbody>
      </table>
      <p class="disclaimer">This is an estimate for informational purposes only. It does not constitute tax advice. Consult a CPA or tax professional for accurate tax filings. Does not account for 1031 exchanges, depreciation recapture, state/local taxes, or AMT.</p>
    </body>
    </html>
  `;
}

// ─── Helper: Generate Plaintext Report ────────────────
function generateReportText(deal: Project, tax: TaxEstimate, salePrice: number): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return [
    `PAPERWORKING — Capital Gains Tax Estimate`,
    `Property: ${deal.propertyName || 'N/A'}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    `──────────────────────────────────────────`,
    `Sale Price:              ${fmt(salePrice)}`,
    `Cost Basis:              ${fmt(tax.costBasis)}`,
    `Sell-Side Costs:         ${fmt(salePrice - tax.netProceeds)}`,
    `Net Proceeds:            ${fmt(tax.netProceeds)}`,
    `──────────────────────────────────────────`,
    `Capital Gain / (Loss):   ${fmt(tax.capitalGain)}`,
    `Holding Period:          ${tax.holdingPeriodDays} days (${tax.isLongTerm ? 'Long-Term' : 'Short-Term'})`,
    `Estimated Tax Rate:      ${tax.estimatedTaxRate}%`,
    `Tax Liability:           ${fmt(tax.estimatedTaxLiability)}`,
    `──────────────────────────────────────────`,
    `NET AFTER TAX:           ${fmt(tax.netAfterTax)}`,
    ``,
    `⚠ Estimate only. Consult a CPA.`,
  ].join('\n');
}
