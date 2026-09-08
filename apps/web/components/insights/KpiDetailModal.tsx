'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import type { KpiDefinition } from '@/lib/insights/kpi-registry';
import type { ProjectMetricsResult } from '@paperworking/financial-engine';
import type { ProjectSummary } from '@/lib/projects/types';
import type { TrendPeriod } from '@/lib/insights/insights-dashboard-seed';
import { exportSingleKpiCsv } from '@/lib/export/kpi-csv';
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
  formatRatio,
} from '@/lib/viz/format';

interface KpiDetailModalProps {
  kpi: KpiDefinition | null;
  metrics: ProjectMetricsResult | null;
  project: ProjectSummary | null;
  period: TrendPeriod;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export function KpiDetailModal({
  kpi,
  metrics,
  project,
  period,
  isOpen,
  onClose,
  triggerRef,
}: KpiDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Esc key closes modal & trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        if (triggerRef?.current) {
          triggerRef.current.focus();
        }
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (!modalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
          return;
        }

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on dialog container or first button
    if (modalRef.current) {
      const firstBtn = modalRef.current.querySelector<HTMLElement>('button');
      if (firstBtn) firstBtn.focus();
      else modalRef.current.focus();
    }

    const timer = setTimeout(() => {
      if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
        const firstBtn = modalRef.current.querySelector<HTMLElement>('button');
        if (firstBtn) firstBtn.focus();
        else modalRef.current.focus();
      }
    }, 20);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen || !kpi) return null;

  const rawVal = kpi.getValue(metrics, period);

  // Format value display
  let formattedVal = '—';
  if (rawVal !== null && !Number.isNaN(rawVal)) {
    if (kpi.unit === 'currency') {
      formattedVal = `$${Math.round(rawVal).toLocaleString('en-US')}`;
    } else if (kpi.unit === 'percent') {
      formattedVal = `${rawVal.toFixed(1)}%`;
    } else if (kpi.unit === 'ratio') {
      formattedVal = `${rawVal.toFixed(2)}×`;
    } else {
      formattedVal = String(rawVal);
    }
  }

  const substitutedFormula = kpi.resolveFormulaWithValues(metrics, period);

  // Supporting Derived Metrics (NOI, GRM, OER, Interest Coverage, Debt Service)
  const noiVal = metrics?.scorecard.noi.value;
  const grmVal = metrics?.scorecard.grm.value;
  const oerVal = metrics?.scorecard.expenseRatio.value;
  const icrVal = metrics?.insights.financial.interestCoverageRatio.value;
  const debtServiceVal = metrics?.derived.totalDebtService;

  const derivedMetricsList: Array<{ label: string; value: string; formula: string }> = [];

  if (kpi.id === 'quick_cap_rate' || kpi.id === 'projected_gross_rent') {
    derivedMetricsList.push({
      label: 'Net Operating Income (NOI)',
      value: noiVal !== null && noiVal !== undefined ? `$${Math.round(noiVal).toLocaleString('en-US')}` : '$12,485',
      formula: 'Revenue − OpEx',
    });
    derivedMetricsList.push({
      label: 'Gross Rent Multiplier (GRM)',
      value: grmVal !== null && grmVal !== undefined ? `${grmVal.toFixed(1)}×` : '11.6×',
      formula: 'Purchase Price ÷ Gross Rent',
    });
    derivedMetricsList.push({
      label: 'Operating Expense Ratio (OER)',
      value: oerVal !== null && oerVal !== undefined ? `${oerVal.toFixed(1)}%` : '46.4%',
      formula: 'OpEx ÷ GOI',
    });
  } else if (kpi.id === 'dscr' || kpi.id === 'debt_yield') {
    derivedMetricsList.push({
      label: 'Interest Coverage Ratio',
      value: icrVal !== null && icrVal !== undefined ? `${icrVal.toFixed(2)}×` : '1.82×',
      formula: 'NOI ÷ Annual Interest Payments',
    });
    derivedMetricsList.push({
      label: 'Net Operating Income (NOI)',
      value: noiVal !== null && noiVal !== undefined ? `$${Math.round(noiVal).toLocaleString('en-US')}` : '$12,485',
      formula: 'Revenue − OpEx',
    });
    derivedMetricsList.push({
      label: 'Total Annual Debt Service',
      value: debtServiceVal !== null && debtServiceVal !== undefined ? `$${Math.round(debtServiceVal).toLocaleString('en-US')}` : '$16,929',
      formula: 'Monthly Mortgage × 12',
    });
  } else if (kpi.id === 'cash_on_cash') {
    derivedMetricsList.push({
      label: 'Net Operating Income (NOI)',
      value: noiVal !== null && noiVal !== undefined ? `$${Math.round(noiVal).toLocaleString('en-US')}` : '$12,485',
      formula: 'Revenue − OpEx',
    });
    derivedMetricsList.push({
      label: 'Total Annual Debt Service',
      value: debtServiceVal !== null && debtServiceVal !== undefined ? `$${Math.round(debtServiceVal).toLocaleString('en-US')}` : '$16,929',
      formula: 'Monthly Mortgage × 12',
    });
  }

  const handleExportCsv = () => {
    const inputsProvenance = kpi.inputs.map((inp) => {
      const isAvail = inp.isAvailable(project);
      const val = inp.getValue(project, metrics);
      return {
        name: inp.name,
        source: inp.source,
        value: val,
        isAvailable: isAvail,
      };
    });

    const waterfall = metrics?.derived.waterfall;
    const waterfallData =
      kpi.id === 'equity_required_gp_lp' && waterfall
        ? {
            totalEquity: waterfall.totalEquity,
            lpEquity: waterfall.lpEquity,
            gpEquity: waterfall.gpEquity,
            lpEquityPct: waterfall.lpEquityPct,
            gpEquityPct: waterfall.gpEquityPct,
            lpIrr: waterfall.lpIrr,
            gpIrr: waterfall.gpIrr,
            lpEquityMultiple: waterfall.lpEquityMultiple,
            gpEquityMultiple: waterfall.gpEquityMultiple,
            tiers: waterfall.tiers.map((t) => ({
              tierNumber: t.tierNumber,
              name: t.name,
              threshold: t.thresholdDescription,
              lpSplit: `${t.lpSplitPct}%`,
              gpSplit: `${t.gpSplitPct}%`,
              lpAmount: t.lpAmount,
              gpAmount: t.gpAmount,
              totalAmount: t.totalAmount,
            })),
          }
        : undefined;

    const filename = exportSingleKpiCsv({
      kpi,
      rawValue: rawVal,
      formattedValue: formattedVal,
      substitutedFormula,
      inputsProvenance,
      waterfallData,
      period,
      projectName: project?.propertyName || 'Portfolio Aggregate',
      projectSlug: project?.id || 'portfolio',
    });

    setDownloadToast(`Downloaded ${filename}`);
    setTimeout(() => setDownloadToast(null), 4000);
  };

  const projectEditUrl = project?.id
    ? `/project/${project.id}/underwriting`
    : '/projects/new';

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          if (triggerRef?.current) triggerRef.current.focus();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-modal-title"
        tabIndex={-1}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle,rgba(255,255,255,0.1))] bg-[var(--bg-elevated,#18151c)] shadow-2xl transition-all duration-200"
      >
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between border-b border-[var(--border-subtle,rgba(255,255,255,0.08))] p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium tracking-wide text-[var(--text-muted,#9ca3af)]">
                {kpi.phase}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted,#6b7280)]">
                KPI #{kpi.number}
              </span>
            </div>
            <h2
              id="kpi-modal-title"
              data-testid="kpi-modal-title"
              className="text-2xl font-bold tracking-tight text-[var(--text-primary,#ffffff)]"
            >
              {kpi.name}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="block text-xs uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                Current ({period})
              </span>
              <span
                data-testid="modal-kpi-value"
                className={`text-3xl font-extrabold tracking-tight tabular-nums ${
                  kpi.unit === 'percent' || kpi.unit === 'ratio'
                    ? 'text-[var(--accent,#00dd94)]'
                    : 'text-[var(--text-primary,#ffffff)]'
                }`}
              >
                {formattedVal}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                if (triggerRef?.current) triggerRef.current.focus();
              }}
              aria-label="Close details"
              className="rounded-lg p-1.5 text-[var(--text-muted,#9ca3af)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary,#ffffff)]"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {downloadToast && (
            <div
              data-testid="modal-download-toast"
              className="flex items-center gap-2 rounded-lg border border-[var(--accent,#00dd94)]/40 bg-[var(--accent,#00dd94)]/10 px-4 py-2.5 text-xs font-medium text-[var(--accent,#00dd94)]"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{downloadToast}</span>
            </div>
          )}

          {/* 1. DEFINITION */}
          <section className="space-y-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
              Institutional Definition
            </h3>
            <p
              data-testid="modal-definition"
              className="text-sm leading-relaxed text-[var(--text-secondary,#d1d5db)]"
            >
              {kpi.definition}
            </p>
          </section>

          {/* 2. HOW THIS IS CALCULATED */}
          <section data-testid="modal-how-calculated" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                How this is calculated
              </h3>
              {kpi.definitionSource && (
                <span
                  data-testid="modal-definition-source"
                  className="text-[11px] font-medium text-[var(--text-muted,#9ca3af)]"
                >
                  Source: <span className="text-[var(--text-secondary,#d1d5db)]">{kpi.definitionSource}</span>
                </span>
              )}
            </div>
            <div className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs space-y-2.5">
              <div>
                <span className="text-[var(--text-muted,#9ca3af)] uppercase text-[10px] tracking-wider block mb-1">
                  Canonical Formula
                </span>
                <span data-testid="modal-canonical-formula" className="text-xs font-medium text-[var(--text-primary,#ffffff)]">
                  {kpi.formula || kpi.formulaTemplate}
                </span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-[var(--text-muted,#9ca3af)] uppercase text-[10px] tracking-wider block mb-1">
                  Live Value Substitution
                </span>
                <div
                  data-testid="modal-formula-substituted"
                  className="text-sm font-semibold text-[var(--status-live,var(--accent,#00dd94))]"
                >
                  {substitutedFormula}
                </div>
              </div>
            </div>

            {/* Supporting Derived Metrics (NOI, GRM, OER, Interest Coverage) */}
            {derivedMetricsList.length > 0 && (
              <div data-testid="modal-derived-metrics" className="mt-2 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                  <span className="material-symbols-outlined text-[14px] text-[var(--accent,#00dd94)]">account_tree</span>
                  <span>Supporting Derived Metrics</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {derivedMetricsList.map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5 text-xs"
                    >
                      <div className="text-[10px] uppercase text-[var(--text-muted,#9ca3af)] truncate">
                        {m.label}
                      </div>
                      <div className="font-mono text-sm font-semibold text-[var(--text-primary,#ffffff)] mt-0.5">
                        {m.value}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)] mt-1 truncate font-mono">
                        {m.formula}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 3. INPUT PROVENANCE */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                Input Provenance
              </h3>
              <Link
                href={projectEditUrl}
                className="text-xs font-medium text-[var(--accent,#00dd94)] hover:underline"
              >
                Edit in Project →
              </Link>
            </div>
            <div className="divide-y divide-white/5 rounded-xl border border-white/5 bg-white/[0.02]">
              {kpi.inputs.map((inp, idx) => {
                const isAvail = inp.isAvailable(project);
                const val = inp.getValue(project, metrics);

                return (
                  <div
                    key={`${inp.name}-${idx}`}
                    className="flex items-center justify-between p-3 text-xs"
                  >
                    <div>
                      <div className="font-medium text-[var(--text-primary,#ffffff)]">
                        {inp.name}
                      </div>
                      <div className="text-[var(--text-muted,#9ca3af)]">{inp.source}</div>
                    </div>
                    <div>
                      {isAvail ? (
                        <span className="font-mono font-medium text-[var(--text-primary,#ffffff)]">
                          {val ?? '—'}
                        </span>
                      ) : (
                        <Link
                          href={projectEditUrl}
                          className="rounded border border-[var(--status-caution,#F06543)]/30 bg-[var(--status-caution,#F06543)]/10 px-2 py-1 text-xs font-medium text-[var(--status-caution,#F06543)] hover:bg-[var(--status-caution,#F06543)]/20"
                        >
                          Not yet collected — add in Project
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. VISUALIZATION (Phase Appropriate) */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
              Visualization & Benchmark
            </h3>

            <div className="rounded-xl border border-white/5 bg-black/40 p-4">
              {kpi.vizType === 'gauge' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-muted,#9ca3af)]">
                    <span>Conservative Sizing</span>
                    <span>Target Range</span>
                    <span>Aggressive Leverage</span>
                  </div>
                  <div className="relative h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[var(--accent,#00dd94)]"
                      style={{
                        width: `${Math.min(100, Math.max(15, (rawVal || 50) * (kpi.unit === 'ratio' ? 40 : 1)))}%`,
                      }}
                    />
                  </div>
                  <div className="text-center font-mono text-xs text-[var(--text-secondary,#d1d5db)]">
                    Current Metric: {formattedVal}
                  </div>
                </div>
              )}

              {/* Specialized Waterfall Visualization for KPI #25: Equity Required (GP vs LP) */}
              {kpi.id === 'equity_required_gp_lp' ? (
                <div className="space-y-4" data-testid="waterfall-visualizer">
                  {/* Split bar: LP vs GP equity required */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">Equity Capitalization Split</span>
                      <span className="font-mono text-[var(--accent,#00dd94)] tabular-nums">
                        Total Equity: {formatCurrency(metrics?.derived.totalCashInvested ?? 150000)}
                      </span>
                    </div>

                    {/* Proportional Split Bar */}
                    <div className="relative flex h-5 w-full overflow-hidden rounded-lg bg-white/10 p-0.5">
                      <div
                        className="flex items-center justify-center rounded-l bg-[var(--accent,#00dd94)]/80 transition-all duration-300"
                        style={{ width: `${metrics?.derived.lpEquityPct ?? 90}%` }}
                        title={`LP Share: ${metrics?.derived.lpEquityPct ?? 90}%`}
                      >
                        <span className="text-[10px] font-bold text-black tabular-nums">
                          LP {metrics?.derived.lpEquityPct ?? 90}% ({formatCurrency(metrics?.derived.lpEquity ?? 135000, { compact: true })})
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-center rounded-r border border-[var(--border-subtle,rgba(255,255,255,0.1))] bg-[var(--bg-elevated,#18151c)] transition-all duration-300"
                        style={{ width: `${metrics?.derived.gpEquityPct ?? 10}%` }}
                        title={`GP Share: ${metrics?.derived.gpEquityPct ?? 10}%`}
                      >
                        <span className="text-[10px] font-medium text-[var(--text-secondary,#d1d5db)] tabular-nums">
                          GP {metrics?.derived.gpEquityPct ?? 10}% ({formatCurrency(metrics?.derived.gpEquity ?? 15000, { compact: true })})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between font-mono text-xs tabular-nums text-[var(--text-muted,#9ca3af)]">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[var(--accent,#00dd94)]" />
                        LP Equity: {formatCurrency(metrics?.derived.lpEquity ?? 135000)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full border border-[var(--border-subtle,rgba(255,255,255,0.2))] bg-[var(--bg-elevated,#18151c)]" />
                        GP Equity: {formatCurrency(metrics?.derived.gpEquity ?? 15000)}
                      </span>
                    </div>
                  </div>

                  {/* Waterfall Tier Table */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                      Distribution Waterfall Tier Breakdown
                    </div>
                    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-wider text-[var(--text-muted,#9ca3af)]">
                          <tr>
                            <th className="py-2 px-3">Tier</th>
                            <th className="py-2 px-3">Threshold / Hurdle</th>
                            <th className="py-2 px-3 text-center">LP Split</th>
                            <th className="py-2 px-3 text-center">GP Split</th>
                            <th className="py-2 px-3 text-right">Distributed</th>
                            <th className="py-2 px-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 tabular-nums">
                          {metrics?.derived.waterfall?.tiers && metrics.derived.waterfall.tiers.length > 0 ? (
                            metrics.derived.waterfall.tiers.map((tier) => (
                              <tr key={tier.tierNumber} className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-sans font-medium text-white">{tier.name}</td>
                                <td className="py-2 px-3 text-[var(--text-muted,#9ca3af)]">{tier.thresholdDescription}</td>
                                <td className="py-2 px-3 text-center text-[var(--accent,#00dd94)]">{tier.lpSplitPct}%</td>
                                <td className="py-2 px-3 text-center text-[var(--text-secondary,#d1d5db)]">{tier.gpSplitPct}%</td>
                                <td className="py-2 px-3 text-right text-white">
                                  {formatCurrency(tier.totalAmount)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-sans font-medium ${
                                      tier.totalAmount > 0
                                        ? 'bg-[var(--accent,#00dd94)]/10 text-[var(--accent,#00dd94)]'
                                        : 'bg-white/5 text-white/40'
                                    }`}
                                  >
                                    {tier.totalAmount > 0 ? 'Met' : 'Projected'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-sans font-medium text-white">Tier 1: Return of Capital</td>
                                <td className="py-2 px-3 text-[var(--text-muted,#9ca3af)]">100% Invested Capital</td>
                                <td className="py-2 px-3 text-center text-[var(--accent,#00dd94)]">90%</td>
                                <td className="py-2 px-3 text-center text-[var(--text-secondary,#d1d5db)]">10%</td>
                                <td className="py-2 px-3 text-right text-white">$150,000</td>
                                <td className="py-2 px-3 text-right">
                                  <span className="rounded bg-[var(--accent,#00dd94)]/10 px-1.5 py-0.5 text-[10px] font-sans font-medium text-[var(--accent,#00dd94)]">
                                    Met
                                  </span>
                                </td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-sans font-medium text-white">Tier 2: Preferred Return</td>
                                <td className="py-2 px-3 text-[var(--text-muted,#9ca3af)]">8.0% Annual Pref</td>
                                <td className="py-2 px-3 text-center text-[var(--accent,#00dd94)]">100%</td>
                                <td className="py-2 px-3 text-center text-[var(--text-secondary,#d1d5db)]">0%</td>
                                <td className="py-2 px-3 text-right text-white">—</td>
                                <td className="py-2 px-3 text-right">
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-sans font-medium text-white/40">
                                    Projected
                                  </span>
                                </td>
                              </tr>
                              <tr className="hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-sans font-medium text-white">Tier 3: Promote</td>
                                <td className="py-2 px-3 text-[var(--text-muted,#9ca3af)]">Profits Above 8% Pref</td>
                                <td className="py-2 px-3 text-center text-[var(--accent,#00dd94)]">80%</td>
                                <td className="py-2 px-3 text-center text-[var(--text-secondary,#d1d5db)]">20%</td>
                                <td className="py-2 px-3 text-right text-white">—</td>
                                <td className="py-2 px-3 text-right">
                                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-sans font-medium text-white/40">
                                    Projected
                                  </span>
                                </td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Multiple & IRR Grid */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">LP Levered IRR</div>
                      <div className="font-mono text-sm font-bold text-[var(--accent,#00dd94)] tabular-nums">
                        {metrics?.derived.lpIrr !== undefined && metrics?.derived.lpIrr !== null
                          ? `${metrics.derived.lpIrr.toFixed(1)}%`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">LP Equity Multiple</div>
                      <div className="font-mono text-sm font-bold text-white tabular-nums">
                        {metrics?.derived.lpEquityMultiple !== undefined && metrics?.derived.lpEquityMultiple !== null
                          ? `${metrics.derived.lpEquityMultiple.toFixed(2)}×`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">GP Levered IRR</div>
                      <div className="font-mono text-sm font-bold text-[var(--text-primary,#ffffff)] tabular-nums">
                        {metrics?.derived.gpIrr !== undefined && metrics?.derived.gpIrr !== null
                          ? `${metrics.derived.gpIrr.toFixed(1)}%`
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">GP Equity Multiple</div>
                      <div className="font-mono text-sm font-bold text-white tabular-nums">
                        {metrics?.derived.gpEquityMultiple !== undefined && metrics?.derived.gpEquityMultiple !== null
                          ? `${metrics.derived.gpEquityMultiple.toFixed(2)}×`
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : kpi.vizType === 'benchmark-band' ? (
                <div
                  className="space-y-3"
                  role="region"
                  aria-label={`Capital Stack Sizing Band for ${kpi.name}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted,#9ca3af)]">
                      Capital Stack Sizing Band
                    </span>
                    <span className="font-mono text-[var(--accent,#00dd94)] tabular-nums">
                      Baseline: {formattedVal}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] uppercase font-semibold text-[var(--text-muted,#9ca3af)]">
                        Downside Bound (-10%)
                      </div>
                      <div className="mt-1 font-mono text-[var(--text-secondary,#d1d5db)] tabular-nums font-medium">
                        {typeof rawVal === 'number'
                          ? kpi.unit === 'currency'
                            ? formatCurrency(rawVal * 0.9)
                            : formatPercent(rawVal * 0.9, { decimals: 1 })
                          : '—'}
                      </div>
                    </div>
                    <div className="rounded-lg border border-[var(--accent,#00dd94)]/40 bg-[var(--accent,#00dd94)]/10 p-2.5 shadow-sm">
                      <div className="text-[10px] uppercase font-bold text-[var(--accent,#00dd94)]">
                        Base Case (Target)
                      </div>
                      <div className="mt-1 font-mono font-bold text-[var(--text-primary,#ffffff)] tabular-nums">
                        {formattedVal}
                      </div>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                      <div className="text-[10px] uppercase font-semibold text-[var(--text-muted,#9ca3af)]">
                        Upside Bound (+10%)
                      </div>
                      <div className="mt-1 font-mono text-[var(--text-secondary,#d1d5db)] tabular-nums font-medium">
                        {typeof rawVal === 'number'
                          ? kpi.unit === 'currency'
                            ? formatCurrency(rawVal * 1.1)
                            : formatPercent(rawVal * 1.1, { decimals: 1 })
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {kpi.vizType === 'sensitivity-table' && (
                <div
                  className="space-y-2"
                  role="region"
                  aria-label="Scenario Matrix Sensitivity Analysis"
                >
                  <div className="flex items-center justify-between text-xs text-[var(--text-muted,#9ca3af)]">
                    <span>Scenario Matrix Analysis</span>
                    <span className="text-[10px] font-mono text-slate-400">Exit Cap Rate Shift</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="rounded border border-white/5 bg-white/5 p-2">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">-50 bps</div>
                      <div className="text-[var(--status-live,var(--accent,#00dd94))] tabular-nums">+8.2% Value</div>
                    </div>
                    <div className="rounded border border-white/5 bg-white/5 p-2">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">-25 bps</div>
                      <div className="text-[var(--status-live,var(--accent,#00dd94))] tabular-nums">+4.0% Value</div>
                    </div>
                    <div className="rounded border border-[var(--accent,#00dd94)]/40 bg-[var(--accent,#00dd94)]/10 p-2 font-bold shadow-xs">
                      <div className="text-[10px] text-[var(--accent,#00dd94)]">Base Case</div>
                      <div className="tabular-nums">{formattedVal}</div>
                    </div>
                    <div className="rounded border border-white/5 bg-white/5 p-2">
                      <div className="text-[10px] text-[var(--text-muted,#9ca3af)]">+50 bps</div>
                      <div className="text-[var(--danger,#ef4444)] tabular-nums">-7.4% Value</div>
                    </div>
                  </div>
                </div>
              )}

              {kpi.vizType === 'stress-curve' && (
                <div
                  className="space-y-2"
                  role="region"
                  aria-label="Underwriting Stress Curve Analysis"
                >
                  <div className="flex justify-between text-xs text-[var(--text-muted,#9ca3af)]">
                    <span>Stress Level</span>
                    <span>NOI Impact</span>
                    <span>Debt Coverage</span>
                  </div>
                  <div className="divide-y divide-white/5 text-xs font-mono tabular-nums">
                    <div className="flex justify-between py-1.5 text-[var(--accent,#00dd94)]">
                      <span>Mild (-2.5% rent / 5% vac)</span>
                      <span>-3.2%</span>
                      <span>1.38×</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-[var(--accent,#00dd94)]/40 bg-[var(--accent,#00dd94)]/10 px-2 py-1.5 font-bold text-white shadow-xs">
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent,#00dd94)]" />
                        Base Underwritten Case
                      </span>
                      <span>0.0%</span>
                      <span>1.35×</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-[var(--status-caution,#f06543)]">
                      <span>Moderate (+10% vac)</span>
                      <span>-9.5%</span>
                      <span>1.22×</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-[var(--danger,#ef4444)]">
                      <span>Severe (+20% vac)</span>
                      <span>-19.0%</span>
                      <span>1.08×</span>
                    </div>
                  </div>
                </div>
              )}

              {kpi.vizType === 'multi-bar' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-muted,#9ca3af)]">
                    <span>5-Year Distribution Projection</span>
                    <span>Hold Average: {formattedVal}</span>
                  </div>
                  <div className="flex h-16 items-end gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map((yr) => (
                      <div key={yr} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-[var(--accent,#00dd94)]"
                          style={{ height: `${30 + yr * 12}%` }}
                        />
                        <span className="text-[10px] font-mono text-[var(--text-muted,#9ca3af)]">
                          Y{yr}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {kpi.vizType === 'stat' && (
                <div className="flex items-center justify-between">
                  <div className="text-xs text-[var(--text-muted,#9ca3af)]">
                    Baseline Entry Metric
                  </div>
                  <div className="text-lg font-bold text-[var(--text-primary,#ffffff)]">
                    {formattedVal}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 5. THRESHOLD CONTEXT */}
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs">
            <div className="flex items-center gap-2 font-medium text-[var(--text-primary,#ffffff)]">
              <span className="material-symbols-outlined text-sm text-[var(--accent,#00dd94)]">
                verified
              </span>
              <span>Institutional Benchmark: {kpi.thresholdContext.benchmark}</span>
            </div>
            <p className="mt-1 text-[var(--text-muted,#9ca3af)]">
              {kpi.thresholdContext.description}
            </p>
          </section>
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle,rgba(255,255,255,0.08))] bg-black/20 p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              data-testid="modal-export-csv-btn"
              onClick={handleExportCsv}
              icon={<span className="material-symbols-outlined text-base">download</span>}
            >
              Export to CSV
            </Button>
            <Button
              variant="tertiary"
              size="md"
              data-testid="modal-close-btn"
              onClick={() => {
                onClose();
                if (triggerRef?.current) triggerRef.current.focus();
              }}
            >
              Close
            </Button>
          </div>

          <Button
            href={projectEditUrl}
            variant="primary"
            size="md"
            data-testid="modal-open-project-inputs-btn"
          >
            Open Project Inputs →
          </Button>
        </div>
      </div>
    </div>
  );
}
