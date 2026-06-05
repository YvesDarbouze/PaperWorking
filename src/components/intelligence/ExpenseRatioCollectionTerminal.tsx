'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle2, Building2, Percent, PieChart,
} from 'lucide-react';
import { computeOER } from '@/lib/metrics/reiMetrics';

/* ═══════════════════════════════════════════════════════════════
   EXPENSE RATIO COLLECTION TERMINAL
   Collects operating expense line-items and gross rental income,
   computes Expense Ratio = (Operating Expenses ÷ Gross Income) × 100
   Seed: $9,276 ÷ $23,400 = 39.64%

   Dual-scope: Project (individual) + Data Room (cumulative)
   ═══════════════════════════════════════════════════════════════ */

export interface ExpenseItem {
  id: string;
  label: string;
  monthlyAmount: number;
  color: string;
}

export interface ExpenseRatioValues {
  grossMonthlyRent: number;
  grossAnnualRent: number;
  totalMonthlyExpenses: number;
  totalAnnualExpenses: number;
  expenseRatio: number;
  items: ExpenseItem[];
  zone: 'excellent' | 'efficient' | 'review';
}

interface ExpenseRatioCollectionTerminalProps {
  defaults?: Partial<{
    grossMonthlyRent: number;
    items: ExpenseItem[];
  }>;
  onValuesChange?: (values: ExpenseRatioValues) => void;
  className?: string;
}

/* ── Seed expense breakdown matching $9,276 annual ── */
const SEED_ITEMS: ExpenseItem[] = [
  { id: '1', label: 'Property Taxes',    monthlyAmount: 279, color: '#20B2AA' },
  { id: '2', label: 'Insurance',         monthlyAmount: 155, color: '#38bdf8' },
  { id: '3', label: 'Utilities',         monthlyAmount: 95,  color: '#64748b' },
  { id: '4', label: 'Property Mgmt',     monthlyAmount: 195, color: '#fb923c' },
  { id: '5', label: 'Maintenance',       monthlyAmount: 49,  color: '#fbbf24' },
];
// Total: 773/mo × 12 = $9,276

const COLORS = ['#20B2AA', '#38bdf8', '#64748b', '#fb923c', '#fbbf24', '#3f7d20', '#F06543', '#94a3b8'];

/* ── Zone configuration ── */
const ZONE_CFG = {
  excellent: { label: 'Excellent', color: '#3f7d20', range: '<35%', icon: CheckCircle2 },
  efficient: { label: 'Efficient', color: '#fbbf24', range: '35–45%', icon: TrendingUp },
  review:    { label: 'Review',    color: '#F06543', range: '>45%',  icon: AlertTriangle },
} as const;

function getZone(ratio: number): 'excellent' | 'efficient' | 'review' {
  if (ratio < 35) return 'excellent';
  if (ratio <= 45) return 'efficient';
  return 'review';
}

/* ═══════════════════════════════════════════════════════════════
   EXPENSE LINE ITEM ROW
   ═══════════════════════════════════════════════════════════════ */

function ExpenseRow({
  item,
  totalExpenses,
  onChange,
  onRemove,
}: {
  item: ExpenseItem;
  totalExpenses: number;
  onChange: (updated: ExpenseItem) => void;
  onRemove: () => void;
}) {
  const pctOfTotal = totalExpenses > 0 ? (item.monthlyAmount / totalExpenses) * 100 : 0;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/[0.04] group">
      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: item.color }}
      />

      {/* Label */}
      <input
        type="text"
        value={item.label}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
        className="flex-1 bg-transparent text-sm text-slate-300 font-medium focus:outline-none
                   border-b border-transparent focus:border-white/20 transition-all"
        placeholder="Expense category"
      />

      {/* Monthly amount */}
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-slate-600">$</span>
        <input
          type="number"
          value={item.monthlyAmount}
          onChange={(e) => onChange({ ...item, monthlyAmount: Math.max(0, Number(e.target.value) || 0) })}
          min={0}
          className="w-16 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1 text-xs text-slate-300
                     font-mono tabular-nums text-right focus:outline-none focus:border-[#20B2AA]/30 transition-all"
        />
        <span className="text-[9px] text-slate-600">/mo</span>
      </div>

      {/* % of total */}
      <span className="text-[10px] font-bold tabular-nums w-10 text-right" style={{ color: item.color }}>
        {pctOfTotal.toFixed(0)}%
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="text-slate-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs"
        title="Remove"
      >
        ×
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MINI DONUT
   ═══════════════════════════════════════════════════════════════ */

function ExpenseDonut({ items, totalExpenses }: { items: ExpenseItem[]; totalExpenses: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  let cumOffset = 0;

  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
      {items.map((item) => {
        const pct = totalExpenses > 0 ? item.monthlyAmount / totalExpenses : 0;
        const segLen = circ * pct;
        const gap = circ - segLen;
        const offset = cumOffset;
        cumOffset += segLen;
        return (
          <circle
            key={item.id}
            cx="36"
            cy="36"
            r={r}
            fill="none"
            stroke={item.color}
            strokeWidth="8"
            strokeDasharray={`${segLen} ${gap}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 36 36)"
            className="transition-all duration-500"
          />
        );
      })}
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export function ExpenseRatioCollectionTerminal({
  defaults = {},
  onValuesChange,
  className = '',
}: ExpenseRatioCollectionTerminalProps) {
  const [grossMonthlyRent, setGrossMonthlyRent] = useState(defaults.grossMonthlyRent ?? 1950);
  const [items, setItems] = useState<ExpenseItem[]>(defaults.items ?? SEED_ITEMS);

  /* ── Computations ── */
  const computed = useMemo(() => {
    const totalMonthlyExpenses = items.reduce((sum, i) => sum + i.monthlyAmount, 0);
    const grossAnnualRent = grossMonthlyRent * 12;
    const totalAnnualExpenses = totalMonthlyExpenses * 12;
    const expenseRatio = computeOER(totalAnnualExpenses, grossAnnualRent);
    const zone = getZone(expenseRatio);

    return {
      grossMonthlyRent,
      grossAnnualRent,
      totalMonthlyExpenses,
      totalAnnualExpenses,
      expenseRatio,
      items,
      zone,
    };
  }, [grossMonthlyRent, items]);

  const stableOnChange = useCallback((values: ExpenseRatioValues) => {
    onValuesChange?.(values);
  }, [onValuesChange]);

  useEffect(() => {
    stableOnChange(computed);
  }, [computed, stableOnChange]);

  /* ── Item management ── */
  const handleItemChange = useCallback((idx: number, updated: ExpenseItem) => {
    setItems(prev => prev.map((item, i) => i === idx ? updated : item));
  }, []);

  const handleRemoveItem = useCallback((idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, {
      id: String(Date.now()),
      label: '',
      monthlyAmount: 0,
      color: COLORS[prev.length % COLORS.length],
    }]);
  }, []);

  /* ── Zone styling ── */
  const zoneCfg = ZONE_CFG[computed.zone];
  const ZoneIcon = zoneCfg.icon;

  /* ── Gradient bar position (25% to 60% mapped to 0-100) ── */
  const markerPct = Math.min(Math.max(((computed.expenseRatio - 25) / 35) * 100, 0), 100);

  return (
    <div
      className={`rounded-xl border border-white/10 p-6 space-y-4 ${className}`}
      style={{ background: 'rgba(24,33,39,0.7)', backdropFilter: 'blur(16px)' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#20B2AA]/10 flex items-center justify-center">
            <PieChart className="w-4 h-4 text-[#20B2AA]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Expense Ratio</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Operating Costs Collection
            </p>
          </div>
        </div>
        <span
          className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: zoneCfg.color,
            borderColor: `${zoneCfg.color}40`,
            background: `${zoneCfg.color}10`,
          }}
        >
          <ZoneIcon className="w-3 h-3 inline mr-0.5" />
          {zoneCfg.label}
        </span>
      </div>

      {/* ── Result hero ── */}
      <div
        className="rounded-xl border p-4 flex items-center justify-between transition-all duration-500"
        style={{ borderColor: `${zoneCfg.color}30`, background: `${zoneCfg.color}08` }}
      >
        <div className="flex items-center gap-3">
          <ExpenseDonut items={items} totalExpenses={computed.totalMonthlyExpenses} />
          <div>
            <p className="text-xs font-bold" style={{ color: zoneCfg.color }}>
              {computed.expenseRatio < 40 ? 'Below' : 'At'} the 40% threshold
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              ${computed.totalAnnualExpenses.toLocaleString()} of ${computed.grossAnnualRent.toLocaleString()} gross income
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-4xl font-bold tabular-nums tracking-tighter" style={{ color: zoneCfg.color }}>
            {computed.expenseRatio.toFixed(1)}
          </span>
          <span className="text-lg font-bold ml-0.5" style={{ color: zoneCfg.color }}>%</span>
          <p className="text-[9px] text-slate-600 mt-0.5">expense ratio</p>
        </div>
      </div>

      {/* ── Gradient zone bar ── */}
      <div className="space-y-1">
        <div
          className="relative h-2.5 rounded-full overflow-hidden"
          style={{ background: 'linear-gradient(to right, #3f7d20 0%, #fbbf24 50%, #F06543 100%)' }}
        >
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-[#091015] shadow transition-all duration-500"
            style={{ left: `${markerPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-slate-600">
          <span>Excellent &lt;35%</span>
          <span>Efficient 35–45%</span>
          <span>Review &gt;45%</span>
        </div>
      </div>

      {/* ── Gross Rental Income input ── */}
      <div className="px-3 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Gross Monthly Rent
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-600">$</span>
            <input
              type="number"
              value={grossMonthlyRent}
              onChange={(e) => setGrossMonthlyRent(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              className="w-24 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1.5 text-sm text-white
                         font-mono tabular-nums text-right focus:outline-none focus:border-[#20B2AA]/30 transition-all"
            />
            <span className="text-[9px] text-slate-600">/mo</span>
          </div>
        </div>
        <p className="text-[9px] text-slate-600 mt-1">
          Annual: ${computed.grossAnnualRent.toLocaleString()} — excludes vacancy (not an operating expense)
        </p>
      </div>

      {/* ── Expense line items ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
            Operating Expenses
          </span>
          <span className="text-[10px] font-bold tabular-nums text-slate-400">
            ${computed.totalMonthlyExpenses.toLocaleString()}/mo
          </span>
        </div>

        <div className="max-h-56 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <ExpenseRow
              key={item.id}
              item={item}
              totalExpenses={computed.totalMonthlyExpenses}
              onChange={(u) => handleItemChange(idx, u)}
              onRemove={() => handleRemoveItem(idx)}
            />
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between py-2 mt-1 border-t border-white/10">
          <span className="text-xs font-bold text-white">Total Annual OpEx</span>
          <span className="text-xs font-bold tabular-nums" style={{ color: zoneCfg.color }}>
            ${computed.totalAnnualExpenses.toLocaleString()}
          </span>
        </div>

        {/* Add expense */}
        <button
          onClick={handleAddItem}
          className="w-full py-2 mt-1 rounded-lg border border-dashed border-white/10 text-[10px] font-bold text-slate-500
                     hover:border-[#20B2AA]/30 hover:text-[#20B2AA] transition-all flex items-center justify-center gap-1"
        >
          + Add Expense
        </button>
      </div>

      {/* ── Formula ── */}
      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Formula</p>
        <p className="text-[11px] text-slate-400 font-mono">
          Expense Ratio = (${computed.totalAnnualExpenses.toLocaleString()} ÷ ${computed.grossAnnualRent.toLocaleString()}) × 100 = {computed.expenseRatio.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
