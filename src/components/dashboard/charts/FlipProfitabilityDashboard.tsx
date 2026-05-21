'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import {
  deriveAllMetrics, computeMAO, computeFlipNetProfit, computeFlipROI,
  computeGrossMargin, computeDOM, computeRehabVariance, computeTotalCashInvested,
} from '@/lib/metrics/reiMetrics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts';
import {
  TrendingUp, DollarSign, Target, Clock, AlertTriangle, CheckCircle,
  Building, Hammer, Percent, Calendar,
} from 'lucide-react';

interface Props { projects?: Project[]; }

const fmtUSD = (v: number) => v < 0
  ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

type ProfitGrade = 'exceptional' | 'strong' | 'marginal' | 'loss';
function classifyROI(roi: number): { grade: ProfitGrade; label: string; color: string; bg: string; border: string } {
  if (roi >= 40) return { grade: 'exceptional', label: 'Exceptional Deal', color: '#595959', bg: 'rgba(89,89,89,0.08)', border: 'rgba(89,89,89,0.2)' };
  if (roi >= 25) return { grade: 'strong', label: 'Strong Return', color: '#7F7F7F', bg: 'rgba(127,127,127,0.08)', border: 'rgba(127,127,127,0.2)' };
  if (roi > 0) return { grade: 'marginal', label: 'Thin Margins', color: '#A5A5A5', bg: 'rgba(165,165,165,0.08)', border: 'rgba(165,165,165,0.2)' };
  return { grade: 'loss', label: 'Loss Territory', color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' };
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-lg px-3 py-2 shadow-lg text-xs" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
      <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{d?.name}</p>
      <p className="tabular-nums" style={{ color: payload[0]?.color }}>{fmtUSD(d?.value ?? 0)}</p>
    </div>
  );
}

export default function FlipProfitabilityDashboard({ projects: propProjects }: Props) {
  const analysis = useMemo(() => {
    const projects = (propProjects || []).filter(p => p.financials);
    if (!projects.length) return null;

    const p = projects[0];
    const f = p.financials!;
    const metrics = deriveAllMetrics(f);

    const purchasePrice = f.purchasePrice ?? 0;
    const arv = f.estimatedARV ?? 0;
    const rehabCost = f.projectedRehabCost ?? 0;
    const closingCosts = f.fixedAcquisitionCosts ?? 0;
    const actualSalePrice = f.actualSalePrice ?? 0;

    // Costs breakdown
    const holdingMonthly = (f.holdingCostTaxes ?? 0) + (f.holdingCostInsurance ?? 0) + (f.holdingCostUtilities ?? 0);
    const holdMonths = f.projectedHoldTimeMonths ?? 0;
    const totalHolding = f.totalHoldingCosts ?? (holdingMonthly * holdMonths);

    const buyerComm = f.buyersAgentCommission ?? 3;
    const sellerComm = f.sellersAgentCommission ?? 3;
    const saleBase = actualSalePrice > 0 ? actualSalePrice : arv;
    const sellingCosts = (f.finalClosingCosts ?? 0) +
      (saleBase * (buyerComm / 100)) + (saleBase * (sellerComm / 100)) +
      (f.stagingCosts ?? 0) + (f.photographyAndMedia ?? 0) + (f.mlsListingFees ?? 0);

    const financingCosts = metrics.annualDebtService * (holdMonths / 12);
    const loanPoints = (f.loanOriginationPoints ?? 0) / 100 * (f.loanAmount ?? 0);

    const totalAllInCost = purchasePrice + closingCosts + rehabCost + totalHolding + sellingCosts + financingCosts + loanPoints;

    // Core flip metrics
    const mao = computeMAO(arv, rehabCost, closingCosts);
    const salePrice = actualSalePrice > 0 ? actualSalePrice : arv;
    const netProfit = computeFlipNetProfit(salePrice, totalAllInCost);
    const totalCashInvested = computeTotalCashInvested(f);
    const roi = computeFlipROI(netProfit, totalCashInvested);
    const grossMargin = computeGrossMargin(salePrice, totalAllInCost);
    const dom = computeDOM(f.listingDate, f.soldDate);

    // Rehab variance
    const projectedDays = f.estimatedTimelineDays ?? 0;
    const tasks = f.rehabTasks ?? [];
    const completedTasks = tasks.filter(t => t.status === 'Complete');
    const actualRehabDays = completedTasks.length > 0 && projectedDays > 0 ? projectedDays : null;
    const rehabVar = actualRehabDays != null ? computeRehabVariance(projectedDays, actualRehabDays) : null;

    const classification = classifyROI(roi);

    // Cost waterfall
    const costBreakdown = [
      { name: 'Purchase', value: purchasePrice, color: '#7F7F7F' },
      { name: 'Closing', value: closingCosts, color: '#595959' },
      { name: 'Rehab', value: rehabCost, color: '#A5A5A5' },
      { name: 'Holding', value: totalHolding, color: '#EF4444' },
      { name: 'Financing', value: financingCosts + loanPoints, color: '#EC4899' },
      { name: 'Selling', value: sellingCosts, color: '#8B5CF6' },
    ].filter(c => c.value > 0);

    // MAO scenarios
    const maoScenarios = [60, 65, 70, 75, 80].map(pct => ({
      pct, mao: computeMAO(arv, rehabCost, closingCosts, pct),
      isCurrent: pct === 70,
    }));

    // ROI scenarios at different sale prices
    const roiScenarios = [-10, -5, 0, 5, 10].map(delta => {
      const sp = salePrice * (1 + delta / 100);
      const np = computeFlipNetProfit(sp, totalAllInCost);
      const r = computeFlipROI(np, totalCashInvested);
      return { label: delta === 0 ? 'Current' : `${delta > 0 ? '+' : ''}${delta}%`, salePrice: sp, netProfit: np, roi: r, isCurrent: delta === 0 };
    });

    // Comps
    const comps = f.comparableSales ?? [];

    return {
      purchasePrice, arv, rehabCost, mao, salePrice, netProfit, roi,
      grossMargin, dom, totalAllInCost, totalCashInvested, totalHolding,
      financingCosts: financingCosts + loanPoints, sellingCosts, classification,
      costBreakdown, maoScenarios, roiScenarios, metrics,
      rehabVar, projectedDays, comps, closingCosts,
    };
  }, [propProjects]);

  if (!analysis) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Target className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Add purchase price and ARV to see your Flip Profitability Dashboard.
        </p>
      </div>
    );
  }

  const { classification, costBreakdown } = analysis;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bg }}>
            <Target className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Flip Profitability Dashboard</h3>
            <p className="text-xs text-text-secondary">ARV, MAO, ROI, costs, and operational metrics — everything to know if this deal hits</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bg, border: `1px solid ${classification.border}`, color: classification.color }}>
          {analysis.roi >= 25 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          <span>{classification.label}</span>
        </div>
      </div>

      {/* ── KPI Strip: 6 cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Building, label: 'After Repair Value', value: fmtUSD(analysis.arv), sub: `Purchase: ${fmtUSD(analysis.purchasePrice)}`, color: '#7F7F7F' },
          { icon: Target, label: 'Max Allowable Offer', value: fmtUSD(analysis.mao), sub: `70% rule → ${analysis.purchasePrice <= analysis.mao ? '✅ Under MAO' : '⚠️ Over MAO'}`, color: analysis.purchasePrice <= analysis.mao ? '#595959' : '#EF4444' },
          { icon: DollarSign, label: 'Net Profit', value: fmtUSD(analysis.netProfit), sub: `Sale: ${fmtUSD(analysis.salePrice)} − Costs: ${fmtUSD(analysis.totalAllInCost)}`, color: analysis.netProfit >= 0 ? '#595959' : '#EF4444' },
          { icon: Percent, label: 'ROI', value: fmtPct(analysis.roi), sub: `2026 target: ≥25% — ${analysis.roi >= 25 ? 'Passing' : 'Below target'}`, color: analysis.roi >= 25 ? '#595959' : '#A5A5A5' },
          { icon: TrendingUp, label: 'Gross Margin', value: fmtPct(analysis.grossMargin), sub: `(Sale − Cost) ÷ Sale × 100`, color: analysis.grossMargin >= 20 ? '#595959' : '#A5A5A5' },
          { icon: Clock, label: 'Days on Market', value: analysis.dom != null ? `${analysis.dom} days` : 'Pending', sub: analysis.dom != null ? (analysis.dom <= 90 ? '✅ Under 90-day target' : '⚠️ Over 90-day target') : 'List & sell dates needed', color: analysis.dom != null && analysis.dom <= 90 ? '#595959' : '#A5A5A5' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Cost Waterfall Bar + Pie ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar: Cost Breakdown */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5" style={{ minHeight: 280 }}>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4" style={{ color: '#7F7F7F' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">All-In Cost Breakdown</h4>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={costBreakdown} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-ui)" />
              <XAxis dataKey="name" fontSize={9} tickLine={false} axisLine={false} />
              <YAxis fontSize={9} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {costBreakdown.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Cost Composition */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5" style={{ minHeight: 280 }}>
          <div className="flex items-center gap-2 mb-4">
            <Hammer className="w-4 h-4" style={{ color: '#A5A5A5' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Cost Composition</h4>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={costBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                {costBreakdown.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: '9px' }} />
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── MAO Scenarios + ROI Sensitivity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAO at different % of ARV */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If I Adjust the MAO Rule?&rdquo;</h4>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['% of ARV', 'MAO', 'vs Purchase', 'Verdict'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.maoScenarios.map(s => {
                const diff = s.mao - analysis.purchasePrice;
                return (
                  <tr key={s.pct}>
                    <td className="px-3 py-2 font-bold" style={{ color: s.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {s.pct}% {s.isCurrent ? '← standard' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: diff >= 0 ? '#595959' : '#EF4444', background: s.isCurrent ? 'rgba(89,89,89,0.06)' : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>
                      {fmtUSD(s.mao)}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ color: diff >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                      {diff >= 0 ? `+${fmtUSD(diff)} cushion` : `${fmtUSD(diff)} over`}
                    </td>
                    <td className="px-3 py-2 text-[9px] font-bold uppercase" style={{ color: diff >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>
                      {diff >= 0 ? '✅ Pass' : '❌ Fail'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ROI at different sale prices */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4" style={{ color: '#595959' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">&ldquo;What If the Sale Price Changes?&rdquo;</h4>
          </div>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr>
                {['Scenario', 'Sale Price', 'Net Profit', 'ROI'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {analysis.roiScenarios.map(s => {
                const cls = classifyROI(s.roi);
                return (
                  <tr key={s.label}>
                    <td className="px-3 py-2 font-bold" style={{ color: s.isCurrent ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>
                      {s.label} {s.isCurrent ? '← yours' : ''}
                    </td>
                    <td className="px-3 py-2 tabular-nums" style={{ borderBottom: '1px solid var(--border-ui)', color: 'var(--text-primary)' }}>{fmtUSD(s.salePrice)}</td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: s.netProfit >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(s.netProfit)}</td>
                    <td className="px-3 py-2 tabular-nums font-bold" style={{ color: cls.color, background: s.isCurrent ? cls.bg : 'transparent', borderBottom: '1px solid var(--border-ui)' }}>{fmtPct(s.roi)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Comparable Sales ── */}
      {analysis.comps.length > 0 && (
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4" style={{ color: '#8B5CF6' }} />
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Comparable Sales — ARV Validation</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr>
                  {['Address', 'Sale Price', '$/sqft', 'Beds/Baths', 'Sale Date', 'vs ARV'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)', background: 'var(--bg-inset)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.comps.map((c: any, i: number) => {
                  const priceSqft = c.squareFeet > 0 ? c.salePrice / c.squareFeet : 0;
                  const diff = analysis.arv > 0 ? ((c.salePrice - analysis.arv) / analysis.arv) * 100 : 0;
                  return (
                    <tr key={i}>
                      <td className="px-3 py-2 font-bold" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)' }}>{c.address || `Comp ${i + 1}`}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-ui)' }}>{fmtUSD(c.salePrice ?? 0)}</td>
                      <td className="px-3 py-2 tabular-nums" style={{ color: '#595959', borderBottom: '1px solid var(--border-ui)' }}>{priceSqft > 0 ? `$${priceSqft.toFixed(0)}` : '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>{c.beds ?? '—'}/{c.baths ?? '—'}</td>
                      <td className="px-3 py-2" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-ui)' }}>{c.saleDate ? new Date(c.saleDate).toLocaleDateString() : '—'}</td>
                      <td className="px-3 py-2 tabular-nums font-bold" style={{ color: diff >= 0 ? '#595959' : '#EF4444', borderBottom: '1px solid var(--border-ui)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Holding & Financing Cost Line Items ── */}
      <div className="bg-bg-surface border border-border-accent rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4" style={{ color: '#EF4444' }} />
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary">Holding & Financing Cost Detail</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Purchase Price', val: analysis.purchasePrice },
            { label: 'Buy-Side Closing', val: analysis.closingCosts },
            { label: 'Rehab Budget', val: analysis.rehabCost },
            { label: 'Holding Costs', val: analysis.totalHolding },
            { label: 'Financing (Interest + Points)', val: analysis.financingCosts },
            { label: 'Selling Costs (Commissions + Staging)', val: analysis.sellingCosts },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid var(--border-ui)' }}>
              <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color: item.val > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{fmtUSD(item.val)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center py-2 col-span-full" style={{ borderTop: '2px solid var(--border-ui)' }}>
            <span className="text-xs font-black" style={{ color: 'var(--text-primary)' }}>TOTAL ALL-IN COST</span>
            <span className="text-sm font-black tabular-nums" style={{ color: '#EF4444' }}>{fmtUSD(analysis.totalAllInCost)}</span>
          </div>
        </div>
      </div>

      {/* ── Educational Callout ── */}
      <div className="px-4 py-3 rounded-lg text-[11px] leading-relaxed" style={{ background: 'rgba(127,127,127,0.05)', border: '1px solid rgba(127,127,127,0.15)', color: 'var(--text-secondary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>2026 Flip Margins:</strong>{' '}
        With narrower profit margins, an ROI ≥ 25% is the baseline for a worthwhile flip. The 70% rule (MAO = ARV × 0.70 − Rehab − Closing) remains the gold standard for offer discipline.
        <br />
        <strong style={{ color: 'var(--text-primary)' }}>DOM Target:</strong>{' '}
        Under 90 days on market controls holding costs. Every extra month burns taxes, insurance, utilities, and loan interest.
        <br />
        <AlertTriangle className="w-3 h-3 inline mr-1" style={{ color: '#A5A5A5' }} />
        <strong style={{ color: '#A5A5A5' }}>Watch your comps.</strong>{' '}
        Comparable sales of similar renovated homes in the immediate area validate your ARV assumption. Bad ARV = bad everything downstream.
      </div>
    </div>
  );
}
