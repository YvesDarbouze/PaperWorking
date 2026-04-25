'use client';

import React, { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Building, Wallet, Landmark, Scale } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Balance Sheet — Point-in-Time Snapshot
   ─────────────────────────────────────────────────────
   Assets: Property inventory + Cash
   Liabilities: Hard money debt + Private lender equity
   Equity: Assets - Liabilities
   ═══════════════════════════════════════════════════════ */

function formatCurrency(val: number): string {
  const neg = val < 0;
  return `${neg ? '-' : ''}$${Math.abs(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface BSSection {
  label: string;
  amount: number;
  indent?: boolean;
  bold?: boolean;
  highlight?: boolean;
}

export default function BalanceSheet() {
  const projects = useProjectStore(s => s.projects);

  const bs = useMemo(() => {
    // ─── ASSETS ───────────────────────────────────
    let propertyInventory = 0;       // Active projects at value
    let cashFromSales = 0;           // Net proceeds from sold projects
    let totalInvestorContributions = 0;

    // ─── LIABILITIES ─────────────────────────────
    let hardMoneyDebt = 0;          // Outstanding loan balances
    let privateLenderEquity = 0;    // Fractional investor contributions

    const assetDetails: { name: string; value: number; status: string }[] = [];
    const liabilityDetails: { name: string; value: number; type: string }[] = [];

    projects.forEach(deal => {
      const fin = deal.financials;
      if (!fin) return;

      if (deal.status === 'Sold') {
        // Sold projects become cash
        const salePrice = fin.actualSalePrice || 0;
        const buyerComm = salePrice * ((fin.buyersAgentCommission || 0) / 100);
        const sellerComm = salePrice * ((fin.sellersAgentCommission || 0) / 100);
        const basicClosingCosts = fin.finalClosingCosts || 0;
        
        // Include ledger-based exit costs
        let ledgerExitCosts = 0;
        deal.exitCosts?.forEach(ec => {
          if (ec.isPercentage && ec.percentageRate) {
            ledgerExitCosts += (ec.percentageRate / 100) * salePrice;
          } else {
            ledgerExitCosts += ec.amount;
          }
        });

        const netProceeds = salePrice - buyerComm - sellerComm - basicClosingCosts - ledgerExitCosts;
        cashFromSales += netProceeds;
        assetDetails.push({ name: deal.propertyName, value: netProceeds, status: 'Sold → Cash' });
      } else {
        // Active projects are inventory at current valuation
        // Use purchase price + rehab spend as "book value"
        const bookValue = (fin.purchasePrice || 0) +
          (fin.costs?.filter(c => c.approved).reduce((s, c) => s + c.amount, 0) || 0);
        propertyInventory += bookValue;
        assetDetails.push({ name: deal.propertyName, value: bookValue, status: deal.status });

        // Outstanding debt on active projects
        const loanAmt = fin.loanAmount || 0;
        if (loanAmt > 0) {
          hardMoneyDebt += loanAmt;
          liabilityDetails.push({ name: `Loan: ${deal.propertyName}`, value: loanAmt, type: 'Hard Money' });
        }
      }

      // Private investor equity (fractional investors)
      deal.fractionalInvestors?.forEach(inv => {
        if (inv.status === 'confirmed') {
          privateLenderEquity += inv.contributionAmount;
          totalInvestorContributions += inv.contributionAmount;
          liabilityDetails.push({ name: `${inv.name} (${inv.equityPercentage}%)`, value: inv.contributionAmount, type: 'Investor Equity' });
        }
      });
    });

    const totalAssets = propertyInventory + cashFromSales;
    const totalLiabilities = hardMoneyDebt + privateLenderEquity;
    const ownerEquity = totalAssets - totalLiabilities;

    return {
      propertyInventory,
      cashFromSales,
      totalAssets,
      hardMoneyDebt,
      privateLenderEquity,
      totalLiabilities,
      ownerEquity,
      assetDetails,
      liabilityDetails,
    };
  }, [projects]);

  const assetLines: BSSection[] = [
    { label: 'ASSETS', amount: 0, bold: true },
    { label: 'Property Inventory (Book Value)', amount: bs.propertyInventory, indent: true },
    { label: 'Cash from Sales (Net Proceeds)', amount: bs.cashFromSales, indent: true },
    { label: 'Total Assets', amount: bs.totalAssets, bold: true },
  ];

  const liabilityLines: BSSection[] = [
    { label: 'LIABILITIES', amount: 0, bold: true },
    { label: 'Hard Money / Construction Loans', amount: bs.hardMoneyDebt, indent: true },
    { label: 'Private Investor Equity', amount: bs.privateLenderEquity, indent: true },
    { label: 'Total Liabilities', amount: bs.totalLiabilities, bold: true },
  ];

  const equityLines: BSSection[] = [
    { label: "OWNER'S EQUITY", amount: 0, bold: true },
    { label: 'Retained Earnings (Assets − Liabilities)', amount: bs.ownerEquity, indent: true, highlight: true },
    { label: "Total Owner's Equity", amount: bs.ownerEquity, bold: true, highlight: true },
  ];

  const renderSection = (lines: BSSection[], icon: React.ReactNode) => (
    <div className="space-y-0.5">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-4 py-2.5 rounded-lg transition ${
            line.bold ? 'bg-bg-primary' : 'hover:bg-bg-primary'
          }`}
        >
          <span className={`flex items-center gap-2 ${line.indent ? 'ml-6' : ''} ${line.bold ? 'font-semibold text-text-primary text-sm' : 'text-text-secondary text-sm'}`}>
            {line.bold && !line.indent && <span className="flex-shrink-0">{icon}</span>}
            {line.label}
          </span>
          <span className={`font-mono text-sm ${
            line.highlight ? (bs.ownerEquity >= 0 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold') :
            line.bold ? 'font-semibold text-text-primary' :
            'text-text-primary'
          }`}>
            {line.bold && line.amount === 0 && !line.highlight ? '' : formatCurrency(line.amount)}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-2">
        <h4 className="text-sm font-bold tracking-widest uppercase text-text-primary">
          Balance Sheet
        </h4>
        <p className="text-xs text-text-secondary mt-0.5">
          Portfolio Snapshot · As of {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Balance Check Banner */}
      <div className={`flex items-center justify-between p-4 rounded-lg border ${
        Math.abs(bs.totalAssets - bs.totalLiabilities - bs.ownerEquity) < 1
          ? 'bg-bg-primary border-border-accent'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">Balance Check</span>
        </div>
        <span className="text-xs font-mono text-text-secondary">
          Assets {formatCurrency(bs.totalAssets)} = Liabilities {formatCurrency(bs.totalLiabilities)} + Equity {formatCurrency(bs.ownerEquity)}
        </span>
      </div>

      {/* Statement Body */}
      <div className="border border-border-accent rounded-lg overflow-hidden divide-y divide-gray-200">
        {renderSection(assetLines, <Building className="w-4 h-4 text-blue-600" />)}
        <div className="h-px bg-gray-200" />
        {renderSection(liabilityLines, <Landmark className="w-4 h-4 text-amber-600" />)}
        <div className="h-px bg-gray-200" />
        {renderSection(equityLines, <Wallet className="w-4 h-4 text-emerald-600" />)}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asset Breakdown */}
        <div className="border border-border-accent rounded-lg p-4">
          <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600" /> Property Detail
          </h5>
          {bs.assetDetails.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No properties in portfolio</p>
          ) : (
            <div className="space-y-1.5">
              {bs.assetDetails.map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary font-medium">{a.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                      a.status === 'Sold → Cash' ? 'bg-emerald-50 text-emerald-700' :
                      a.status === 'Renovating' ? 'bg-amber-50 text-amber-700' :
                      'bg-bg-primary text-text-secondary'
                    }`}>{a.status}</span>
                  </div>
                  <span className="font-mono text-text-primary">{formatCurrency(a.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Liability Breakdown */}
        <div className="border border-border-accent rounded-lg p-4">
          <h5 className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-amber-600" /> Debt & Equity Detail
          </h5>
          {bs.liabilityDetails.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No outstanding liabilities</p>
          ) : (
            <div className="space-y-1.5">
              {bs.liabilityDetails.map((l, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary font-medium">{l.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-bg-primary text-text-secondary">{l.type}</span>
                  </div>
                  <span className="font-mono text-text-primary">{formatCurrency(l.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
