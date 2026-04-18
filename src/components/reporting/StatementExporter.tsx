'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Statement Exporter — PDF & CSV Export Toolbar
   ─────────────────────────────────────────────────────
   Generates professional exports of P&L, Cash Flow,
   and Balance Sheet data. CPA-ready formatting.
   ═══════════════════════════════════════════════════════ */

type StatementType = 'pl' | 'cashflow' | 'balance';

function fmt(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function StatementExporter({ activeStatement }: { activeStatement: StatementType }) {
  const projects = useProjectStore(s => s.projects);
  const currentProject = useProjectStore(s => s.currentProject);
  const [generating, setGenerating] = useState<'pdf' | 'csv' | null>(null);

  const dateStr = new Date().toISOString().split('T')[0];

  // ─── Data Extraction (mirrors the calculation in each statement) ───
  const extractPLData = () => {
    const targetDeals = currentProject ? [currentProject] : projects;
    let revenue = 0, purchaseCost = 0, rehabCosts = 0, acquisitionCosts = 0,
        financingCosts = 0, holdingCosts = 0, exitCosts = 0;

    targetDeals.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;
      const salePrice = fin.actualSalePrice || fin.estimatedARV || 0;
      revenue += salePrice;
      purchaseCost += fin.purchasePrice || 0;
      rehabCosts += (fin.costs?.filter(c => c.approved) || []).reduce((s, c) => s + c.amount, 0);
      if (deal.costBasisLedger) {
        const cb = deal.costBasisLedger;
        acquisitionCosts += [...(cb.directAcquisition || []), ...(cb.preClosing || [])].reduce((s, i) => s + i.amount, 0);
        financingCosts += (cb.financing || []).reduce((s, i) => s + i.amount, 0);
      }
      if (deal.holdingCosts) {
        holdingCosts += deal.holdingCosts.reduce((s, h) => s + h.monthlyAmount * h.monthsPaid, 0);
      }
      const loanAmount = fin.loanAmount || (fin.purchasePrice || 0);
      const interestRate = (fin.loanInterestRate || 0) / 100;
      const holdDays = fin.estimatedTimelineDays || 90;
      financingCosts += loanAmount * interestRate * (holdDays / 365);
      if (deal.exitCosts) {
        deal.exitCosts.forEach(ec => {
          exitCosts += ec.isPercentage && ec.percentageRate ? (ec.percentageRate / 100) * salePrice : ec.amount;
        });
      }
      exitCosts += salePrice * ((fin.buyersAgentCommission || 0) / 100);
      exitCosts += salePrice * ((fin.sellersAgentCommission || 0) / 100);
      exitCosts += fin.finalClosingCosts || 0;
    });

    const cogs = purchaseCost + rehabCosts + acquisitionCosts;
    const grossProfit = revenue - cogs;
    const totalOpex = holdingCosts + financingCosts + exitCosts;
    const netProfit = grossProfit - totalOpex;

    return [
      ['Revenue', ''],
      ['Sale Proceeds (Actual or Projected ARV)', fmt(revenue)],
      ['Total Revenue', fmt(revenue)],
      ['', ''],
      ['Cost of Goods Sold', ''],
      ['Purchase Price', fmt(purchaseCost)],
      ['Rehab & Renovation', fmt(rehabCosts)],
      ['Acquisition & Pre-Closing', fmt(acquisitionCosts)],
      ['Total COGS', fmt(cogs)],
      ['', ''],
      ['GROSS PROFIT', fmt(grossProfit)],
      ['', ''],
      ['Operating Expenses', ''],
      ['Holding Costs', fmt(holdingCosts)],
      ['Financing Costs', fmt(financingCosts)],
      ['Exit Costs', fmt(exitCosts)],
      ['Total Operating Expenses', fmt(totalOpex)],
      ['', ''],
      ['NET PROFIT / (LOSS)', fmt(netProfit)],
    ];
  };

  const extractBalanceData = () => {
    let propertyInventory = 0, cashFromSales = 0, hardMoneyDebt = 0, privateLenderEquity = 0;
    projects.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;
      if (deal.status === 'Sold') {
        const sp = fin.actualSalePrice || 0;
        cashFromSales += sp - sp * ((fin.buyersAgentCommission || 0) + (fin.sellersAgentCommission || 0)) / 100 - (fin.finalClosingCosts || 0);
      } else {
        propertyInventory += (fin.purchasePrice || 0) + (fin.costs?.filter(c => c.approved).reduce((s, c) => s + c.amount, 0) || 0);
        hardMoneyDebt += fin.loanAmount || 0;
      }
      deal.fractionalInvestors?.forEach(inv => { if (inv.status === 'confirmed') privateLenderEquity += inv.contributionAmount; });
    });
    const totalAssets = propertyInventory + cashFromSales;
    const totalLiabilities = hardMoneyDebt + privateLenderEquity;

    return [
      ['ASSETS', ''],
      ['Property Inventory (Book Value)', fmt(propertyInventory)],
      ['Cash from Sales', fmt(cashFromSales)],
      ['Total Assets', fmt(totalAssets)],
      ['', ''],
      ['LIABILITIES', ''],
      ['Hard Money / Construction Loans', fmt(hardMoneyDebt)],
      ['Private Investor Equity', fmt(privateLenderEquity)],
      ['Total Liabilities', fmt(totalLiabilities)],
      ['', ''],
      ["OWNER'S EQUITY", fmt(totalAssets - totalLiabilities)],
    ];
  };

  const extractCashFlowData = () => {
    const getMonthKey = (d: Date | string) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
    const buckets: Record<string, { inflows: number; outflows: number }> = {};
    const ensure = (k: string) => { if (!buckets[k]) buckets[k] = { inflows: 0, outflows: 0 }; };

    projects.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;
      if (deal.createdAt) { const k = getMonthKey(deal.createdAt); ensure(k); buckets[k].outflows += fin.purchasePrice || 0; }
      fin.costs?.forEach(c => { if (c.approved && c.createdAt) { const k = getMonthKey(c.createdAt); ensure(k); buckets[k].outflows += c.amount; } });
      if (deal.status === 'Sold' && fin.actualSalePrice && fin.soldDate) { const k = getMonthKey(fin.soldDate); ensure(k); buckets[k].inflows += fin.actualSalePrice; }
    });

    const sorted = Object.keys(buckets).sort();
    let cum = 0;
    const rows: string[][] = [['Month', 'Inflows', 'Outflows', 'Net Cash', 'Cumulative']];
    sorted.forEach(k => {
      const b = buckets[k];
      const net = b.inflows - b.outflows;
      cum += net;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const [y, m] = k.split('-');
      rows.push([`${months[parseInt(m)-1]} ${y}`, fmt(b.inflows), fmt(b.outflows), fmt(net), fmt(cum)]);
    });
    return rows;
  };

  // ─── PDF Generation ──────────────────────────────────
  const generatePdf = () => {
    setGenerating('pdf');
    toast.loading('Generating PDF...', { id: 'stmt-pdf' });

    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const title = activeStatement === 'pl' ? 'Profit & Loss Statement' :
                     activeStatement === 'cashflow' ? 'Cash Flow Statement' : 'Balance Sheet';

        // Header
        doc.setFontSize(20);
        doc.setTextColor(33, 33, 33);
        doc.text(title, 14, 20);
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Generated by PaperWorking · ${new Date().toLocaleDateString()}`, 14, 27);
        doc.setDrawColor(33, 33, 33);
        doc.setLineWidth(0.5);
        doc.line(14, 30, 196, 30);

        if (activeStatement === 'pl') {
          const data = extractPLData();
          autoTable(doc, {
            startY: 35,
            head: [['Account', 'Amount']],
            body: data,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 8 },
            columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right', fontStyle: 'normal' } },
            didParseCell: (hookData) => {
              const text = hookData.cell.raw as string;
              if (text && ['Revenue', 'Cost of Goods Sold', 'GROSS PROFIT', 'Operating Expenses', 'NET PROFIT / (LOSS)', 'Total Revenue', 'Total COGS', 'Total Operating Expenses'].includes(text)) {
                hookData.cell.styles.fontStyle = 'bold';
                if (text.includes('GROSS') || text.includes('NET')) {
                  hookData.cell.styles.fillColor = [245, 245, 245];
                }
              }
            },
          });
        } else if (activeStatement === 'balance') {
          const data = extractBalanceData();
          autoTable(doc, {
            startY: 35,
            head: [['Account', 'Amount']],
            body: data,
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [245, 245, 245], textColor: [80, 80, 80], fontStyle: 'bold', fontSize: 8 },
            columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
            didParseCell: (hookData) => {
              const text = hookData.cell.raw as string;
              if (text && ['ASSETS', 'LIABILITIES', "OWNER'S EQUITY", 'Total Assets', 'Total Liabilities'].includes(text)) {
                hookData.cell.styles.fontStyle = 'bold';
                hookData.cell.styles.fillColor = [245, 245, 245];
              }
            },
          });
        } else {
          const data = extractCashFlowData();
          autoTable(doc, {
            startY: 35,
            head: [data[0]],
            body: data.slice(1),
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 8 },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
          });
        }

        const propName = currentProject?.propertyName?.replace(/\s+/g, '_') || 'Portfolio';
        const filename = `PaperWorking_${title.replace(/\s+/g, '_')}_${propName}_${dateStr}.pdf`;
        doc.save(filename);
        toast.success(`Downloaded: ${filename}`, { id: 'stmt-pdf', icon: '📊' });
      } catch (e) {
        console.error(e);
        toast.error('PDF generation failed. Check console.', { id: 'stmt-pdf' });
      } finally {
        setGenerating(null);
      }
    }, 800);
  };

  // ─── CSV Generation ──────────────────────────────────
  const generateCsv = () => {
    setGenerating('csv');
    try {
      let rows: string[][] = [];
      let title = '';

      if (activeStatement === 'pl') {
        title = 'Profit_Loss';
        rows = [['Account', 'Amount'], ...extractPLData()];
      } else if (activeStatement === 'balance') {
        title = 'Balance_Sheet';
        rows = [['Account', 'Amount'], ...extractBalanceData()];
      } else {
        title = 'Cash_Flow';
        rows = extractCashFlowData();
      }

      const csvString = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const propName = currentProject?.propertyName?.replace(/\s+/g, '_') || 'Portfolio';
      link.href = url;
      link.setAttribute('download', `PaperWorking_${title}_${propName}_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`CSV exported successfully!`, { icon: '📋' });
    } catch (e) {
      console.error(e);
      toast.error('CSV export failed.');
    } finally {
      setGenerating(null);
    }
  };

  const labels: Record<StatementType, string> = {
    pl: 'P&L Statement',
    cashflow: 'Cash Flow Statement',
    balance: 'Balance Sheet',
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div>
        <p className="text-sm font-semibold text-gray-900">Export: {labels[activeStatement]}</p>
        <p className="text-xs text-gray-400">CPA-ready formatting with full line-item detail</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={generatePdf}
          disabled={generating !== null}
          className="flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition active:scale-95 disabled:opacity-50"
        >
          {generating === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
          {generating === 'pdf' ? 'Generating...' : 'Download PDF'}
        </button>
        <button
          onClick={generateCsv}
          disabled={generating !== null}
          className="flex items-center gap-1.5 bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 hover:bg-gray-100 transition active:scale-95 disabled:opacity-50"
        >
          {generating === 'csv' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {generating === 'csv' ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>
    </div>
  );
}
