'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  DollarSign,
  Map,
  ChevronRight,
  Download,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  getFullMarketplaceData,
  initiateMarketplaceAudit,
  type FullMarketplaceData,
  type JurisdictionStat,
} from '@/actions/marketplace';

/* ═══════════════════════════════════════════════════════
   Admin Marketplace Analytics — P0-4
   All figures computed from real vendor + quote-request
   data. Export CSV downloads a real file. Initiate Audit
   writes a vendorAuditRuns Firestore document.
   ═══════════════════════════════════════════════════════ */

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtHours(h: number): string {
  if (h === 0) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)} hrs`;
}

// ── CSV export (client-side Blob download) ────────────

function downloadCsv(data: FullMarketplaceData) {
  const header = [
    'Request ID',
    'Project ID',
    'Vendor UID',
    'Vendor Name',
    'Vendor Type',
    'Status',
    'Quoted Fee ($)',
    'Requested At',
    'Completed At',
    'Primary State',
  ].join(',');

  const rows = data.csvRows.map((r) =>
    [
      r.requestId,
      r.projectId,
      r.vendorUid,
      `"${r.vendorName.replace(/"/g, '""')}"`,
      r.vendorType,
      r.status,
      r.quotedFee ?? '',
      r.requestedAt,
      r.completedAt,
      r.primaryState,
    ].join(','),
  );

  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `marketplace-variance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary p-12 lg:p-16 space-y-16 animate-pulse">
      <div className="h-12 w-64 bg-pw-border rounded" />
      <div className="grid grid-cols-4 gap-px">
        {[...Array(4)].map((_, i) => <div key={i} className="h-52 bg-bg-surface" />)}
      </div>
      <div className="grid grid-cols-3 gap-16">
        <div className="col-span-2 h-96 bg-bg-surface" />
        <div className="h-96 bg-bg-surface" />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  trend,
  trendPositive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendPositive?: boolean;
}) {
  return (
    <div className="bg-bg-surface p-10 flex flex-col justify-between h-52 transition-colors hover:bg-pw-dashboard">
      <div className="flex justify-between items-start">
        <div className="p-3 border border-border-accent bg-pw-dashboard text-text-primary">
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-1">
            {trendPositive
              ? <TrendingUp className="w-3 h-3" />
              : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-text-secondary mb-2">{label}</p>
        <div className="flex items-end justify-between">
          <h4 className="text-4xl font-black text-text-primary tracking-tighter">{value}</h4>
          {sub && <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function JurisdictionRow({ stat, globalMean }: { stat: JurisdictionStat; globalMean: number }) {
  const _ = globalMean; // consumed by parent
  return (
    <div className="flex items-center justify-between p-6 transition-colors hover:bg-pw-dashboard">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 border border-border-accent bg-pw-dashboard flex items-center justify-center text-text-secondary">
          <Map className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-black text-text-primary uppercase tracking-tighter">{stat.state}</p>
          <p className="text-xs text-text-secondary font-black uppercase tracking-widest mt-0.5">
            {stat.count} quote{stat.count !== 1 ? 's' : ''} · Fee Benchmark
          </p>
        </div>
      </div>
      <div className="flex items-center gap-12">
        <div className="text-right">
          <p className="text-lg font-black text-text-primary tracking-tight">
            {fmtMoney(stat.avgFee)}
          </p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            {stat.trend === 'up'
              ? <TrendingUp className="w-3 h-3 text-text-secondary" />
              : stat.trend === 'down'
              ? <TrendingDown className="w-3 h-3 text-text-secondary" />
              : null}
            <span className="text-xs font-black text-text-primary uppercase tracking-tighter">
              {stat.deviation.toFixed(1)}% VAR
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary" />
      </div>
    </div>
  );
}

function FunnelStep({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-xs font-black uppercase tracking-widest text-text-secondary">{label}</p>
        <p className="text-xs font-black tracking-tight text-text-primary">
          {value.toLocaleString()}{' '}
          <span className="text-xs text-text-secondary ml-1">({pct}%)</span>
        </p>
      </div>
      <div className="h-1 w-full bg-pw-dashboard">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────

export default function MarketplaceAnalytics() {
  const [data, setData] = useState<FullMarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getFullMarketplaceData();
      setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleExportCsv = () => {
    if (!data) return;
    if (data.csvRows.length === 0) {
      toast('No vendor request data to export yet.', { icon: 'ℹ️' });
      return;
    }
    downloadCsv(data);
    toast.success(`Exported ${data.csvRows.length} rows to CSV`);
  };

  const handleInitiateAudit = async () => {
    setAuditing(true);
    try {
      const result = await initiateMarketplaceAudit();
      if (!result) {
        toast.error('Audit failed — insufficient permissions.');
        return;
      }
      toast.success(
        result.flaggedCount > 0
          ? `Audit complete. ${result.flaggedCount} stale pending request${result.flaggedCount !== 1 ? 's' : ''} flagged (run: ${result.runId.slice(0, 8)}…)`
          : `Audit complete — no stale pending requests found (run: ${result.runId.slice(0, 8)}…)`,
        { duration: 6000 },
      );
    } catch {
      toast.error('Audit action failed. Check server logs.');
    } finally {
      setAuditing(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (!data) return null;

  const { pipeline } = data;
  const processEfficiency =
    pipeline.requested > 0
      ? (pipeline.finalized / pipeline.requested).toFixed(2) + 'x'
      : '—';

  // Compute global mean for jurisdiction variance advisory
  const globalMeanFee =
    data.jurisdictions.length > 0
      ? data.jurisdictions.reduce((sum, j) => sum + j.avgFee * j.count, 0) /
        data.jurisdictions.reduce((sum, j) => sum + j.count, 0)
      : 0;

  const highestVariance = data.jurisdictions.reduce(
    (max, j) => (j.deviation > (max?.deviation ?? 0) ? j : max),
    data.jurisdictions[0] as JurisdictionStat | undefined,
  );

  return (
    <div className="min-h-screen bg-bg-primary p-12 lg:p-16">
      {/* Header */}
      <header className="mb-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-text-secondary mb-3">
              Marketplace Intelligence
            </p>
            <h1 className="text-5xl font-black text-text-primary tracking-tighter uppercase">
              Marketplace Audits
            </h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportCsv}
              disabled={data.csvRows.length === 0}
              className="px-8 py-4 bg-bg-surface border border-border-accent text-xs font-black uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary hover:border-pw-black transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export Variance (CSV)
            </button>
            <button
              onClick={handleInitiateAudit}
              disabled={auditing}
              className="px-8 py-4 bg-pw-black text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-pw-fg transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {auditing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              {auditing ? 'Running Audit…' : 'Initiate Performance Audit'}
            </button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-pw-border border border-border-accent mb-16">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Active Professionals"
          value={data.activeProfessionals.toLocaleString()}
          sub={`${data.totalVendors} total`}
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Request Match Rate"
          value={pipeline.requested > 0 ? fmtPct(data.matchRatePct) : '—'}
          sub="Ecosystem Liquidity"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Response Time"
          value={fmtHours(data.avgResponseHours)}
          sub={data.avgResponseHours > 0 ? 'completed requests' : 'no data yet'}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Gross Procured Volume"
          value={fmtMoney(data.grossProcuredVolume)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
        {/* Jurisdiction Variance */}
        <div className="xl:col-span-2 bg-bg-surface p-12 border border-border-accent">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-2xl font-black text-text-primary tracking-tighter uppercase">
                Jurisdiction Variance
              </h3>
              <p className="text-xs font-black text-text-secondary mt-2 uppercase tracking-widest leading-relaxed">
                Cross-state pricing consistency audit · by vendor licensing state
              </p>
            </div>
            <span className="text-xs font-black text-text-secondary uppercase tracking-widest mt-1">
              {data.jurisdictions.length > 0 ? `${data.jurisdictions.length} states` : 'No quoted fees yet'}
            </span>
          </div>

          {data.jurisdictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <BarChart3 className="w-8 h-8 opacity-20" />
              <p className="text-sm font-black text-text-primary uppercase tracking-tighter">
                No quoted fees on record
              </p>
              <p className="text-xs text-text-secondary">
                Fee variance data will appear once vendors submit quotes.
              </p>
            </div>
          ) : (
            <>
              <div className="border border-border-accent divide-y divide-pw-border">
                {data.jurisdictions.map((stat) => (
                  <JurisdictionRow key={stat.state} stat={stat} globalMean={globalMeanFee} />
                ))}
              </div>

              {highestVariance && highestVariance.deviation > 0 && (
                <div className="mt-12 p-8 bg-pw-black text-white flex items-start gap-8">
                  <Zap className="w-10 h-10 text-white shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-50">
                      Strategic Advisory
                    </p>
                    <p className="text-sm font-medium leading-relaxed">
                      {highestVariance.state} shows the highest fee variance at{' '}
                      {highestVariance.deviation.toFixed(1)}% above the global average (
                      {fmtMoney(highestVariance.avgFee)} avg vs {fmtMoney(globalMeanFee)} mean).
                      Consider onboarding additional professionals in this jurisdiction to
                      increase competitive pressure and stabilize procurement costs.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Liquidity Funnel */}
        <div className="bg-bg-surface border border-border-accent p-12 flex flex-col">
          <h3 className="text-2xl font-black text-text-primary uppercase tracking-tighter mb-2">
            Liquidity Funnel
          </h3>
          <p className="text-text-secondary text-xs font-black uppercase tracking-widest mb-16">
            Request-to-Engagement Pipeline
          </p>

          {pipeline.requested === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
              <Activity className="w-8 h-8 opacity-20" />
              <p className="text-xs font-black text-text-secondary uppercase tracking-widest">
                No vendor requests yet
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-12">
              <FunnelStep
                label="Quotes Requested"
                value={pipeline.requested}
                total={pipeline.requested}
                color="bg-pw-black"
              />
              <FunnelStep
                label="Fees Logged"
                value={pipeline.feesLogged}
                total={pipeline.requested}
                color="bg-pw-phase-4"
              />
              <FunnelStep
                label="Quotes Approved"
                value={pipeline.approved}
                total={pipeline.requested}
                color="bg-pw-phase-3"
              />
              <FunnelStep
                label="Engagements Finalized"
                value={pipeline.finalized}
                total={pipeline.requested}
                color="bg-pw-phase-2"
              />
            </div>
          )}

          <div className="mt-16 pt-12 border-t border-border-accent">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 border border-pw-black flex items-center justify-center">
                {pipeline.finalized > 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-text-primary" />
                ) : (
                  <TrendingUp className="w-6 h-6 text-text-primary" />
                )}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
                  Process Efficiency
                </p>
                <p className="text-3xl font-black text-text-primary tracking-tighter">
                  {processEfficiency}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
