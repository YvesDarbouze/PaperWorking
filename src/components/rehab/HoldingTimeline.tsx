'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/store/projectStore';
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  Calendar,
  DollarSign,
  Flame,
  Shield,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   Holding & Timeline Module — Phase 3 (Engine Room)

   Four live instruments:
   1. Project Timeline — elapsed days + 166-day alert
   2. Per-Diem Interest — daily loan cost × elapsed days (ticking)
   3. Monthly Holding Costs — aggregate from holdingCosts[]
   4. Total Project Cost Basis — purchase + rehab + holding
   ═══════════════════════════════════════════════════════ */

const WARNING_DAYS = 166;

function fmt(n: number, decimals = 0): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function MetricRow({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em] leading-tight pt-0.5 flex-shrink-0">
        {label}
      </span>
      <div className="text-right">
        <span className={`tabular-nums font-black text-sm ${accent ? 'text-red-500' : 'text-pw-black'}`}>
          {value}
        </span>
        {sub && (
          <p className="text-[9px] text-pw-muted font-bold tracking-wide mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-pw-border mb-4">
      <Icon className="w-3.5 h-3.5 text-pw-muted" />
      <span className="text-[9px] font-black text-pw-black uppercase tracking-[0.3em]">{title}</span>
    </div>
  );
}

export default function HoldingTimeline() {
  const currentProject = useProjectStore(s => s.currentProject);
  const updateProjectFinancials = useProjectStore(s => s.updateProjectFinancials);

  // Live per-diem accumulator (ticks every second)
  const [interestNow, setInterestNow] = useState(0);
  const [acquisitionDateInput, setAcquisitionDateInput] = useState('');

  // ── Acquisition date (user-set or fallback to holdingCostClockStart) ──
  const resolvedAcquisitionDate: Date | null = (() => {
    if (currentProject?.financials?.acquisitionDate) {
      return new Date(currentProject.financials.acquisitionDate);
    }
    if (currentProject?.holdingCostClockStart) {
      return new Date(currentProject.holdingCostClockStart);
    }
    return null;
  })();

  // ── Sync input field from project ──
  useEffect(() => {
    const d = currentProject?.financials?.acquisitionDate;
    if (d) {
      setAcquisitionDateInput(new Date(d).toISOString().split('T')[0]);
    } else if (currentProject?.holdingCostClockStart) {
      setAcquisitionDateInput(new Date(currentProject.holdingCostClockStart).toISOString().split('T')[0]);
    } else {
      setAcquisitionDateInput('');
    }
  }, [currentProject?.id]);

  // ── Derived timeline values ──
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const elapsedDays = resolvedAcquisitionDate
    ? Math.max(0, Math.floor((Date.now() - resolvedAcquisitionDate.getTime()) / 86_400_000))
    : 0;

  const daysUntilWarning = Math.max(0, WARNING_DAYS - elapsedDays);
  const warningTriggered = elapsedDays > WARNING_DAYS;
  const timelinePercent = Math.min(100, (elapsedDays / WARNING_DAYS) * 100);

  // ── Loan / Per-diem ──
  const loanAmount = currentProject?.financials?.loanAmount || 0;
  const interestRate = currentProject?.financials?.loanInterestRate || 0;
  const perDiemRate = loanAmount > 0 && interestRate > 0
    ? (loanAmount * (interestRate / 100)) / 365
    : 0;
  const perDiemPerSecond = perDiemRate / 86_400;
  const totalInterestToDate = perDiemRate * elapsedDays;

  // Live ticker: adds per-second interest on top of the full-days total
  useEffect(() => {
    if (perDiemPerSecond === 0) { setInterestNow(totalInterestToDate); return; }

    // Seed with seconds elapsed today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const secondsToday = Math.floor((Date.now() - todayStart.getTime()) / 1000);
    setInterestNow(totalInterestToDate + perDiemPerSecond * secondsToday);

    const id = setInterval(() => {
      setInterestNow(prev => prev + perDiemPerSecond);
    }, 1000);
    return () => clearInterval(id);
  }, [currentProject?.id, totalInterestToDate, perDiemPerSecond]);

  // ── Monthly Holding Costs ──
  const holdingCosts = currentProject?.holdingCosts ?? [];
  const monthlyHoldingTotal = holdingCosts.reduce(
    (sum, c) => sum + (c.monthlyAmount || 0), 0
  );
  // Exclude loan interest from monthly holding (tracked separately via per-diem)
  const monthlyNonInterest = holdingCosts
    .filter(c => c.type !== 'Loan Interest')
    .reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);

  const elapsedMonths = elapsedDays / 30.44;
  const holdingCostsToDate = monthlyNonInterest * elapsedMonths;

  // ── Total Project Cost Basis ──
  const f = currentProject?.financials;
  const purchasePrice = f?.purchasePrice || 0;
  const approvedRehab = (f?.costs || [])
    .filter(c => c.approved)
    .reduce((sum, c) => sum + c.amount, 0);
  const totalCostBasis = purchasePrice + approvedRehab + holdingCostsToDate + interestNow;

  // ── Persist acquisition date ──
  const handleAcquisitionDateChange = useCallback((val: string) => {
    setAcquisitionDateInput(val);
    if (!currentProject?.id) return;
    updateProjectFinancials(currentProject.id, {
      acquisitionDate: val ? new Date(val) : undefined,
    });
  }, [currentProject?.id, updateProjectFinancials]);

  if (!currentProject) {
    return (
      <div className="border border-pw-border bg-pw-surface p-8 text-center">
        <p className="text-[9px] font-black text-pw-muted/40 uppercase tracking-[0.3em]">
          No active deal selected
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0 border border-pw-black overflow-hidden">

      {/* ── Header ── */}
      <div className="px-6 py-4 bg-pw-black flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-white" />
          <div>
            <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.4em]">
              Phase_03 · Engine Room
            </p>
            <h2 className="text-sm font-black text-white uppercase tracking-[0.2em]">
              Holding & Timeline
            </h2>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">
            Clock Status
          </p>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${resolvedAcquisitionDate ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
            <p className="text-[9px] font-mono text-white/60">
              {resolvedAcquisitionDate ? 'ACTIVE' : 'NOT STARTED'}
            </p>
          </div>
        </div>
      </div>

      {/* ── 166-Day Warning Banner ── */}
      <AnimatePresence>
        {warningTriggered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-600 px-6 py-4 flex items-start gap-4">
              <Flame className="w-5 h-5 text-white flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="text-xs font-black text-white uppercase tracking-[0.3em]">
                  ⚠ 166-Day Threshold Exceeded — {elapsedDays} Days Elapsed
                </p>
                <p className="text-[10px] text-white/80 font-bold mt-1 leading-relaxed">
                  Hard money lenders typically expect exit or refinance within 166 days. Holding
                  costs are compounding — review your exit strategy immediately.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-6 space-y-6 bg-pw-surface">

        {/* ── Section 1: Project Timeline ── */}
        <div>
          <SectionHeader icon={Calendar} title="Project_Timeline" />

          {/* Acquisition date input */}
          <div className="mb-5 space-y-1.5">
            <label className="block text-[9px] font-black text-pw-muted uppercase tracking-[0.25em]">
              Acquisition Date
            </label>
            <div className="flex items-center gap-3">
              <div className="border border-pw-border bg-pw-bg focus-within:border-pw-black transition-colors flex-1">
                <input
                  type="date"
                  value={acquisitionDateInput}
                  onChange={e => handleAcquisitionDateChange(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs font-black text-pw-black bg-transparent outline-none cursor-pointer"
                />
              </div>
              {resolvedAcquisitionDate && (
                <span className="text-[9px] font-black text-pw-muted uppercase tracking-widest whitespace-nowrap">
                  {resolvedAcquisitionDate.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Elapsed days display */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="border border-pw-border bg-pw-bg p-4 text-center">
              <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em] mb-1">Elapsed</p>
              <p className={`text-3xl font-black tabular-nums leading-none ${warningTriggered ? 'text-red-600' : 'text-pw-black'}`}>
                {elapsedDays}
              </p>
              <p className="text-[9px] font-black text-pw-muted mt-1">DAYS</p>
            </div>
            <div className="border border-pw-border bg-pw-bg p-4 text-center">
              <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em] mb-1">Threshold</p>
              <p className="text-3xl font-black tabular-nums leading-none text-pw-black">
                {WARNING_DAYS}
              </p>
              <p className="text-[9px] font-black text-pw-muted mt-1">DAYS</p>
            </div>
            <div className="border border-pw-border bg-pw-bg p-4 text-center">
              <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em] mb-1">
                {warningTriggered ? 'Overrun' : 'Remaining'}
              </p>
              <p className={`text-3xl font-black tabular-nums leading-none ${warningTriggered ? 'text-red-600' : 'text-green-700'}`}>
                {warningTriggered ? elapsedDays - WARNING_DAYS : daysUntilWarning}
              </p>
              <p className="text-[9px] font-black text-pw-muted mt-1">DAYS</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">
                Timeline Progress
              </span>
              <span className="text-[9px] font-black text-pw-black tabular-nums">
                {timelinePercent.toFixed(0)}% of 166-day window
              </span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(timelinePercent, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full ${
                  warningTriggered ? 'bg-red-500' :
                  timelinePercent > 75 ? 'bg-amber-500' :
                  'bg-pw-black'
                }`}
              />
            </div>
          </div>
        </div>

        {/* ── Section 2: Per-Diem Interest Tracker ── */}
        <div>
          <SectionHeader icon={Flame} title="Per_Diem_Interest_Tracker" />

          {loanAmount > 0 && interestRate > 0 ? (
            <div className="space-y-4">
              {/* Live ticker */}
              <div className="bg-pw-black p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black text-white/50 uppercase tracking-[0.3em] mb-1">
                    Total Interest Bled
                  </p>
                  <p className="text-3xl font-black text-red-400 tabular-nums font-mono">
                    ${interestNow.toFixed(2)}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Daily</p>
                    <p className="text-sm font-black text-white tabular-nums">
                      ${perDiemRate.toFixed(2)}/day
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Per Second</p>
                    <p className="text-xs font-black text-white/60 tabular-nums">
                      ${perDiemPerSecond.toFixed(6)}/sec
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <MetricRow
                  label="Loan Amount"
                  value={fmt(loanAmount)}
                />
                <MetricRow
                  label="Interest Rate"
                  value={`${interestRate}% APR`}
                />
                <MetricRow
                  label="Days Elapsed"
                  value={`${elapsedDays} days`}
                />
                <div className="border-t border-pw-border pt-2">
                  <MetricRow
                    label="Formula"
                    value={`${fmt(loanAmount)} × ${interestRate}% ÷ 365 × ${elapsedDays}d`}
                    sub={`= ${fmt(totalInterestToDate, 2)} interest to date`}
                    accent
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-pw-border p-6 text-center">
              <p className="text-[9px] font-black text-pw-muted/40 uppercase tracking-[0.3em]">
                Set loan amount & interest rate in Evaluation → Capital to activate
              </p>
            </div>
          )}
        </div>

        {/* ── Section 3: Monthly Holding Costs ── */}
        <div>
          <SectionHeader icon={DollarSign} title="Monthly_Holding_Costs" />

          {holdingCosts.filter(c => c.type !== 'Loan Interest').length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {holdingCosts
                  .filter(c => c.type !== 'Loan Interest' && c.monthlyAmount > 0)
                  .map(c => (
                    <div key={c.id} className="flex items-center justify-between border border-pw-border bg-pw-bg px-3 py-2">
                      <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.15em]">
                        {c.type}
                      </span>
                      <span className="text-xs font-black text-pw-black tabular-nums">
                        {fmt(c.monthlyAmount)}/mo
                      </span>
                    </div>
                  ))}
              </div>

              <div className="border-t border-pw-border pt-3 space-y-2">
                <MetricRow
                  label="Total Monthly (non-interest)"
                  value={`${fmt(monthlyNonInterest)}/mo`}
                />
                <MetricRow
                  label="Elapsed Months"
                  value={elapsedMonths.toFixed(1)}
                />
                <div className="border-t border-pw-border pt-2">
                  <MetricRow
                    label="Holding Costs to Date"
                    value={fmt(holdingCostsToDate, 2)}
                    sub={`${fmt(monthlyNonInterest)}/mo × ${elapsedMonths.toFixed(1)} months`}
                    accent
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-pw-border p-6 text-center">
              <p className="text-[9px] font-black text-pw-muted/40 uppercase tracking-[0.3em]">
                Add recurring costs in the Holding Cost Ticker below
              </p>
            </div>
          )}
        </div>

        {/* ── Section 4: Total Project Cost Basis ── */}
        <div>
          <SectionHeader icon={TrendingUp} title="Total_Project_Cost_Basis" />

          <div className="bg-pw-bg border border-pw-border p-5 space-y-3">
            <MetricRow
              label="Purchase Price"
              value={fmt(purchasePrice)}
            />
            <MetricRow
              label="Total Actual Rehab"
              value={fmt(approvedRehab)}
              sub="Approved costs only"
            />
            <MetricRow
              label="Holding Costs to Date"
              value={fmt(holdingCostsToDate, 2)}
              sub="Monthly recurring × elapsed months"
            />
            <MetricRow
              label="Interest Bled to Date"
              value={`$${interestNow.toFixed(2)}`}
              sub="Live accumulating"
              accent
            />

            {/* Divider + Total */}
            <div className="border-t-2 border-pw-black pt-4 mt-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black text-pw-muted uppercase tracking-[0.3em] mb-1">
                    Total Cost Basis
                  </p>
                  <p className="text-[9px] font-bold text-pw-muted">
                    Purchase + Rehab + Holding + Interest
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-pw-black tabular-nums">
                    ${totalCostBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  {f?.estimatedARV && f.estimatedARV > 0 && (
                    <p className={`text-[9px] font-black mt-1 ${
                      f.estimatedARV > totalCostBasis ? 'text-green-700' : 'text-red-600'
                    }`}>
                      {fmt(f.estimatedARV - totalCostBasis)} spread to ARV
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ARV vs Cost Basis visual spread */}
          {f?.estimatedARV && f.estimatedARV > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">
                  Cost Basis vs ARV
                </span>
                <span className="text-[9px] font-black text-pw-black tabular-nums">
                  {((totalCostBasis / f.estimatedARV) * 100).toFixed(1)}% of ARV consumed
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((totalCostBasis / f.estimatedARV) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full ${
                    totalCostBasis / f.estimatedARV > 0.85 ? 'bg-red-500' :
                    totalCostBasis / f.estimatedARV > 0.7 ? 'bg-amber-500' :
                    'bg-pw-black'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="flex items-start gap-2 pt-2 border-t border-pw-border">
          <Shield className="w-3 h-3 text-pw-muted flex-shrink-0 mt-0.5" />
          <p className="text-[9px] font-bold text-pw-muted leading-relaxed">
            Per-diem interest and cost basis recalculate every dashboard load. No manual input required
            for live accumulation — set your acquisition date once to start the clock.
          </p>
        </div>

      </div>
    </div>
  );
}
