'use client';

import React, { useMemo, useCallback } from 'react';
import { Project, TaxEstimate, LedgerItem } from '@/types/schema';
import { computeCapitalGainsTax } from '@/lib/math/calculatorUtils';
import { FileText, Download, Printer, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  const ledgerItems = useProjectStore(state => state.ledgerItems[deal.id] || []);
  const approvedItems = useMemo(() => {
    return ledgerItems
      .filter((item) => item.status === 'Approved')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [ledgerItems]);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleDownloadPDF = useCallback(() => {
    generateItemizedPDF(deal, tax, salePrice, approvedItems);
    toast.success('Itemized PDF downloaded');
  }, [deal, tax, salePrice, approvedItems]);

  const handleDownloadCSV = useCallback(() => {
    const csvContent = generateItemizedCSV(approvedItems);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${deal.propertyName || 'Property'}_Tax_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV downloaded');
  }, [deal, approvedItems]);

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
      <div className="px-6 py-4 border-t border-border-accent flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleDownloadPDF}
          className="flex-1 flex items-center justify-center gap-2 bg-pw-black text-pw-white font-black text-[10px] py-3 uppercase tracking-[0.3em] hover:bg-pw-accent transition-all active:scale-95 border border-pw-black"
        >
          <Printer className="w-3.5 h-3.5" /> Export_PDF
        </button>
        <button
          onClick={handleDownloadCSV}
          className="flex-1 flex items-center justify-center gap-2 bg-bg-surface text-text-primary font-black text-[10px] py-3 uppercase tracking-[0.3em] hover:bg-border-accent transition-all active:scale-95 border border-border-accent"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export_CSV
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

// ─── Helper: Generate Itemized PDF ─────────────────────
function generateItemizedPDF(deal: Project, tax: TaxEstimate, salePrice: number, items: LedgerItem[]) {
  const doc = new jsPDF();
  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PAPERWORKING', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('CAPITAL GAINS TAX ESTIMATE & ITEMIZED LEDGER', 14, 26);
  
  doc.setFontSize(9);
  doc.text(`Property: ${deal.propertyName || 'N/A'}`, 14, 34);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 39);

  // Summary Data for AutoTable
  const summaryData = [
    ['Sale Price', fmt(salePrice)],
    ['Cost Basis (Purchase + Rehab + Acq. + Holding)', fmt(tax.costBasis)],
    ['Sell-Side Costs', fmt(salePrice - tax.netProceeds)],
    ['Net Proceeds', fmt(tax.netProceeds)],
    ['Capital Gain / (Loss)', fmt(tax.capitalGain)],
    ['Holding Period', `${tax.holdingPeriodDays} days (${tax.isLongTerm ? 'Long-Term' : 'Short-Term'})`],
    ['Estimated Tax Rate', `${tax.estimatedTaxRate}%`],
    ['Estimated Tax Liability', fmt(tax.estimatedTaxLiability)],
    ['NET AFTER TAX', fmt(tax.netAfterTax)],
  ];

  autoTable(doc, {
    startY: 45,
    head: [['Summary', 'Amount']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' },
    },
    styles: { fontSize: 9 },
  });

  // Itemized Ledger
  const itemizedData = items.map(item => [
    new Date(item.createdAt).toLocaleDateString(),
    item.type.toUpperCase(),
    item.category,
    item.description,
    fmt(item.amount)
  ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 15,
    head: [['Date', 'Type', 'Category', 'Description', 'Amount']],
    body: itemizedData,
    theme: 'grid',
    headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      4: { halign: 'right' }
    },
    styles: { fontSize: 8 },
    margin: { bottom: 20 },
    didDrawPage: function (data) {
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(150);
      const str = 'Page ' + (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      doc.text('This report is for informational purposes only. Not official tax advice.', data.settings.margin.left, doc.internal.pageSize.height - 15);
    }
  });

  doc.save(`${deal.propertyName || 'Property'}_Tax_Report.pdf`);
}

// ─── Helper: Generate Itemized CSV ─────────────────────
function generateItemizedCSV(items: LedgerItem[]): string {
  const headers = ['Date', 'Type', 'Category', 'Description', 'Status', 'Amount'];
  
  const rows = items.map(item => {
    return [
      new Date(item.createdAt).toLocaleDateString(),
      item.type,
      item.category,
      `"${item.description.replace(/"/g, '""')}"`, // Escape quotes for CSV
      item.status,
      item.amount.toString()
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\\n');
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
