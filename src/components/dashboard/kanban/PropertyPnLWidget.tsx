'use client';

import React from 'react';
import { Project } from '@/types/schema';
import { computeFlipMetrics, computeHoldMetrics } from '@/lib/financials/dealMetrics';
import { AlertTriangle, X } from 'lucide-react';

interface PropertyPnLWidgetProps {
  deal: Project;
  mode: 'compact' | 'expanded';
  trackMode: 'FLIP' | 'HOLD';
  onClose?: () => void;
}

function Row({ label, value, emphasis, positive, negative }: {
  label: string;
  value: string;
  emphasis?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  const valueClass = emphasis
    ? 'text-sm font-black text-pw-black tabular-nums'
    : positive
    ? 'text-xs font-black text-green-700 tabular-nums'
    : negative
    ? 'text-xs font-black text-red-600 tabular-nums'
    : 'text-xs font-light text-pw-black tabular-nums';

  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-pw-border/20" />;
}

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function FlipView({ deal }: { deal: Project }) {
  const m = computeFlipMetrics(deal);

  return (
    <div className="space-y-2">
      {/* ARV & MAO */}
      <Row label="ARV" value={fmt(m.arv)} />
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black text-pw-muted uppercase tracking-[0.2em]">MAO</span>
        <span className={`text-xs tabular-nums font-black flex items-center gap-1 ${m.maoViolated ? 'text-red-600' : 'text-pw-black'}`}>
          {fmt(m.mao)}
          {m.maoViolated && <AlertTriangle className="w-3 h-3 text-red-500" />}
        </span>
      </div>

      <Divider />

      {/* Rehab Budget */}
      <div className="space-y-1.5">
        <Row label="Rehab Budget" value={fmt(m.rehabBudget)} />
        <Row
          label="Actual Spend"
          value={fmt(m.rehabActual)}
          negative={m.rehabActual > m.rehabBudget}
        />
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-gray-100">
          <div
            className={`h-full transition-all duration-700 ${m.rehabPct >= 1 ? 'bg-red-500' : 'bg-pw-black'}`}
            style={{ width: `${Math.min(m.rehabPct * 100, 100)}%` }}
          />
        </div>
        <Row
          label="Delta"
          value={`${m.rehabDelta >= 0 ? '+' : ''}${fmt(m.rehabDelta)}`}
          positive={m.rehabDelta >= 0}
          negative={m.rehabDelta < 0}
        />
      </div>

      {m.hasBurnRate && (
        <>
          <Divider />
          <Row label="Daily Burn" value={`$${m.dailyBurnRate.toFixed(0)}/day`} />
        </>
      )}

      <Divider />

      {/* Bottom line */}
      <Row
        label="Net Projected Profit"
        value={`${m.netProjectedProfit >= 0 ? '' : '-'}${fmt(m.netProjectedProfit)}`}
        emphasis
        positive={m.netProjectedProfit >= 0}
        negative={m.netProjectedProfit < 0}
      />
      <Row
        label="ROI"
        value={pct(m.roi)}
        positive={m.roi >= 15}
        negative={m.roi < 0}
      />
    </div>
  );
}

function HoldView({ deal }: { deal: Project }) {
  const m = computeHoldMetrics(deal);

  return (
    <div className="space-y-2">
      {/* Income */}
      <Row label="Monthly Rent" value={fmt(m.monthlyRent)} />
      <Row label="Vacancy Loss" value={`-${fmt(m.vacancyLoss)}`} negative={m.vacancyLoss > 0} />
      <Row label="Maintenance" value={`-${fmt(m.maintenanceCost)}`} negative={m.maintenanceCost > 0} />
      <Row label="Mgmt Fee" value={`-${fmt(m.mgmtFee)}`} negative={m.mgmtFee > 0} />

      <Divider />

      <Row label="NOI (Monthly)" value={fmt(m.noi)} emphasis />
      <Row label="Mortgage" value={`-${fmt(m.mortgagePayment)}`} negative={m.mortgagePayment > 0} />
      <Row
        label="Cash Flow"
        value={`${m.monthlyCashFlow >= 0 ? '+' : '-'}${fmt(m.monthlyCashFlow)}/mo`}
        positive={m.monthlyCashFlow >= 0}
        negative={m.monthlyCashFlow < 0}
      />

      <Divider />

      <Row label="Total Invested" value={fmt(m.totalInvested)} />
      <Row
        label="Cash-on-Cash Yield"
        value={pct(m.cashOnCashYield)}
        positive={m.cashOnCashYield >= 8}
        negative={m.cashOnCashYield < 0}
      />
    </div>
  );
}

export default function PropertyPnLWidget({ deal, mode, trackMode, onClose }: PropertyPnLWidgetProps) {
  const isExpanded = mode === 'expanded';

  return (
    <div className={`bg-gray-50 space-y-3 ${isExpanded ? 'p-6' : 'p-4'}`}>
      {isExpanded && (
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-black text-pw-black uppercase tracking-[0.2em]">
            {trackMode === 'FLIP' ? 'Flip Analysis' : 'Hold Analysis'}
          </p>
          {onClose && (
            <button onClick={onClose} className="text-pw-muted hover:text-pw-black transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {trackMode === 'FLIP' ? <FlipView deal={deal} /> : <HoldView deal={deal} />}
    </div>
  );
}
