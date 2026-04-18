'use client';

import React, { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   70% Rule Audit — Final Margin Warning
   
   Formula: Total Capitalized Costs ≤ 70% of ARV - Repairs
   MAO (Maximum Allowable Offer) = (ARV × 0.70) - Repairs
   
   If totalCapitalizedCosts > MAO → "Margin Warning" flag
   ═══════════════════════════════════════════════════════ */

interface AuditBreakdown {
  label: string;
  amount: number;
}

export default function SeventyPercentRuleAudit() {
  const currentProject = useProjectStore(s => s.currentProject);
  const [showDetails, setShowDetails] = useState(false);

  const audit = useMemo(() => {
    if (!currentProject) return null;

    const fin = currentProject.financials;
    const arv = fin.estimatedARV || 0;
    const purchasePrice = fin.purchasePrice || 0;

    // ── Aggregate repair/rehab costs ──
    const rehabTasksCost = (fin.rehabTasks || []).reduce((s, t) => s + (t.estimatedCost || 0), 0);
    const rehabExpensesCost = (currentProject.rehabExpenses || []).reduce((s, e) => s + e.amount, 0);
    const projectedRehab = fin.projectedRehabCost || 0;
    // Use whichever is higher: projected vs actuals
    const totalRepairs = Math.max(projectedRehab, rehabTasksCost + rehabExpensesCost);

    // ── 70% Rule calculation ──
    const maxAllowable = (arv * 0.7) - totalRepairs;

    // ── Aggregate ALL capitalized costs ──
    const breakdown: AuditBreakdown[] = [];

    // Purchase price
    breakdown.push({ label: 'Purchase Price', amount: purchasePrice });

    // Acquisition costs (from CostBasisLedger)
    const cbLedger = currentProject.costBasisLedger;
    if (cbLedger) {
      const directTotal = (cbLedger.directAcquisition || []).reduce((s, i) => s + i.amount, 0);
      const financingTotal = (cbLedger.financing || []).reduce((s, i) => s + i.amount, 0);
      const preClosingTotal = (cbLedger.preClosing || []).reduce((s, i) => s + i.amount, 0);
      if (directTotal) breakdown.push({ label: 'Direct Acquisition Costs', amount: directTotal });
      if (financingTotal) breakdown.push({ label: 'Financing Costs', amount: financingTotal });
      if (preClosingTotal) breakdown.push({ label: 'Pre-Closing Costs', amount: preClosingTotal });
    }

    // Rehab/Repair costs
    if (totalRepairs > 0) breakdown.push({ label: 'Total Repairs & Rehab', amount: totalRepairs });

    // Holding costs
    const holdingTotal = (currentProject.holdingCosts || []).reduce((s, h) => s + (h.monthlyAmount * h.totalMonths), 0);
    if (holdingTotal > 0) breakdown.push({ label: 'Holding Costs', amount: holdingTotal });

    // Exit costs
    const actualSale = fin.actualSalePrice || arv;
    const exitCosts = (currentProject.exitCosts || []).reduce((s, c) => {
      if (c.isPercentage && c.percentageRate) {
        return s + (c.percentageRate / 100) * actualSale;
      }
      return s + c.amount;
    }, 0);
    if (exitCosts > 0) breakdown.push({ label: 'Exit Costs', amount: exitCosts });

    const totalCapitalized = breakdown.reduce((s, b) => s + b.amount, 0);

    // ── Status determination ──
    const isOverBudget = totalCapitalized > maxAllowable;
    const utilizationPct = maxAllowable > 0 ? (totalCapitalized / maxAllowable) * 100 : 0;
    const marginDollar = maxAllowable - totalCapitalized;

    // Severity levels
    let severity: 'safe' | 'warning' | 'danger';
    if (utilizationPct <= 85) severity = 'safe';
    else if (utilizationPct <= 100) severity = 'warning';
    else severity = 'danger';

    return {
      arv,
      totalRepairs,
      maxAllowable,
      totalCapitalized,
      breakdown,
      isOverBudget,
      utilizationPct: Math.min(utilizationPct, 150), // cap for UI
      marginDollar,
      severity,
      exitCosts,
      holdingTotal,
    };
  }, [currentProject]);

  if (!audit || audit.arv === 0) {
    return (
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex items-center gap-3">
        <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div>
          <p className="text-sm text-gray-600 font-medium">70% Rule Audit Unavailable</p>
          <p className="text-xs text-gray-400 mt-0.5">Set an estimated ARV in deal financials to enable this audit.</p>
        </div>
      </div>
    );
  }

  const severityConfig = {
    safe: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle2 className="w-7 h-7 text-green-500" />,
      title: 'Within Safe Margin',
      titleColor: 'text-green-900',
      barColor: 'bg-green-500',
      badge: 'bg-green-100 text-green-700',
      trend: <TrendingUp className="w-4 h-4 text-green-500" />,
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: <AlertTriangle className="w-7 h-7 text-amber-500" />,
      title: 'Margin Warning — Approaching 70% Threshold',
      titleColor: 'text-amber-900',
      barColor: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      trend: <TrendingDown className="w-4 h-4 text-amber-500" />,
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <ShieldAlert className="w-7 h-7 text-red-500 animate-pulse" />,
      title: '⚠ MARGIN BREACH — 70% Rule Exceeded',
      titleColor: 'text-red-900',
      barColor: 'bg-red-500',
      badge: 'bg-red-100 text-red-700',
      trend: <TrendingDown className="w-4 h-4 text-red-500" />,
    },
  };

  const cfg = severityConfig[audit.severity];

  return (
    <div className={`rounded-xl border-2 ${cfg.border} overflow-hidden`}>
      {/* Alert banner */}
      <div className={`${cfg.bg} p-6`}>
        <div className="flex items-start gap-4">
          {cfg.icon}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-lg font-semibold ${cfg.titleColor}`}>{cfg.title}</h3>
              <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
                {audit.utilizationPct.toFixed(0)}% utilized
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Total capitalized costs of <strong>${audit.totalCapitalized.toLocaleString()}</strong>{' '}
              {audit.isOverBudget ? 'exceed' : 'are within'} the 70% Rule maximum of{' '}
              <strong>${Math.max(0, audit.maxAllowable).toLocaleString()}</strong>.
            </p>
          </div>
          {cfg.trend}
        </div>

        {/* Formula display */}
        <div className="mt-4 p-4 bg-white/70 backdrop-blur rounded-lg border border-gray-200">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">70% Rule Formula</p>
          <div className="flex items-center gap-2 flex-wrap text-sm font-mono">
            <span className="text-gray-500">MAO =</span>
            <span className="text-gray-800">(${audit.arv.toLocaleString()} × 0.70)</span>
            <span className="text-gray-400">−</span>
            <span className="text-gray-800">${audit.totalRepairs.toLocaleString()}</span>
            <span className="text-gray-400">=</span>
            <span className={`font-semibold ${audit.maxAllowable >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              ${audit.maxAllowable.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>$0</span>
            <span>70% MAO: ${Math.max(0, audit.maxAllowable).toLocaleString()}</span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden relative">
            {/* 100% marker */}
            <div className="absolute top-0 bottom-0 w-px bg-gray-500 z-10" style={{ left: `${Math.min(100, (100 / Math.max(audit.utilizationPct, 100)) * 100)}%` }} />
            <div
              className={`h-full rounded-full transition-all duration-700 ${cfg.barColor}`}
              style={{ width: `${Math.min(audit.utilizationPct, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className="font-mono text-gray-700">${audit.totalCapitalized.toLocaleString()}</span>
            <span className={`font-mono font-semibold ${audit.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {audit.isOverBudget ? '−' : '+'}${Math.abs(audit.marginDollar).toLocaleString()} margin
            </span>
          </div>
        </div>
      </div>

      {/* Detail breakdown toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-between px-6 py-3 bg-white hover:bg-gray-50 transition border-t border-gray-100"
      >
        <span className="text-xs font-medium text-gray-600">Cost Breakdown</span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          {showDetails ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {showDetails && (
        <div className="px-6 py-4 bg-white space-y-2">
          {audit.breakdown.map((b, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600">{b.label}</span>
              <span className="text-sm font-mono text-gray-800">${b.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex items-center justify-between py-2 border-t-2 border-gray-200 mt-2">
            <span className="text-sm font-semibold text-gray-900">Total Capitalized</span>
            <span className={`text-sm font-mono font-bold ${audit.isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
              ${audit.totalCapitalized.toLocaleString()}
            </span>
          </div>

          {/* Margin status summary */}
          {audit.isOverBudget && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">
                    Costs exceed the 70% Rule by ${Math.abs(audit.marginDollar).toLocaleString()}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Consider renegotiating the purchase price, reducing rehab scope, or adjusting exit strategy to protect investor returns.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
