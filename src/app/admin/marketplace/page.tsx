'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  BarChart3, 
  Users, 
  Activity, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Clock, 
  DollarSign, 
  Map, 
  ChevronRight,
  TrendingDown,
  Download,
  Info
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getMarketplaceStats } from '@/actions/marketplace';
import type { MarketplaceStats } from '@/actions/marketplace';

/* ═══════════════════════════════════════════════════════
   Admin Marketplace Analytics

   Stats sourced from Firestore where possible:
     - Active Professionals → real vendor count
     - Gross Procured Volume → real sum of project purchasePrices
     - Liquidity Funnel → real vendorRequests pipeline

   Stats without a real data source yet display a subtle
   "Sample metric" indicator so admins know what's live
   versus illustrative.
   ═══════════════════════════════════════════════════════ */

/** Tiny badge shown next to metrics that have no live data source yet */
function SampleBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-text-secondary border border-border-accent bg-pw-dashboard ml-2"
      title="This metric is illustrative — no live data source yet"
    >
      <Info className="w-2.5 h-2.5" />
      Sample
    </span>
  );
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MarketplaceAnalytics() {
  const [stats, setStats] = useState<MarketplaceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const data = await getMarketplaceStats();
      setStats(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──────────────────────────────────
  const activeProfessionals = stats?.activeProfessionals ?? 0;
  const grossVolume = stats?.grossProcuredVolume ?? 0;
  const pipeline = stats?.pipeline ?? { requested: 0, feesLogged: 0, approved: 0, finalized: 0 };
  const totalRequests = pipeline.requested || 1; // avoid /0

  // ── Export handler ──────────────────────────────────
  const handleExportVariance = () => {
    // Jurisdiction variance data is still sample-only, so we export
    // the illustrative rows together with whatever live stats we have.
    const header = ['Metro', 'Avg Fee ($)', 'Variance (%)', 'Trend'];
    const rows = [
      header,
      ['Austin TX 78701', '840', '12', 'up'],
      ['Nashville TN 37203', '720', '8', 'down'],
      ['Atlanta GA 30303', '680', '15', 'up'],
      ['Miami FL 33101', '1250', '22', 'up'],
      ['Dallas TX 75201', '810', '5', 'down'],
      ['', '', '', ''],
      ['--- Live Platform Stats ---', '', '', ''],
      ['Active Professionals', String(activeProfessionals), '', ''],
      ['Gross Procured Volume', formatCurrency(grossVolume), '', ''],
      ['Vendor Requests', String(pipeline.requested), '', ''],
      ['Engagements Finalized', String(pipeline.finalized), '', ''],
    ];
    downloadCsv(`marketplace-variance-${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const handleAudit = () => {
    // Navigate to the admin audit logs page
    window.location.href = '/admin/audit';
  };

  return (
    <div className="min-h-screen bg-bg-primary p-12 lg:p-16">
      <header className="mb-16">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-text-secondary mb-3">Marketplace Intelligence</p>
            <h1 className="text-5xl font-black text-text-primary tracking-tighter uppercase">Marketplace Audits</h1>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportVariance}
              className="px-8 py-4 bg-bg-surface border border-border-accent text-xs font-black uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary hover:border-pw-border transition-all flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              Export Variance (CSV)
            </button>
            <button
              onClick={handleAudit}
              className="px-8 py-4 bg-pw-black text-white text-xs font-black uppercase tracking-[0.2em] hover:bg-pw-fg transition-all"
            >
              Initiate Performance Audit
            </button>
          </div>
        </div>
      </header>

      {/* Loading / error states */}
      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-pw-border border border-border-accent mb-16">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-bg-surface p-10 h-52 animate-pulse" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="p-8 text-center bg-bg-surface border border-border-accent mb-16">
          <p className="text-sm text-text-secondary">Failed to load marketplace data.</p>
          <button onClick={fetchData} className="mt-2 text-xs font-black underline text-text-primary uppercase tracking-widest">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Top stat cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-px bg-pw-border border border-border-accent mb-16">
            <StatCard 
              icon={<Users className="w-5 h-5" />}
              label="Active Professionals"
              value={String(activeProfessionals)}
              isLive
            />
            <StatCard 
              icon={<Activity className="w-5 h-5" />}
              label="Request Match Rate"
              value="94.2%"
              description="Ecosystem Liquidity"
              isSample
            />
            <StatCard 
              icon={<Clock className="w-5 h-5" />}
              label="Latency Response"
              value="3.8 hrs"
              trend="-22%"
              trendType="positive" 
              isSample
            />
            <StatCard 
              icon={<DollarSign className="w-5 h-5" />}
              label="Gross Procured Volume"
              value={formatCurrency(grossVolume)}
              isLive
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-16">
            {/* Fee Variance by Jurisdiction (still sample data) */}
            <div className="xl:col-span-2 bg-bg-surface p-12 border border-border-accent">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="text-2xl font-black text-text-primary tracking-tighter uppercase">
                    Jurisdiction Variance
                    <SampleBadge />
                  </h3>
                  <p className="text-xs font-black text-text-secondary mt-2 uppercase tracking-widest leading-relaxed">Cross-metro pricing consistency audit</p>
                </div>
                <select className="bg-pw-dashboard border border-border-accent px-6 py-3 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-pw-border">
                  <option>Appraisal Baseline</option>
                  <option>Legal Baseline</option>
                </select>
              </div>
              
              <div className="border border-border-accent divide-y divide-pw-border">
                <METRO_FEE_ROW city="Austin, TX (78701)" fee={840} deviation={12} trend="up" />
                <METRO_FEE_ROW city="Nashville, TN (37203)" fee={720} deviation={8} trend="down" />
                <METRO_FEE_ROW city="Atlanta, GA (30303)" fee={680} deviation={15} trend="up" />
                <METRO_FEE_ROW city="Miami, FL (33101)" fee={1250} deviation={22} trend="up" />
                <METRO_FEE_ROW city="Dallas, TX (75201)" fee={810} deviation={5} trend="down" />
              </div>
              
              <div className="mt-12 p-8 bg-pw-black text-white flex items-start gap-8">
                <Zap className="w-10 h-10 text-white shrink-0" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-50">Strategic Advisory</p>
                  <p className="text-sm font-medium leading-relaxed">
                    Appraiser fee variance in South Florida is currently 2.4x the national baseline. 
                    Recommended action: Accelerate professional onboarding in Miami-Dade county to stabilize procurement costs.
                  </p>
                </div>
              </div>
            </div>

            {/* Liquidity Funnel — wired to real vendorRequest pipeline */}
            <div className="bg-bg-surface border border-border-accent p-12 flex flex-col">
              <h3 className="text-2xl font-black text-text-primary uppercase tracking-tighter mb-2">Liquidity Funnel</h3>
              <p className="text-text-secondary text-xs font-black uppercase tracking-widest mb-16">Request-to-Engagement Pipeline</p>

              <div className="flex-1 space-y-12">
                <FUNNEL_STEP
                  label="Quotes Requested"
                  value={pipeline.requested.toLocaleString()}
                  percent={`${Math.round((pipeline.requested / totalRequests) * 100)}%`}
                  color="bg-pw-black"
                />
                <FUNNEL_STEP
                  label="Fees Logged"
                  value={pipeline.feesLogged.toLocaleString()}
                  percent={`${Math.round((pipeline.feesLogged / totalRequests) * 100)}%`}
                  color="bg-pw-phase-4"
                />
                <FUNNEL_STEP
                  label="Quotes Approved"
                  value={pipeline.approved.toLocaleString()}
                  percent={`${Math.round((pipeline.approved / totalRequests) * 100)}%`}
                  color="bg-pw-phase-3"
                />
                <FUNNEL_STEP
                  label="Engagements Finalized"
                  value={pipeline.finalized.toLocaleString()}
                  percent={`${Math.round((pipeline.finalized / totalRequests) * 100)}%`}
                  color="bg-pw-phase-2"
                />
              </div>

              <div className="mt-16 pt-12 border-t border-border-accent">
                 <div className="flex items-center gap-6">
                    <div className="w-12 h-12 border border-pw-border flex items-center justify-center">
                       <TrendingUp className="w-6 h-6 text-text-primary" />
                    </div>
                    <div>
                       <p className="text-xs font-black uppercase tracking-[0.2em] text-text-secondary">
                         Process Efficiency
                         <SampleBadge />
                       </p>
                       <p className="text-3xl font-black text-text-primary tracking-tighter">1.4x</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, trend, trendType, description, isLive, isSample }: any) {
  return (
    <div className="bg-bg-surface p-10 flex flex-col justify-between h-52 transition-colors hover:bg-pw-dashboard">
      <div className="flex justify-between items-start">
        <div className="p-3 border border-border-accent bg-pw-dashboard text-text-primary">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {isSample && <SampleBadge />}
          {trend && (
             <span className="text-xs font-black uppercase tracking-widest text-text-primary flex items-center gap-1">
               {trendType === 'positive' && <TrendingUp className="w-3 h-3" />}
               {trend}
             </span>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-text-secondary mb-2">{label}</p>
        <div className="flex items-end justify-between">
          <h4 className="text-4xl font-black text-text-primary tracking-tighter">{value}</h4>
          {description && <p className="text-xs font-black text-text-secondary uppercase tracking-widest mb-1.5">{description}</p>}
        </div>
      </div>
    </div>
  );
}

function METRO_FEE_ROW({ city, fee, deviation, trend }: any) {
  return (
    <div className="flex items-center justify-between p-6 transition-colors hover:bg-pw-dashboard">
      <div className="flex items-center gap-6">
        <div className="w-12 h-12 border border-border-accent bg-pw-dashboard flex items-center justify-center text-text-secondary">
          <Map className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-black text-text-primary uppercase tracking-tighter">{city}</p>
          <p className="text-xs text-text-secondary font-black uppercase tracking-widest mt-0.5">Fee Benchmark</p>
        </div>
      </div>
      <div className="flex items-center gap-12">
        <div className="text-right">
          <p className="text-lg font-black text-text-primary tracking-tight">${fee.toLocaleString()}</p>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
             <span className="text-xs font-black text-text-primary uppercase tracking-tighter">{deviation}% VAR</span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary" />
      </div>
    </div>
  );
}

function FUNNEL_STEP({ label, value, percent, color = 'bg-pw-black' }: any) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <p className="text-xs font-black uppercase tracking-widest text-text-secondary">{label}</p>
        <p className="text-xs font-black tracking-tight text-text-primary">{value} <span className="text-xs text-text-secondary ml-1">({percent})</span></p>
      </div>
      <div className="h-1 w-full bg-pw-dashboard">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: percent }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}
