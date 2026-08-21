'use client';

/** Vertical bar chart for Project Comparison — v0 PortfolioComparisonChart parity (no echarts). */

export interface ComparisonBarPoint {
  projectId: string;
  projectName: string;
  value: number;
}

const LOWER_IS_BETTER = new Set(['grm', 'ltv', 'oer', 'tenant_turnover', 'days_on_market']);

function truncateName(name: string) {
  return name.length > 16 ? `${name.slice(0, 13)}…` : name;
}

function formatVal(metricId: string, v: number) {
  const mId = metricId.toLowerCase();
  if (
    mId.includes('rate') ||
    mId === 'coc' ||
    mId === 'cash_on_cash' ||
    mId === 'oer' ||
    mId === 'ltv' ||
    mId === 'cap_rate'
  ) {
    return `${v.toFixed(1)}%`;
  }
  if (mId === 'dscr' || mId === 'grm') return v.toFixed(2);
  return String(v);
}

export default function ProjectComparisonChart({
  data,
  metricId,
  averageValue,
  height = 320,
}: {
  data: ComparisonBarPoint[];
  metricId: string;
  averageValue: number | null;
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-white/40"
      >
        No Data Available
      </div>
    );
  }

  const lowerIsBetter = LOWER_IS_BETTER.has(metricId.toLowerCase());
  const indexed = data.map((d, originalIndex) => ({ ...d, originalIndex }));
  const sorted = [...indexed].sort((a, b) => a.value - b.value);

  const topIdx = new Set<number>();
  const bottomIdx = new Set<number>();
  if (lowerIsBetter) {
    sorted.slice(0, Math.min(3, sorted.length)).forEach((i) => topIdx.add(i.originalIndex));
    sorted.slice(Math.max(0, sorted.length - 3)).forEach((i) => bottomIdx.add(i.originalIndex));
  } else {
    sorted.slice(Math.max(0, sorted.length - 3)).forEach((i) => topIdx.add(i.originalIndex));
    sorted.slice(0, Math.min(3, Math.max(0, sorted.length - 3))).forEach((i) => bottomIdx.add(i.originalIndex));
  }

  const maxVal = Math.max(...data.map((d) => d.value), averageValue ?? 0, 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => maxVal * t);

  return (
    <div style={{ height }} className="flex flex-col">
      <div className="relative min-h-0 flex-1">
        {/* Y grid */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between py-1 pl-8 pr-2">
          {yTicks
            .slice()
            .reverse()
            .map((tick) => (
              <div key={tick} className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-right text-[9px] tabular-nums text-slate-500">
                  {tick >= 10 ? tick.toFixed(0) : tick.toFixed(1)}
                </span>
                <div className="h-px flex-1 border-t border-dashed border-white/[0.06]" />
              </div>
            ))}
        </div>

        {/* Avg reference line */}
        {averageValue !== null ? (
          <div
            className="pointer-events-none absolute right-2 left-10 z-10 flex items-center"
            style={{ bottom: `${(averageValue / maxVal) * 100}%` }}
          >
            <div className="h-px flex-1 border-t border-dashed border-amber-400/80" />
            <span className="ml-2 shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-400">
              Avg: {formatVal(metricId, averageValue)}
            </span>
          </div>
        ) : null}

        {/* Bars */}
        <div className="absolute inset-0 flex items-end gap-4 pb-0 pl-10 pr-3 pt-6">
          {data.map((d, index) => {
            let color = '#6366f1';
            if (topIdx.has(index)) color = '#10b981';
            else if (bottomIdx.has(index)) color = '#ef4444';
            const hPct = Math.max(4, (d.value / maxVal) * 100);
            return (
              <div
                key={d.projectId}
                className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                title={`${d.projectName}: ${formatVal(metricId, d.value)}`}
              >
                <span className="mb-1 text-[10px] font-semibold tabular-nums text-white/70 opacity-0 transition-opacity group-hover:opacity-100">
                  {formatVal(metricId, d.value)}
                </span>
                <div
                  className="w-[40%] min-w-[28px] max-w-[72px] rounded-t transition-all duration-300"
                  style={{ height: `${hPct}%`, backgroundColor: color }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X labels */}
      <div className="mt-2 flex gap-4 border-t border-white/5 pt-2 pl-10 pr-3">
        {data.map((d) => (
          <div
            key={d.projectId}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-slate-400"
            title={d.projectName}
          >
            {truncateName(d.projectName)}
          </div>
        ))}
      </div>
    </div>
  );
}
