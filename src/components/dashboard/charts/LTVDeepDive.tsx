'use client';

import React, { useMemo } from 'react';
import { Project } from '@/types/schema';
import { Shield, AlertTriangle, TrendingDown, Calendar, Lock, Info, ArrowRight } from 'lucide-react';
import LTVChart from '@/components/Charts/LTVChart';
import { calculateAmortization } from '@/lib/utils/reiCalculators';

interface Props {
  projects?: Project[];
}

const fmtUSD = (v: number) =>
  v < 0
    ? `-$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    : `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

function classifyLTV(ltv: number, isAllCash: boolean) {
  if (isAllCash) {
    return {
      status: 'SAFE',
      label: 'All-Cash (No Debt)',
      description: '100% equity — zero leverage risk.',
      color: '#454955',
      bgColor: 'rgba(69, 73, 85, 0.05)',
      borderColor: 'rgba(69, 73, 85, 0.2)'
    };
  }
  if (ltv < 65) {
    return {
      status: 'SAFE',
      label: 'Safe (< 65%)',
      description: 'Excellent equity cushion — low risk.',
      color: '#454955',
      bgColor: 'rgba(69, 73, 85, 0.05)',
      borderColor: 'rgba(69, 73, 85, 0.2)'
    };
  }
  if (ltv <= 75) {
    return {
      status: 'TARGET',
      label: 'Target (65-75%)',
      description: 'Standard institutional leverage range.',
      color: '#ffd1aa',
      bgColor: 'rgba(255, 209, 170, 0.05)',
      borderColor: 'rgba(255, 209, 170, 0.2)'
    };
  }
  return {
    status: 'HIGH',
    label: 'High (> 80%)',
    description: 'Elevated leverage risk — monitor equity buffer.',
    color: '#ffb4ab',
    bgColor: 'rgba(255, 180, 171, 0.05)',
    borderColor: 'rgba(255, 180, 171, 0.2)'
  };
}

function deriveLTVProjectedTrajectory(project: Project) {
  const f = project.financials;
  const purchasePrice = f?.purchasePrice ?? f?.targetPrice ?? f?.targetPurchasePrice ?? 0;
  const loanAmount = f?.loanAmount ?? 0;
  const interestRate = f?.loanInterestRate ?? 6.0;
  const termYears = f?.loanTermYears ?? 30;
  const appreciationRate = f?.annualAppreciationPercent ?? 3.0;
  const acqDateRaw = f?.acquisitionDate ? new Date(f.acquisitionDate) : new Date();

  if (loanAmount <= 0 || purchasePrice <= 0) return [];

  const points = [
    { label: 'Acquisition', months: 0 },
    { label: 'Year 1', months: 12 },
    { label: 'Year 2', months: 24 },
    { label: 'Year 3 (Proj)', months: 36 }
  ];

  const totalPayments = termYears * 12;
  const amort = calculateAmortization(loanAmount, interestRate, totalPayments);

  return points.map(pt => {
    const years = pt.months / 12;
    const propertyValue = purchasePrice * Math.pow(1 + appreciationRate / 100, years);
    
    let loanBalance = loanAmount;
    if (interestRate > 0 && totalPayments > 0 && pt.months > 0) {
      const scheduleItem = amort.schedule[pt.months - 1];
      loanBalance = scheduleItem ? scheduleItem.remainingBalance : 0;
    }

    const ltv = propertyValue > 0 ? (loanBalance / propertyValue) * 100 : 0;

    let dateLabel = pt.label;
    const d = new Date(acqDateRaw);
    d.setMonth(d.getMonth() + pt.months);
    if (!isNaN(d.getTime())) {
      const quarter = Math.floor(d.getMonth() / 3) + 1;
      dateLabel = `Q${quarter} ${d.getFullYear()}`;
    }

    return {
      period: dateLabel,
      ltv: Math.round(ltv * 10) / 10,
      loanBalance: Math.round(loanBalance),
      propertyValue: Math.round(propertyValue)
    };
  });
}

export default function LTVDeepDive({ projects: propProjects }: Props) {
  const project = propProjects?.[0];

  const f = project?.financials;
  const purchasePrice = f?.purchasePrice ?? f?.targetPrice ?? f?.targetPurchasePrice ?? 0;
  const loanAmount = f?.loanAmount ?? 0;
  const interestRate = f?.loanInterestRate ?? 0;
  const termYears = f?.loanTermYears ?? 30;
  const isAllCash = loanAmount === 0;

  const currentLTV = useMemo(() => {
    if (isAllCash || purchasePrice === 0) return 0;
    return Math.round((loanAmount / purchasePrice) * 1000) / 10;
  }, [loanAmount, purchasePrice, isAllCash]);

  const classification = useMemo(() => classifyLTV(currentLTV, isAllCash), [currentLTV, isAllCash]);

  const trajectoryData = useMemo(() => {
    if (!project) return [];
    return deriveLTVProjectedTrajectory(project);
  }, [project]);

  // Compute maturity details
  const monthsRemaining = useMemo(() => {
    if (!f?.acquisitionDate || isAllCash) return 0;
    const start = new Date(f.acquisitionDate);
    const maturity = new Date(start.getFullYear() + termYears, start.getMonth(), start.getDate());
    const today = new Date();
    const diffMs = maturity.getTime() - today.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
  }, [f?.acquisitionDate, termYears, isAllCash]);

  // Compute principal reduction for 60% LTV target
  const refySimulation = useMemo(() => {
    if (isAllCash || purchasePrice === 0) return null;
    const targetLTV = 60.0;
    const targetLoan = purchasePrice * (targetLTV / 100);
    const reductionNeeded = loanAmount - targetLoan;
    return {
      targetLTV,
      reductionNeeded: Math.max(0, Math.round(reductionNeeded))
    };
  }, [loanAmount, purchasePrice, isAllCash]);

  const equityCushion = purchasePrice - loanAmount;

  if (!project) {
    return (
      <div className="bg-bg-surface border border-border-accent rounded-xl p-8 text-center">
        <Shield className="w-6 h-6 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          No project data available for LTV analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: classification.bgColor }}>
            <Shield className="w-5 h-5" style={{ color: classification.color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Loan-to-Value (LTV) Risk Analysis</h3>
            <p className="text-xs text-text-secondary">LTV = Loan Balance ÷ Appraised Property Value (Measures equity buffer &amp; leverage risk)</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold" style={{ background: classification.bgColor, border: `1px solid ${classification.borderColor}`, color: classification.color }}>
          <Shield className="w-3.5 h-3.5" />
          <span>{classification.label}</span>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Shield, label: 'LTV Ratio', value: isAllCash ? 'N/A' : `${currentLTV.toFixed(1)}%`, sublabel: isAllCash ? 'All-Cash Deal' : `${fmtUSD(loanAmount)} Loan / ${fmtUSD(purchasePrice)} Value`, color: classification.color },
          { icon: TrendingDown, label: 'Principal Debt', value: fmtUSD(loanAmount), sublabel: isAllCash ? 'Zero leverage' : `${interestRate.toFixed(2)}% Fixed Interest`, color: '#595959' },
          { icon: Shield, label: 'Equity Cushion', value: fmtUSD(equityCushion), sublabel: `${isAllCash ? '100%' : Math.round((100 - currentLTV)) + '%'} Net Equity Asset Value`, color: '#595959' },
          { icon: Calendar, label: 'Maturity Forecast', value: isAllCash ? 'N/A' : `${termYears} Years`, sublabel: isAllCash ? 'No debt maturity' : `${monthsRemaining} Mo Remaining`, color: '#595959' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-lg p-4 flex flex-col gap-2" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-ui)' }}>
            <div className="flex items-center gap-2">
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
            </div>
            <p className="text-lg font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{kpi.value}</p>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)', opacity: 0.6 }}>{kpi.sublabel}</p>
          </div>
        ))}
      </div>

      {/* Gauge + Projection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LTV Classification Gauge Panel */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-4">LTV Class &amp; Thresholds</h4>
          {isAllCash ? (
            <div className="flex-grow flex flex-col items-center justify-center text-center">
              <Shield className="w-8 h-8 opacity-30 mb-2" style={{ color: '#454955' }} />
              <p className="text-xs font-bold text-text-primary">100% Equity</p>
              <p className="text-[10px] text-text-secondary opacity-60 max-w-xs mt-1">
                There are no mortgage loans or leverage on this property.
              </p>
            </div>
          ) : (
            <>
              {/* Stacked Threshold Bar */}
              <div className="space-y-4">
                <div className="w-full h-5 rounded-full flex overflow-hidden bg-white/5 border border-white/10 relative">
                  {/* Current mark indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white z-10 transition-all duration-1000"
                    style={{ left: `${currentLTV}%` }}
                    title={`Current LTV: ${currentLTV}%`}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-white" />
                  </div>
                  <div style={{ width: '65%', background: 'rgba(69, 73, 85, 0.2)' }} title="Safe: <65%" />
                  <div style={{ width: '15%', background: 'rgba(255, 209, 170, 0.2)' }} title="Target: 65-80%" />
                  <div style={{ width: '20%', background: 'rgba(255, 180, 171, 0.2)' }} title="Danger: >80%" />
                </div>
                <div className="flex justify-between text-[9px] font-bold text-text-secondary">
                  <span>0%</span>
                  <span style={{ color: '#454955' }}>Safe (&lt;65%)</span>
                  <span style={{ color: '#ffd1aa' }}>Target (65-80%)</span>
                  <span style={{ color: '#ffb4ab' }}>High (&gt;80%)</span>
                </div>
              </div>

              <div className="text-center mt-6">
                <p className="text-4xl font-black tabular-nums" style={{ color: classification.color }}>{currentLTV.toFixed(1)}%</p>
                <p className="text-[10px] font-bold mt-1 uppercase tracking-wider" style={{ color: classification.color }}>{classification.status} STATUS</p>
                <p className="text-xs text-text-secondary mt-2">{classification.description}</p>
              </div>
            </>
          )}
        </div>

        {/* Projection Chart Panel */}
        <div className="lg:col-span-2 bg-bg-surface border border-border-accent rounded-xl p-5 flex flex-col justify-between" style={{ minHeight: '340px' }}>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-text-secondary mb-1">Trajectory Projection</h4>
            <p className="text-[10px] text-text-secondary">Amortization vs. Projected Property Valuation (Next 36 Mo)</p>
          </div>
          {isAllCash || trajectoryData.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-center">
              <Shield className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs text-text-secondary">No leverage projection available</p>
            </div>
          ) : (
            <div className="flex-grow h-48 mt-4">
              <LTVChart data={trajectoryData} height="100%" />
            </div>
          )}
        </div>
      </div>

      {/* Note & Action Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Intelligence Note */}
        <div className="bg-bg-surface border border-border-accent rounded-xl p-6 border-l-4" style={{ borderLeftColor: classification.color }}>
          <div className="flex gap-4">
            <div className="p-2 rounded-lg h-fit" style={{ background: classification.bgColor }}>
              <Info className="w-5 h-5" style={{ color: classification.color }} />
            </div>
            <div>
              <h4 className="font-bold text-sm text-text-primary mb-2">Institutional Refinance Threshold</h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                Current LTV ({currentLTV.toFixed(1)}%) is evaluated against institutional loan standards. 
                Lenders generally require an LTV below <strong className="text-text-primary">80%</strong> to bypass risk premiums or private mortgage insurance. 
                {isAllCash ? (
                  ` With zero leverage, this property possesses the maximum possible equity cushion.`
                ) : (
                  ` Your current equity cushion provides a ${fmtUSD(equityCushion)} buffer before hitting the 80% refinancing boundary.`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Refinance Simulation Card */}
        {refySimulation && (
          <div className="bg-bg-surface border border-border-accent rounded-xl p-6 flex items-center justify-between group cursor-pointer hover:border-primary/40 transition-all duration-300">
            <div className="flex flex-col">
              <span className="text-on-surface-variant font-label-sm text-label-sm tracking-widest uppercase mb-1">Refinance Simulation</span>
              <h3 className="text-on-surface font-headline-md text-headline-md">Target: {refySimulation.targetLTV.toFixed(1)}% LTV</h3>
              <p className="text-xs text-text-secondary mt-1">Requires {fmtUSD(refySimulation.reductionNeeded)} principal reduction or appraisal increase</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center luminous-primary-glow group-hover:scale-110 transition-transform duration-300">
              <ArrowRight className="w-5 h-5 text-on-primary font-bold" />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
