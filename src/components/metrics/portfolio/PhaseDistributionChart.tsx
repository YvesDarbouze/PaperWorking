'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ProjectFinancials } from '@/types/schema';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface PhaseDistributionDeal {
  currentPhase: number;
  financials: ProjectFinancials;
  address: string;
}

export interface PhaseDistributionChartProps {
  deals: PhaseDistributionDeal[];
  onPhaseClick?: (phase: number) => void;
  isLoading?: boolean;
  className?: string;
}

const PHASE_META: Record<number, { label: string; color: string; textColor: string }> = {
  1: { label: 'Acquisition',      color: '#A5A5A5', textColor: '#0D0D0D' },
  2: { label: 'Fund',             color: '#7A9EAA', textColor: '#FFFFFF' },
  3: { label: 'Hold',             color: '#595959', textColor: '#FFFFFF' },
  4: { label: 'Exit',             color: '#0D0D0D', textColor: '#FFFFFF' },
};

function safe(n: number | undefined | null): number {
  return n != null && isFinite(n) ? n : 0;
}

function fmtDollar(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${abs}`;
}

interface SliceData {
  phase: number;
  label: string;
  count: number;
  value: number;
  color: string;
  textColor: string;
}

function buildSlices(deals: PhaseDistributionDeal[]): SliceData[] {
  const buckets: Record<number, { count: number; value: number }> = {};

  for (const deal of deals) {
    const phase = deal.currentPhase ?? 1;
    if (!buckets[phase]) buckets[phase] = { count: 0, value: 0 };
    buckets[phase].count += 1;
    buckets[phase].value += safe(deal.financials.estimatedARV || deal.financials.actualSalePrice);
  }

  return Object.entries(buckets)
    .map(([phaseStr, data]) => {
      const phase = Number(phaseStr);
      const meta = PHASE_META[phase] ?? { label: `Phase ${phase}`, color: '#F2F2F2', textColor: '#0D0D0D' };
      return { phase, ...meta, ...data };
    })
    .sort((a, b) => a.phase - b.phase);
}

const shimmerCls = 'animate-pulse bg-pw-border/30 rounded';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: SliceData }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const s = payload[0].payload;
  return (
    <div className="bg-pw-surface border border-pw-border rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-mono text-[9px] text-pw-muted uppercase tracking-widest mb-1">Phase {s.phase} — {s.label}</p>
      <p className="font-mono text-pw-black">{s.count} deal{s.count !== 1 ? 's' : ''}</p>
      <p className="text-pw-muted">{fmtDollar(s.value)} total value</p>
    </div>
  );
}

function CenterLabel({ totalDeals, totalValue }: { totalDeals: number; totalValue: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <p className="text-2xl font-mono font-normal text-pw-black tracking-tight">{totalDeals}</p>
      <p className="text-[9px] font-mono text-pw-muted uppercase tracking-widest">Total Deals</p>
      <p className="text-xs font-mono text-pw-fg mt-1">{fmtDollar(totalValue)}</p>
    </div>
  );
}

export function PhaseDistributionChart({ deals, onPhaseClick, isLoading, className }: PhaseDistributionChartProps) {
  const [activePhase, setActivePhase] = useState<number | null>(null);
  const slices = useMemo(() => buildSlices(deals), [deals]);

  const totalDeals = deals.length;
  const totalValue = slices.reduce((s, sl) => s + sl.value, 0);

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-4 ${className ?? ''}`}>
        <div className={`h-4 w-40 ${shimmerCls}`} />
        <div className={`h-48 w-48 mx-auto rounded-full ${shimmerCls}`} />
      </div>
    );
  }

  const handleClick = (data: SliceData) => {
    const newPhase = activePhase === data.phase ? null : data.phase;
    setActivePhase(newPhase);
    if (onPhaseClick && newPhase != null) onPhaseClick(newPhase);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`rounded-2xl border border-pw-border bg-pw-surface p-6 space-y-5 ${className ?? ''}`}
    >
      <div>
        <p className="text-[10px] font-mono tracking-widest text-pw-subtle uppercase">Deals by Lifecycle Phase</p>
        <p className="text-[10px] text-pw-muted mt-0.5">Click a segment to filter — size reflects deal count</p>
      </div>

      {slices.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-pw-muted text-xs font-mono">
          No deals to display
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-[200px] h-[200px] flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={slices}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  onClick={(data: unknown) => handleClick(data as SliceData)}
                  style={{ cursor: 'pointer' }}
                  animationBegin={0}
                  animationDuration={800}
                >
                  {slices.map((s, i) => (
                    <Cell
                      key={i}
                      fill={s.color}
                      stroke={activePhase === s.phase ? '#454955' : 'transparent'}
                      strokeWidth={activePhase === s.phase ? 3 : 0}
                      opacity={activePhase == null || activePhase === s.phase ? 1 : 0.35}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <CenterLabel totalDeals={totalDeals} totalValue={totalValue} />
          </div>

          <div className="flex flex-col gap-2 flex-1 w-full">
            {slices.map(s => (
              <button
                key={s.phase}
                onClick={() => handleClick(s)}
                className="flex items-center gap-3 w-full text-left rounded-xl px-3 py-2 border transition-all"
                style={{
                  borderColor: activePhase === s.phase ? '#454955' : '#CCCCCC',
                  backgroundColor: activePhase === s.phase ? '#45495510' : 'transparent',
                  opacity: activePhase == null || activePhase === s.phase ? 1 : 0.5,
                }}
                aria-pressed={activePhase === s.phase}
                aria-label={`Filter by Phase ${s.phase}: ${s.label}`}
              >
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-pw-muted uppercase tracking-widest">Phase {s.phase}</p>
                  <p className="text-xs text-pw-fg font-medium truncate">{s.label}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-mono text-pw-black">{s.count}</p>
                  <p className="text-[9px] text-pw-muted font-mono">{fmtDollar(s.value)}</p>
                </div>
                <div
                  className="w-12 h-1 rounded-full"
                  style={{ backgroundColor: s.color, opacity: totalDeals > 0 ? s.count / totalDeals : 0 }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {activePhase != null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between text-[10px] text-pw-muted bg-pw-bg rounded-xl px-3 py-2 border border-pw-border"
        >
          <span>Filtering Phase {activePhase} — {PHASE_META[activePhase]?.label}</span>
          <button
            onClick={() => { setActivePhase(null); if (onPhaseClick) onPhaseClick(-1); }}
            className="font-mono text-pw-fg hover:text-pw-black transition-colors underline"
          >
            Clear
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
