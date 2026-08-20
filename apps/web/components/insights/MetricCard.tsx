interface MetricCardProps {
  name: string;
  value: string | number;
  category: string;
  trend?: 'up' | 'down' | 'flat';
  isWarning?: boolean;
}

export default function MetricCard({ name, value, category, trend, isWarning }: MetricCardProps) {
  const trendLabel =
    trend === 'up' ? '↑' : trend === 'down' ? '↓' : trend === 'flat' ? '→' : null;

  return (
    <article
      className="rounded-2xl border p-4"
      style={{
        borderColor: isWarning ? 'rgba(251,191,36,0.35)' : 'rgba(255,255,255,0.08)',
        background: isWarning ? 'rgba(251,191,36,0.06)' : 'rgba(255,255,255,0.03)',
      }}
    >
      <p className="text-[11px] uppercase tracking-[0.07em] text-white/45">{category}</p>
      <h3 className="mt-1 text-sm font-medium text-white/80">{name}</h3>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold tracking-[-0.02em]">{value}</p>
        {trendLabel ? (
          <span className="text-sm text-white/55" aria-label={`Trend ${trend}`}>
            {trendLabel}
          </span>
        ) : null}
      </div>
    </article>
  );
}
