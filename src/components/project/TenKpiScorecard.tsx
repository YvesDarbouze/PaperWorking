'use client';

import React, { useMemo } from 'react';
import type { Project } from '@/types/schema';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { ShieldAlert, FileDown, CheckCircle2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface TenKpiScorecardProps {
  project: Project;
  phaseColor?: string;
}

export function TenKpiScorecard({ project, phaseColor = '#ffac5a' }: TenKpiScorecardProps) {
  // Normalize financials (convert cents to dollars for the metrics engine)
  const normalizedFinancing = useMemo<any>(() => {
    if (!project?.financials) return {};
    const f = project.financials as any;
    const copy = { ...f } as any;

    // Standard conversions (cents -> dollars)
    const isAccepted = f.offerStatus === 'Accepted';
    const finalPriceVal = (isAccepted && f.finalAgreedPrice != null && f.finalAgreedPrice > 0)
      ? f.finalAgreedPrice
      : (f.purchasePrice || 0);
    copy.purchasePrice = finalPriceVal ? finalPriceVal / 100 : 0;
    if (f.finalAgreedPrice != null) {
      copy.finalAgreedPrice = f.finalAgreedPrice / 100;
    }
    copy.loanAmount = f.loanAmount ? f.loanAmount / 100 : 0;
    copy.projectedRehabCost = f.projectedRehabCost ? f.projectedRehabCost / 100 : 0;
    copy.estimatedARV = f.estimatedARV ? f.estimatedARV / 100 : 0;
    copy.fixedAcquisitionCosts = f.closingCosts ? f.closingCosts / 100 : (f.fixedAcquisitionCosts ? f.fixedAcquisitionCosts / 100 : 0);
    copy.totalCashInvested = f.totalCashInvested ? f.totalCashInvested / 100 : 0;
    copy.actualSalePrice = f.actualSalePrice ? f.actualSalePrice / 100 : 0;
    copy.estimatedCurrentValue = f.estimatedCurrentValue ? f.estimatedCurrentValue / 100 : 0;

    // Rental operations / other properties
    copy.monthlyGrossRent = f.monthlyGrossRent ?? f.monthlyRent ?? 0;
    copy.otherMonthlyIncome = f.otherMonthlyIncome ?? 0;
    copy.vacancyRatePercent = f.vacancyRatePercent ?? 5.5;
    copy.numberOfUnits = f.numberOfUnits ?? project.units ?? 1;
    copy.occupiedUnits = f.occupiedUnits ?? project.occupiedUnits ?? copy.numberOfUnits;

    // Rates & Terms
    copy.loanInterestRate = f.loanInterestRate ?? 6.5;
    copy.loanTermYears = f.loanTermYears ?? 30;

    return copy;
  }, [project?.financials, project?.units, project?.occupiedUnits]);

  // Derive metrics via the engine
  const metrics = useMemo(() => {
    try {
      return deriveAllMetrics(
        normalizedFinancing,
        normalizedFinancing.estimatedCurrentValue || undefined,
        project.dispositionType ?? 'RENT',
        1, // Sourcing phase
        project.createdAt
      );
    } catch (err) {
      console.error('Error deriving metrics:', err);
      return null;
    }
  }, [normalizedFinancing, project.dispositionType, project.createdAt]);

  const isAllCash = normalizedFinancing.financingType === 'All Cash';

  // Format Helpers
  const fmtCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const fmtPercent = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return `${val.toFixed(2)}%`;
  };

  const fmtRatio = (val?: number | null) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return `${val.toFixed(2)}x`;
  };

  // Consuming pre-derived values from deriveAllMetrics/metrics to avoid component-level math
  const purchaseCapRate = metrics?.capRate || 0;
  const proFormaCapRate = metrics?.proFormaCapRate || 0;
  const arv = normalizedFinancing.estimatedARV || (project.arvCents ? Number(project.arvCents) / 100 : 0);
  const mao = metrics?.mao || 0;
  const netProfit = metrics?.netProfit || 0;

  // Check if we are running DEMO_FINANCIALS / Seed comparison
  // (Address matches the Evergreen Terrace or we have demo financials)
  const isDemoOrSeed = useMemo(() => {
    const projAddress = (project.address || (project as any).addressLine || '').toLowerCase();
    const isEvergreen = projAddress.includes('evergreen');
    const isOceanMock = project.id === 'project_1' && (project.financials as any)?.monthlyRent === 3500;
    return isEvergreen || isOceanMock;
  }, [project.address, (project as any).addressLine, project.id, project.financials]);

  // Export PDF Report Function
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header & Styling
      doc.setFontSize(22);
      doc.setTextColor(18, 16, 20); // Dark theme color
      doc.text('Underwriting KPI Scorecard', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Project: ${project.name || project.propertyName || 'Property analysis'}`, 14, 26);
      doc.text(`Address: ${project.address || (project as any).addressLine || '—'}`, 14, 31);
      doc.text(`Strategy: ${project.subStrategy || project.dispositionType || 'Rental'} · Mode: ${isAllCash ? 'All Cash' : 'Financed'}`, 14, 36);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 41);

      doc.setDrawColor(18, 16, 20);
      doc.setLineWidth(0.5);
      doc.line(14, 44, 196, 44);

      const tableData = [
        ['Projected Net Operating Income (NOI)', fmtCurrency(metrics?.noi || 0), 'Annual operating profit after vacancy & expenses'],
        ['Projected Monthly Cash Flow', fmtCurrency(metrics?.monthlyCashFlow || 0), 'Net cash flow after debt service (monthly)'],
        ['Projected Annual Cash Flow', fmtCurrency(metrics?.annualCashFlow || 0), 'Net cash flow after debt service (annual)'],
        ['Projected Purchase Cap Rate', fmtPercent(purchaseCapRate), 'NOI divided by Purchase Price'],
        ['Projected Pro Forma Cap Rate', fmtPercent(proFormaCapRate), 'NOI divided by Purchase Price + Rehab Budget'],
        ['Projected Cash-on-Cash Return', fmtPercent(metrics?.cashOnCashReturn), 'Annual cash flow divided by total cash invested'],
        ['Projected Gross Rent Multiplier (GRM)', fmtRatio(metrics?.grossRentMultiplier), 'Purchase Price divided by annual gross scheduled rent'],
        ['Projected Debt Service Coverage Ratio (DSCR)', isAllCash ? 'N/A — all cash' : fmtRatio(metrics?.dscr), 'NOI divided by annual debt service'],
        ['Projected Internal Rate of Return (IRR)', fmtPercent(metrics?.irr), 'Newton-Raphson discounted cash flow yield over hold period'],
        ['Projected Occupancy Rate', fmtPercent(metrics?.occupancyRate), 'Percentage of year property is producing rental revenue'],
        ['Projected Operating Expense Ratio (OER)', fmtPercent(metrics?.oer), 'Operating expenses divided by gross operating income'],
        ['Projected Long-Term Appreciation', fmtPercent(metrics?.annualizedAppreciation), 'Projected annualized home value growth rate'],
      ];

      autoTable(doc, {
        startY: 48,
        head: [['Key Performance Indicator', 'Projected Value', 'Description']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [18, 16, 20], textColor: [253, 255, 252], fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 
          0: { cellWidth: 65, fontStyle: 'bold' }, 
          1: { cellWidth: 35, halign: 'left', fontStyle: 'bold' },
          2: { cellWidth: 80 }
        },
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${totalPages} · Generated by PaperWorking`, 14, doc.internal.pageSize.height - 10);
      }

      const filename = `Scorecard_${(project.name || 'Property').replace(/\s+/g, '_')}.pdf`;
      doc.save(filename);
      toast.success('PDF report exported successfully!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF scorecard');
    }
  };

  if (!metrics) {
    return (
      <div className="glass-card p-6 rounded-2xl border border-white/10 text-center">
        <p className="text-[#9E9DA0]">Awaiting complete financial assumptions to compile scorecard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with PDF export and mode info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Live Underwriting KPIs
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-[#9E9DA0]">
              {isAllCash ? 'Unlevered (All Cash)' : 'Levered (Financed)'}
            </span>
          </h3>
          <p className="text-xs text-[#9E9DA0]/60 mt-0.5">
            Dynamic cash flow and investment yields computed from current Phase 1 assumptions.
          </p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white transition-all active:scale-95 duration-200"
          id="export-scorecard-pdf"
        >
          <FileDown className="w-4 h-4" />
          Export PDF Scorecard
        </button>
      </div>

      {/* Demo comparison banner if active */}
      {isDemoOrSeed && (
        <div className="bg-pw-success-container border border-pw-success-border rounded-xl p-4 flex gap-3 items-start" id="demo-reference-panel">
          <CheckCircle2 className="w-5 h-5 text-pw-success shrink-0 mt-0.5" />
          <div className="text-xs text-[#FDFFFC]/90 space-y-1.5">
            <p className="font-bold text-pw-success">✨ DEMO_FINANCIALS Active (Option B Seed)</p>
            <p className="text-[#9E9DA0]">
              This project replicates the canonical five locked values side-by-side:
            </p>
            <div className="grid grid-cols-5 gap-4 pt-1 font-mono text-[10px]">
              <div>
                <span className="text-[#9E9DA0]">NOI:</span>
                <p className="text-white font-bold">$12,486</p>
              </div>
              <div>
                <span className="text-[#9E9DA0]">Cash Flow:</span>
                <p className="text-white font-bold">-$4,443/yr</p>
              </div>
              <div>
                <span className="text-[#9E9DA0]">Cap Rate:</span>
                <p className="text-white font-bold">4.48%</p>
              </div>
              <div>
                <span className="text-[#9E9DA0]">CoC:</span>
                <p className="text-white font-bold">-7.41%</p>
              </div>
              <div>
                <span className="text-[#9E9DA0]">DSCR:</span>
                <p className="text-white font-bold">0.74</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Re-weighted Scorecard Headlines */}
      {(() => {
        const isSale = project.dispositionType === 'SALE';
        let headlineKeys: string[];
        let detailKeys: string[];

        if (isSale) {
          headlineKeys = ['arv', 'mao', 'netprofit'];
          detailKeys = isAllCash
            ? ['noi', 'caprates', 'coc', 'grm', 'irr', 'oer', 'appreciation']
            : ['noi', 'caprates', 'cashflow', 'coc', 'grm', 'irr', 'oer', 'appreciation'];
        } else {
          if (isAllCash) {
            headlineKeys = ['noi', 'caprates', 'cashflow', 'occupancy'];
            detailKeys = ['coc', 'grm', 'dscr', 'irr', 'oer', 'appreciation'];
          } else {
            headlineKeys = ['caprates', 'cashflow', 'dscr', 'occupancy'];
            detailKeys = ['noi', 'coc', 'grm', 'irr', 'oer', 'appreciation'];
          }
        }

        const cardTemplates: Record<string, React.ReactNode> = {
          noi: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-noi" key="noi">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected NOI</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtCurrency(metrics?.noi || 0)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Net Operating Income (Annual)</span>
            </div>
          ),
          cashflow: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-cashflow" key="cashflow">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Cash Flow</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white">{fmtCurrency(metrics?.monthlyCashFlow || 0)}</span>
                  <span className="text-[10px] text-[#9E9DA0]">/ mo</span>
                </div>
                <div className="text-[10px] text-[#9E9DA0]/70 mt-0.5">
                  Annualized: {fmtCurrency(metrics?.annualCashFlow || 0)}
                </div>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-1 block">Net cash flow post-debt service</span>
            </div>
          ),
          caprates: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-caprates" key="caprates">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Cap Rates</span>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#9E9DA0]/70">Purchase Cap:</span>
                    <span className="font-bold text-white">{fmtPercent(purchaseCapRate)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#9E9DA0]/70">Pro Forma Cap:</span>
                    <span className="font-bold text-pw-success">{fmtPercent(proFormaCapRate)}</span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Yields based on purchase + rehab cost</span>
            </div>
          ),
          coc: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-coc" key="coc">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Cash-on-Cash</span>
                <p className={`text-2xl font-extrabold mt-1 ${metrics?.cashOnCashReturn >= 0 ? 'text-pw-success' : 'text-rose-400'}`}>
                  {fmtPercent(metrics?.cashOnCashReturn)}
                </p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Annual Cash Yield on Cash Invested</span>
            </div>
          ),
          grm: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-grm" key="grm">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected GRM</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtRatio(metrics?.grossRentMultiplier)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Gross Rent Multiplier</span>
            </div>
          ),
          dscr: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px] relative" id="kpi-dscr" key="dscr">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected DSCR</span>
                {isAllCash ? (
                  <p className="text-lg font-bold text-[#9E9DA0]/50 mt-1.5">N/A — all cash</p>
                ) : (
                  <p className={`text-2xl font-extrabold mt-1 ${metrics?.dscr >= 1.25 ? 'text-white' : 'text-rose-400'}`}>
                    {fmtRatio(metrics?.dscr)}
                  </p>
                )}
              </div>
              {!isAllCash && metrics?.dscr < 1.25 && (
                <div className="mt-2 py-1 px-2.5 rounded-lg bg-rose-950/80 border border-rose-500/30 flex items-center gap-1.5 text-[9px] text-rose-200" id="dscr-lender-warning">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Lender Warning: DSCR &lt; 1.25 (Guidance only)</span>
                </div>
              )}
              <span className="text-[10px] text-[#9E9DA0]/50 mt-1 block">Debt Service Coverage Ratio</span>
            </div>
          ),
          irr: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-irr" key="irr">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected IRR</span>
                <p className="text-2xl font-extrabold text-white mt-1">
                  {metrics?.irr !== null && metrics?.irr !== undefined ? fmtPercent(metrics?.irr) : '—'}
                </p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Internal Rate of Return</span>
            </div>
          ),
          occupancy: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-occupancy" key="occupancy">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Occupancy</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtPercent(metrics?.occupancyRate)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Target occupancy percentage</span>
            </div>
          ),
          oer: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-oer" key="oer">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Expense Ratio</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtPercent(metrics?.oer)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Operating Expense Ratio</span>
            </div>
          ),
          appreciation: (
            <div className="glass-card p-5 rounded-2xl border border-white/10 hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px]" id="kpi-appreciation" key="appreciation">
              <div>
                <span className="text-[11px] font-bold text-[#9E9DA0] tracking-wider uppercase">Projected Appreciation</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtPercent(metrics?.annualizedAppreciation)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Long-Term Appreciation Rate</span>
            </div>
          ),
          arv: (
            <div className="glass-card p-5 rounded-2xl border hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px] bg-primary/5 border-primary/30" id="kpi-arv" key="arv">
              <div>
                <span className="text-[11px] font-bold text-primary tracking-wider uppercase">Projected ARV</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtCurrency(arv)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">After Repair Value</span>
            </div>
          ),
          mao: (
            <div className="glass-card p-5 rounded-2xl border hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px] bg-primary/5 border-primary/30" id="kpi-mao" key="mao">
              <div>
                <span className="text-[11px] font-bold text-primary tracking-wider uppercase">Projected MAO</span>
                <p className="text-2xl font-extrabold text-white mt-1">{fmtCurrency(mao)}</p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">Maximum Allowable Offer (70% Rule)</span>
            </div>
          ),
          netprofit: (
            <div className="glass-card p-5 rounded-2xl border hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between min-h-[120px] bg-primary/5 border-primary/30" id="kpi-netprofit" key="netprofit">
              <div>
                <span className="text-[11px] font-bold text-primary tracking-wider uppercase">Projected Net Profit</span>
                <p className={`text-2xl font-extrabold mt-1 ${netProfit >= 0 ? 'text-pw-success' : 'text-rose-400'}`}>
                  {fmtCurrency(netProfit)}
                </p>
              </div>
              <span className="text-[10px] text-[#9E9DA0]/50 mt-2 block">ARV minus total cost basis</span>
            </div>
          ),
        };

        return (
          <div className="space-y-6">
            {/* Headline Metrics Grid */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Headline Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {headlineKeys.map((key) => cardTemplates[key])}
              </div>
            </div>

            {/* Performance Details Grid */}
            <div className="space-y-2 pt-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#9E9DA0] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                Performance Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {detailKeys.map((key) => cardTemplates[key])}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
