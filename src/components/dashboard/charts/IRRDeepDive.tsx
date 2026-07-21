'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Project } from '@/types/schema';
import { deriveDualScopeMetrics } from '@/lib/metrics/reiMetrics';
import IRRChart from '@/components/Charts/IRRChart';
import { TrendingUp, Calendar, DollarSign, Target, BarChart3, AlertTriangle, SlidersHorizontal } from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtPct = (v: number) => `${v >= 0 ? '' : ''}${(v * 100).toFixed(1)}%`;
const fmtUSD = (v: number) => v < 0 ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

type IRRGrade = 'excellent' | 'strong' | 'acceptable' | 'weak' | 'negative';

function classifyIRR(irr: number | null): {
  grade: IRRGrade; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
} {
  if (irr === null) return { grade: 'weak', label: 'Cannot Calculate', description: 'Insufficient data for IRR computation', color: '#6B7280', bgColor: 'rgba(107,114,128,0.08)', borderColor: 'rgba(107,114,128,0.2)' };
  const pct = irr * 100;
  if (pct >= 20) return { grade: 'excellent', label: 'Exceptional Return', description: 'Significantly outperforms most alternative investments', color: '#595959', bgColor: 'rgba(89,89,89,0.08)', borderColor: 'rgba(89,89,89,0.2)' };
  if (pct >= 12) return { grade: 'strong', label: 'Strong Return', description: 'Outperforms typical stock market returns (~10% avg)', color: '#7F7F7F', bgColor: 'rgba(127,127,127,0.08)', borderColor: 'rgba(127,127,127,0.2)' };
  if (pct >= 6) return { grade: 'acceptable', label: 'Moderate Return', description: 'Reasonable return — consider risk vs alternatives', color: '#A5A5A5', bgColor: 'rgba(165,165,165,0.08)', borderColor: 'rgba(165,165,165,0.2)' };
  if (pct >= 0) return { grade: 'weak', label: 'Low Return', description: 'May underperform safer alternatives like index funds', color: '#F06543', bgColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' };
  return { grade: 'negative', label: 'Negative Return', description: 'This investment is projected to lose money', color: '#DC2626', bgColor: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)' };
}

function localBuildIRRCashFlows(
  totalCashInvested: number,
  annualCashFlow: number,
  holdYears: number,
  purchasePrice: number,
  annualAppreciationPercent: number,
  loanAmount: number,
  loanInterestRate: number,
  loanTermYears: number,
  sellingCostsPercent = 8
): number[] {
  if (holdYears <= 0 || totalCashInvested <= 0) return [];
  const flows: number[] = [-totalCashInvested];
  const futureValue = purchasePrice * Math.pow(1 + annualAppreciationPercent / 100, holdYears);
  let remainingBalance = loanAmount;
  const monthlyRate = (loanInterestRate / 100) / 12;
  const totalPayments = loanTermYears * 12;

  if (monthlyRate > 0 && totalPayments > 0 && loanAmount > 0) {
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
      (Math.pow(1 + monthlyRate, totalPayments) - 1);
    const paymentsMade = holdYears * 12;
    remainingBalance = loanAmount * Math.pow(1 + monthlyRate, paymentsMade) -
      monthlyPayment * ((Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
    remainingBalance = Math.max(0, remainingBalance);
  }

  const sellingCosts = futureValue * (sellingCostsPercent / 100);
  const netSaleProceeds = futureValue - remainingBalance - sellingCosts;

  for (let y = 1; y <= holdYears; y++) {
    if (y === holdYears) {
      flows.push(annualCashFlow + netSaleProceeds);
    } else {
      flows.push(annualCashFlow);
    }
  }
  return flows;
}

function localComputeIRR(cashFlows: number[], maxIterations = 100, tolerance = 1e-7): number | null {
  if (cashFlows.length < 2) return null;
  let rate = 0.10;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const pv = cashFlows[t] / Math.pow(1 + rate, t);
      npv += pv;
      if (t > 0) {
        dNpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }
    if (Math.abs(dNpv) < 1e-12) break;
    const newRate = rate - npv / dNpv;
    if (Math.abs(newRate - rate) < tolerance) {
      return Math.round(newRate * 10000) / 10000;
    }
    rate = newRate;
    if (rate < -0.99 || rate > 10) break;
  }

  let low = -0.99;
  let high = 10.0;
  const getNpv = (r: number) => {
    let sum = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      sum += cashFlows[t] / Math.pow(1 + r, t);
    }
    return sum;
  };

  let bracketFound = false;
  let prevVal = getNpv(low);
  const steps = 100;
  const stepSize = (high - low) / steps;

  for (let step = 1; step <= steps; step++) {
    const r = low + step * stepSize;
    const val = getNpv(r);
    if (prevVal * val <= 0) {
      low = r - stepSize;
      high = r;
      bracketFound = true;
      break;
    }
    prevVal = val;
  }

  if (!bracketFound) {
    low = -0.99;
    high = 100.0;
    const widerSteps = 200;
    const widerStepSize = (high - low) / widerSteps;
    prevVal = getNpv(low);
    for (let step = 1; step <= widerSteps; step++) {
      const r = low + step * widerStepSize;
      const val = getNpv(r);
      if (prevVal * val <= 0) {
        low = r - widerStepSize;
        high = r;
        bracketFound = true;
        break;
      }
      prevVal = val;
    }
  }

  if (bracketFound) {
    for (let j = 0; j < 100; j++) {
      const mid = (low + high) / 2;
      const npvMid = getNpv(mid);
      if (Math.abs(npvMid) < tolerance || (high - low) < tolerance) {
        return Math.round(mid * 10000) / 10000;
      }
      if (getNpv(low) * npvMid < 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }
  return null;
}

export default function IRRDeepDive({ projects: propProjects }: Props) {
  const firstProject = propProjects?.[0];
  const projectAppreciation = firstProject?.financials?.annualAppreciationPercent ?? 3;

  const [appreciationRate, setAppreciationRate] = useState<number>(projectAppreciation);
  const [sellingCosts, setSellingCosts] = useState<number>(8);

  useEffect(() => {
    if (projectAppreciation !== undefined) {
      setAppreciationRate(projectAppreciation);
    }
  }, [projectAppreciation]);

  const analysis = useMemo(() => {
    const projects = propProjects || [];
    if (projects.length === 0 || !projects[0]?.financials) return null;

    const p = projects[0];
    const f = p.financials!;
    const { asset: metrics } = deriveDualScopeMetrics(f, undefined, p.dispositionType, p.currentPhase);

    const purchasePrice = f.purchasePrice ?? 0;
    const loanAmount = f.loanAmount ?? 0;
    const loanRate = f.loanInterestRate ?? 0;
    const loanTerm = f.loanTermYears ?? 30;
    const holdMonths = f.projectedHoldTimeMonths ?? 60; // default 5 years
    const baseHoldYears = Math.max(1, Math.round(holdMonths / 12));

    if (metrics.totalCashInvested <= 0 || purchasePrice <= 0) return null;

    // Compute IRR for base hold period
    const baseCashFlows = localBuildIRRCashFlows(
      metrics.totalCashInvested, metrics.annualCashFlow, baseHoldYears,
      purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm, sellingCosts
    );
    const baseIRR = localComputeIRR(baseCashFlows);
 
    // Multi-year comparison (1–15 years)
    const holdComparison = Array.from({ length: 15 }, (_, i) => {
      const years = i + 1;
      const flows = localBuildIRRCashFlows(
        metrics.totalCashInvested, metrics.annualCashFlow, years,
        purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm, sellingCosts
      );
      const irr = localComputeIRR(flows);
      const exitValue = purchasePrice * Math.pow(1 + appreciationRate / 100, years);
      const totalCashFlows = flows.reduce((s, f) => s + f, 0);
      return { year: years, irr, exitValue, totalCashFlows, irrPct: irr !== null ? irr * 100 : null };
    });
 
    // Appreciation sensitivity
    const appreciationRates = [0, 2, 3, 4, 5, 7];
    const sensitivityRows = appreciationRates.map(rate => {
      const flows = localBuildIRRCashFlows(
        metrics.totalCashInvested, metrics.annualCashFlow, baseHoldYears,
        purchasePrice, rate, loanAmount, loanRate, loanTerm, sellingCosts
      );
      const irr = localComputeIRR(flows);
      return { rate, irr, isCurrent: rate === appreciationRate };
    });
 
    // Cash flow timeline for base period
    const cashFlowTimeline = baseCashFlows.map((cf, i) => ({
      year: i === 0 ? 'Initial' : `Yr ${i}`,
      cashFlow: cf,
      cumulative: baseCashFlows.slice(0, i + 1).reduce((s, f) => s + f, 0),
    }));
 
    // Calculate actual elapsed years from acquisition date
    let actualHoldYears = 0;
    if (f.acquisitionDate) {
      const acq = new Date(f.acquisitionDate);
      const now = new Date();
      const diffMs = now.getTime() - acq.getTime();
      if (diffMs > 0) {
        const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
        actualHoldYears = Math.max(0, Math.round(years)); // round to nearest integer for chart alignment
      }
    }
 
    // 5-Year and 10-Year hold scenarios side-by-side
    const fiveYearFlows = localBuildIRRCashFlows(
      metrics.totalCashInvested, metrics.annualCashFlow, 5,
      purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm, sellingCosts
    );
    const fiveYearIRR = localComputeIRR(fiveYearFlows);
 
    const tenYearFlows = localBuildIRRCashFlows(
      metrics.totalCashInvested, metrics.annualCashFlow, 10,
      purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm, sellingCosts
    );
    const tenYearIRR = localComputeIRR(tenYearFlows);
 
    // Compute IRR-to-Date (Actual IRR) if actualHoldYears > 0
    let actualIRR: number | null = null;
    if (actualHoldYears > 0) {
      const actualFlows = localBuildIRRCashFlows(
        metrics.totalCashInvested, metrics.annualCashFlow, actualHoldYears,
        purchasePrice, appreciationRate, loanAmount, loanRate, loanTerm, sellingCosts
      );
      actualIRR = localComputeIRR(actualFlows);
    }

    return {
      baseIRR, baseHoldYears, holdComparison, sensitivityRows,
      cashFlowTimeline, metrics, annualAppreciation: appreciationRate, purchasePrice,
      totalCashInvested: metrics.totalCashInvested,
      annualCashFlow: metrics.annualCashFlow,
      actualHoldYears,
      fiveYearIRR,
      tenYearIRR,
      actualIRR,
      acquisitionDate: f.acquisitionDate
    };
  }, [propProjects, appreciationRate, sellingCosts]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <TrendingUp className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add purchase price, financing, and income data to see your Internal Rate of Return projection.
        </p>
      </div>
    );
  }

  const classification = classifyIRR(analysis.baseIRR);
  const irrDisplay = analysis.baseIRR !== null ? fmtPct(analysis.baseIRR) : 'N/A';

  // Construct KPI cards list dynamically
  const kpiCards = (() => {
    const list = [];
    
    if (analysis.actualHoldYears > 0) {
      const actualIrrDisplay = analysis.actualIRR !== null ? fmtPct(analysis.actualIRR) : 'N/A';
      list.push({
        icon: TrendingUp,
        label: 'Actual IRR (to Date)',
        value: actualIrrDisplay,
        sublabel: `${analysis.actualHoldYears} yr${analysis.actualHoldYears > 1 ? 's' : ''} since acquisition`,
        color: '#595959',
        borderStyle: 'solid'
      });
    }

    list.push({
      icon: TrendingUp,
      label: 'Projected IRR',
      value: irrDisplay,
      sublabel: `${analysis.baseHoldYears}-year projected hold`,
      color: classification.color,
      borderStyle: 'dashed'
    });

    list.push({
      icon: DollarSign,
      label: 'Total Cash Invested',
      value: fmtUSD(analysis.totalCashInvested),
      sublabel: 'Down payment + closing + rehab',
      color: '#595959'
    });

    list.push({
      icon: Calendar,
      label: 'Annual Cash Flow',
      value: fmtUSD(analysis.annualCashFlow),
      sublabel: `${fmtUSD(Math.round(analysis.annualCashFlow / 12))}/mo net income`,
      color: '#595959'
    });

    // If actualHoldYears is 0, add the Appreciation card to keep 4 cards
    if (analysis.actualHoldYears === 0) {
      list.push({
        icon: Target,
        label: 'Appreciation Rate',
        value: `${appreciationRate}%/yr`,
        sublabel: `${fmtUSD(Math.round(analysis.purchasePrice))} → ${fmtUSD(Math.round(analysis.purchasePrice * Math.pow(1 + appreciationRate / 100, analysis.baseHoldYears)))}`,
        color: '#7F7F7F'
      });
    }

    return list;
  })();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <TrendingUp className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Internal Rate of Return (IRR)</h3>
            <p className="text-xs text-text-secondary">Discount rate where NPV of all cash flows = 0 over the hold (initial outlay → annual cash flows → sale proceeds)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className="rounded-lg p-4 flex flex-col gap-2 relative overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: kpi.borderStyle === 'dashed' ? '1px dashed var(--border-ui)' : '1px solid var(--border-ui)'
            }}
          >
            {kpi.borderStyle === 'dashed' && (
              <div className="absolute top-2 right-2 bg-bg-inset border border-border-ui px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-text-secondary opacity-85">
                Projected
              </div>
            )}
            {kpi.label.includes('Actual') && (
              <div className="absolute top-2 right-2 bg-text-primary text-bg-surface px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                Actual
              </div>
            )}
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{kpi.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Exit Assumptions Panel */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-border-ui pb-3">
          <SlidersHorizontal className="w-4 h-4 text-text-secondary" />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Interactive Exit Assumptions</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Appreciation Rate Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-text-secondary">Annual Appreciation Rate</label>
              <span className="text-sm font-bold text-text-primary">{appreciationRate}%/yr</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={appreciationRate}
              onChange={(e) => setAppreciationRate(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-bg-inset rounded-lg appearance-none cursor-pointer accent-text-primary"
            />
            <div className="flex justify-between text-[9px] text-text-secondary opacity-60">
              <span>Conservative (0%)</span>
              <span>Baseline: {projectAppreciation}%</span>
              <span>Aggressive (15%)</span>
            </div>
          </div>

          {/* Selling Costs Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-bold text-text-secondary">Selling Costs (Exit Expenses)</label>
              <span className="text-sm font-bold text-text-primary">{sellingCosts}% of Sale Price</span>
            </div>
            <input
              type="range"
              min="3"
              max="12"
              step="0.5"
              value={sellingCosts}
              onChange={(e) => setSellingCosts(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-bg-inset rounded-lg appearance-none cursor-pointer accent-text-primary"
            />
            <div className="flex justify-between text-[9px] text-text-secondary opacity-60">
              <span>Low Fee (3%)</span>
              <span>Standard: 8%</span>
              <span>High Fee (12%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* IRR by Hold Period Chart + Big Number */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Big IRR Display / Scenarios */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col justify-between">
          <div className="flex flex-col items-center justify-center text-center flex-1 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-text-secondary">Projected IRR ({analysis.baseHoldYears}-Yr Hold)</p>
            <p className="text-5xl font-black tabular-nums animate-fade-in" style={{ color: classification.color }}>{irrDisplay}</p>
            <p className="text-[10px] font-bold mt-2" style={{ color: classification.color }}>{classification.description}</p>
          </div>
          
          <div className="border-t border-border-ui pt-4 mt-2 space-y-3">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-text-secondary uppercase tracking-wider">Hold-Period Scenarios</span>
              <span className="text-text-secondary opacity-60">Interactive</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-bg-inset border border-border-ui p-2 rounded-lg">
                <p className="text-[9px] font-bold uppercase text-text-secondary">5-Year Hold</p>
                <p className="text-sm font-bold text-text-primary tabular-nums mt-1">
                  {analysis.fiveYearIRR !== null ? `${(analysis.fiveYearIRR * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
              <div className="bg-bg-inset border border-border-ui p-2 rounded-lg">
                <p className="text-[9px] font-bold uppercase text-text-secondary">10-Year Hold</p>
                <p className="text-sm font-bold text-text-primary tabular-nums mt-1">
                  {analysis.tenYearIRR !== null ? `${(analysis.tenYearIRR * 100).toFixed(1)}%` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="text-[9px] text-center space-y-0.5 text-text-secondary opacity-75">
              <p>vs. S&P 500 avg: ~10%/yr</p>
              <p>vs. 10yr Treasury: ~4.5%/yr</p>
            </div>
          </div>
        </div>

        {/* Hold Period Comparison Line Chart */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col" style={{ minHeight: '280px' }}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;5-Year vs 10-Year Hold&rdquo; — IRR by Hold Period</h4>
          </div>
          <div className="flex-1 min-h-0 pt-4">
            <IRRChart 
              data={analysis.holdComparison} 
              height="100%" 
              actualHoldYears={analysis.actualHoldYears} 
            />
          </div>
        </div>
      </div>

      {/* Appreciation Sensitivity */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4" style={{ color: '#7F7F7F' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">IRR Sensitivity — &ldquo;What If Appreciation Changes?&rdquo;</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Annual Appreciation', `IRR (${analysis.baseHoldYears}-yr hold)`, 'Verdict', 'vs S&P 500'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.sensitivityRows.map((row: any) => {
                const cls = classifyIRR(row.irr);
                const irrPct = row.irr !== null ? row.irr * 100 : null;
                return (
                  <tr key={row.rate}>
                    <td className="px-3 py-2 font-bold" style={{ color: row.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.rate}%/yr {row.isCurrent ? '← current' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: row.isCurrent ? cls.bgColor : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {row.irr !== null ? fmtPct(row.irr) : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: cls.color, borderBottom: '1px solid var(--border-ui)' }}>
                      {cls.label}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: irrPct !== null && irrPct > 10 ? '#595959' : '#F06543', borderBottom: '1px solid var(--border-ui)' }}>
                      {irrPct !== null ? `${irrPct > 10 ? '+' : ''}${(irrPct - 10).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Flow Timeline */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4" style={{ color: '#595959' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Cash Flow Timeline — {analysis.baseHoldYears}-Year Projection</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Period', 'Cash Flow', 'Cumulative', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.cashFlowTimeline.map((row: any, i: number) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)' }}>{row.year}</td>
                  <td className="px-3 py-2 tabular-nums font-bold" style={{ color: row.cashFlow >= 0 ? '#595959' : '#F06543', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(Math.round(row.cashFlow))}</td>
                  <td className="px-3 py-2 tabular-nums" style={{ color: row.cumulative >= 0 ? '#595959' : '#F06543', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(Math.round(row.cumulative))}</td>
                  <td className="px-3 py-2 text-[9px] font-bold uppercase tracking-wider" style={{ color: row.cumulative >= 0 ? '#595959' : '#A5A5A5', borderBottom: '1px solid var(--border-ui)' }}>
                    {i === 0 ? 'Invested' : row.cumulative >= 0 ? 'Profitable' : 'Recovering'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Educational Callout */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed space-y-1.5" style={{ background: 'rgba(89,89,89,0.05)', border: '1px solid rgba(89,89,89,0.15)', color: 'var(--text-secondary)' }}>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>Formula &amp; Definition:</strong>{' '}
          IRR is the discount rate where NPV of all cash flows = 0 over the hold (initial outlay &rarr; annual cash flows &rarr; sale proceeds).
        </div>
        <div>
          <strong style={{ color: 'var(--text-primary)' }}>What it includes:</strong>{' '}
          Initial investment outlay, annual cash flows, property appreciation, debt paydown, and exit proceeds minus selling costs.
        </div>
        <div className="flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: '#595959' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Visual Separation Guardrail:</strong>{' '}
            Solid lines represent **Actual IRR** to date based on acquisition date history. Dashed lines represent **Projected IRR** based on interactive exit assumptions. 
            Projections are assumptions of future performance and must never be treated as realized or guaranteed returns.
          </div>
        </div>
      </div>
    </div>
  );
}
