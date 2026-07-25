'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSearchTelemetryData } from '@/actions/telemetry';
import { 
  Loader2, 
  ArrowLeft, 
  Search, 
  MapPin, 
  Filter, 
  TrendingUp, 
  CheckCircle, 
  HelpCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TelemetryData {
  metrics: {
    totalSearches: number;
    zeroResultCount: number;
    zeroResultRate: number;
    resolutionRate: number;
    abandonmentCount: number;
  };
  conversions: {
    search: number;
    view: number;
    invitation: number;
    response: number;
    exchange: number;
    indication: number;
    subscribe: number;
    // legacy support fields
    interest: number;
    create: number;
  };
  filterCounts: Record<string, number>;
  topQueries: Array<{ query: string; count: number }>;
  zeroResultLog: Array<{ query: string; timestamp: string; sessionId: string }>;
}

export default function SearchTelemetryDashboard() {
  const { user, profile } = useAuth();
  const [data, setData] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const telemetryData = await getSearchTelemetryData(token);
        setData(telemetryData);
      } catch (err: any) {
        console.error('Failed to load search telemetry:', err);
        setError(err.message || 'Unauthorized access to telemetry dashboard.');
        toast.error('Unauthorized access to telemetry data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Gate access from Vendors
  if (profile?.role === 'Vendor' || profile?.accountType === 'vendor') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
        <h1 className="text-xl font-bold text-on-surface mb-2">Access Denied</h1>
        <p className="text-sm text-[var(--color-muted)] max-w-md">
          Search telemetry and funnel statistics are restricted to investor and administrator accounts.
        </p>
        <Link 
          href="/dashboard/command-center" 
          className="mt-6 px-5 h-11 flex items-center justify-center rounded-xl bg-primary text-on-primary font-bold text-sm"
        >
          Return to Command Center
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-[var(--color-muted)]">Assembling telemetry & conversion matrices…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-on-surface mb-2">Failed to Load Dashboard</h1>
        <p className="text-sm text-red-400/80 max-w-md">{error || 'Data payload unavailable.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-5 h-11 rounded-xl bg-surface-container-high border border-pw-border text-xs font-bold uppercase tracking-wider text-on-surface"
        >
          Retry Load
        </button>
      </div>
    );
  }

  // Calculate funnel conversions drop-offs
  const { conversions, metrics, filterCounts, topQueries, zeroResultLog } = data;

  const viewRate = conversions.search > 0 ? (conversions.view / conversions.search) * 100 : 0;
  const invitationRate = conversions.view > 0 ? (conversions.invitation / conversions.view) * 100 : 0;
  const responseRate = conversions.invitation > 0 ? (conversions.response / conversions.invitation) * 100 : 0;
  const exchangeRate = conversions.response > 0 ? (conversions.exchange / conversions.response) * 100 : 0;
  const indicationRate = conversions.exchange > 0 ? (conversions.indication / conversions.exchange) * 100 : 0;
  const subscriptionRate = conversions.search > 0 ? (conversions.subscribe / conversions.search) * 100 : 0;
  const dealCreateRate = conversions.search > 0 ? (conversions.create / conversions.search) * 100 : 0;

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link 
              href="/dashboard/insights" 
              className="p-2 rounded-lg border border-pw-border hover:bg-surface-container-high/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[var(--color-muted)]" />
            </Link>
            <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">
              Search Telemetry
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-muted)] pl-10">
            Marketplace search behaviors, funnel conversions, and the zero-result demand roadmap.
          </p>
        </div>
      </div>

      {/* ── Key Performance Indicators ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total searches */}
        <div className="glass-card rounded-2xl border border-pw-border p-5 relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/4 rounded-full blur-3xl pointer-events-none" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
            Total Searches
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface font-mono">
              {metrics.totalSearches.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-[var(--color-muted)] block mt-3 flex items-center gap-1">
            <Search className="w-3.5 h-3.5 text-primary" /> Across all sessions
          </span>
        </div>

        {/* KPI: Zero-Result Rate */}
        <div className="glass-card rounded-2xl border border-pw-border p-5 relative overflow-hidden group">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
            Zero-Result Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {metrics.zeroResultRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-[var(--color-muted)] block mt-3 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {metrics.zeroResultCount} queries with no supply
          </span>
        </div>

        {/* KPI: Resolution Rate */}
        <div className="glass-card rounded-2xl border border-pw-border p-5 relative overflow-hidden group">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
            Resolution Success
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">
              {metrics.resolutionRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-xs text-[var(--color-muted)] block mt-3 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Resolved via Geocoding API
          </span>
        </div>

        {/* KPI: Autocomplete Abandonment */}
        <div className="glass-card rounded-2xl border border-pw-border p-5 relative overflow-hidden group">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
            Search Abandonments
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-400 font-mono">
              {metrics.abandonmentCount.toLocaleString()}
            </span>
          </div>
          <span className="text-xs text-[var(--color-muted)] block mt-3 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-red-400" /> Dropped during autocomplete typing
          </span>
        </div>
      </div>

      {/* ── Conversions & Filter Usage ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel Conversions */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">
              Session Conversion Funnel
            </h2>
          </div>

          <div className="space-y-4">
            <FunnelStep 
              label="1. Search Executed" 
              count={conversions.search} 
              pct={100} 
              color="bg-primary/20 text-primary border-primary/30"
            />
            <FunnelStep 
              label="2. Deal Listing Viewed" 
              count={conversions.view} 
              pct={viewRate} 
              color="bg-purple-500/10 text-purple-400 border-purple-500/20"
            />
            <FunnelStep 
              label="3. Invitation Opened" 
              count={conversions.invitation} 
              pct={invitationRate} 
              parentPct={true}
              color="bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
            />
            <FunnelStep 
              label="4. Terms Responded" 
              count={conversions.response} 
              pct={responseRate} 
              parentPct={true}
              color="bg-pink-500/10 text-pink-400 border-pink-500/20"
            />
            <FunnelStep 
              label="5. Details Exchanged" 
              count={conversions.exchange} 
              pct={exchangeRate} 
              parentPct={true}
              color="bg-blue-500/10 text-blue-400 border-blue-500/20"
            />
            <FunnelStep 
              label="6. Indication Logged" 
              count={conversions.indication} 
              pct={indicationRate} 
              parentPct={true}
              color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            />
            <div className="border-t border-pw-border/50 pt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-container-low/40 rounded-xl border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
                  Zero-Result Deal Creation
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {conversions.create}
                </span>
                <span className="text-[11px] text-[var(--color-muted)] block">
                  ({dealCreateRate.toFixed(1)}% of searches)
                </span>
              </div>
              <div className="p-3 bg-surface-container-low/40 rounded-xl border border-pw-border">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1">
                  Subscription conversions
                </span>
                <span className="text-lg font-bold text-indigo-400 font-mono">
                  {conversions.subscribe}
                </span>
                <span className="text-[11px] text-[var(--color-muted)] block">
                  ({subscriptionRate.toFixed(1)}% of searches)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Click breakdown */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-primary" />
              <h2 className="text-base font-bold text-on-surface">
                Filter Selection Usage
              </h2>
            </div>

            {Object.keys(filterCounts).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(filterCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([filter, count]) => (
                    <div key={filter} className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low/40 border border-pw-border/50 text-xs font-semibold">
                      <span className="text-on-surface/90">{filter}</span>
                      <span className="font-mono text-[var(--color-muted)] bg-surface-container-high px-2 py-0.5 rounded-full border border-pw-border">
                        {count} hits
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-[var(--color-muted)]">
                No active filter metrics recorded in this period.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Zero-Result query roadmap & Top Queries ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Zero-Result Query Log */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-pw-border/5 pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-on-surface">
                  Zero-Result Query Log (Product Roadmap)
                </h2>
              </div>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/[0.08] px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Verbatim Demand
              </span>
            </div>

            {zeroResultLog.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-pw-border text-[var(--color-muted)] uppercase tracking-wider">
                      <th className="py-2.5 font-bold">Address Searched</th>
                      <th className="py-2.5 font-bold text-right">Session ID</th>
                      <th className="py-2.5 font-bold text-right">Searched At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zeroResultLog.slice(0, 15).map((log, index) => (
                      <tr key={index} className="border-b border-pw-border/30 hover:bg-surface-container-low/20 transition-colors">
                        <td className="py-3 font-semibold text-on-surface max-w-[240px] truncate">
                          {log.query}
                        </td>
                        <td className="py-3 text-right font-mono text-[var(--color-muted)] text-[10px]">
                          {log.sessionId.slice(0, 8)}...
                        </td>
                        <td className="py-3 text-right text-[var(--color-muted)] font-mono">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-[var(--color-muted)]">
                Zero search query records reported with empty results.
              </div>
            )}
          </div>
        </div>

        {/* Top Queries list */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-pw-border/5 pb-3">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-on-surface">
              Top Searched Addresses
            </h2>
          </div>

          {topQueries.length > 0 ? (
            <div className="space-y-2.5">
              {topQueries.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-surface-container-low/40 border border-pw-border/50">
                  <span className="truncate max-w-[200px] text-on-surface/90">
                    {item.query}
                  </span>
                  <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 shrink-0">
                    {item.count} searches
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-[var(--color-muted)]">
              No search logs compiled yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FunnelStep({ 
  label, 
  count, 
  pct, 
  parentPct = false,
  color 
}: { 
  label: string; 
  count: number; 
  pct: number; 
  parentPct?: boolean;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-on-surface/90">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-on-surface">{count} sessions</span>
          <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${color}`}>
            {pct.toFixed(0)}% {parentPct ? 'of view' : 'conversion'}
          </span>
        </div>
      </div>
      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-pw-border/20">
        <div 
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}
