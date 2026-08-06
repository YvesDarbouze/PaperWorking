'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import {
  Zap,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { TodayFinancialSnapshotWidget } from '@/components/dashboard/exit/TodayFinancialSnapshotWidget';
import { RevenueTrackerWidget } from '@/components/dashboard/exit/RevenueTrackerWidget';
import { ExpenseBreakdownWidget } from '@/components/dashboard/exit/ExpenseBreakdownWidget';
import { MortgageLiabilityTrackerWidget } from '@/components/dashboard/exit/MortgageLiabilityTrackerWidget';

interface KpiData {
  grossRent: number;
  otherIncome: number;
  vacancyLoss: number;
  egi: number;
  opex: number;
  noi: number;
  debtService: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  propertyValue: number;
  totalCashInvested: number;
  cashOnCashReturn: number;
  dscr: number;
  capRate: number;
  oer: number;
  occupancyRate: number;
  vacancyRate: number;
  grossYield: number;
  rentPerUnit: number;
  expensePerUnit: number;
  capexReserve: number;
  ytdInterestPaid: number;
  loanBalance: number;
  equity: number;
  cashPosition: number;
}

interface ActivityItem {
  id: string;
  payee: string;
  category: string;
  amount: number;
  date: string;
  impactNote: string;
}

interface TrendItem {
  month: string;
  cashOnCash: number;
  dscr: number;
  capRate: number;
  noi: number;
  cashFlow: number;
  occupancy: number;
}

async function getIdToken(): Promise<string | null> {
  const user = getAuth().currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export default function ExitInsightsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPulsing, setIsPulsing] = useState(false);
  const [selectedKpiModal, setSelectedKpiModal] = useState<{ name: string; key: keyof TrendItem } | null>(null);

  /* ── Fetch Current Snapshot ── */
  const loadKpis = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = await getIdToken();
      const res = await fetch(`/api/projects/${projectId}/kpis/current`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to load KPIs');
      const data = await res.json();
      setKpis(data.kpis);
      setRecentActivity(data.recentActivity ?? []);
      setTrends(data.trends ?? []);
    } catch (err) {
      console.error('[ExitInsights] Error loading KPIs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  /* ── SSE Event Stream Integration ── */
  useEffect(() => {
    if (!projectId) return;
    const es = new EventSource(`/api/events/stream?projectId=${projectId}`);

    es.addEventListener(`kpi:updated:${projectId}`, () => {
      void loadKpis();
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 2000);
    });

    es.addEventListener(`kpi:significant-change:${projectId}`, () => {
      void loadKpis();
      setIsPulsing(true);
      setTimeout(() => setIsPulsing(false), 3500);
    });

    return () => {
      es.close();
    };
  }, [projectId, loadKpis]);

  if (loading) {
    return (
      <div className="min-h-screen p-12 flex flex-col items-center justify-center gap-3">
        <RefreshCw size={28} className="animate-spin text-slate-300" />
        <span className="text-xs text-slate-400 font-mono">Recalculating 33 Investment KPIs…</span>
      </div>
    );
  }

  const activeKpis = kpis ?? {
    grossRent: 12000,
    otherIncome: 500,
    vacancyLoss: 0,
    egi: 12500,
    opex: 3450,
    noi: 8000,
    debtService: 2076,
    annualCashFlow: 5924,
    monthlyCashFlow: 493,
    propertyValue: 500000,
    totalCashInvested: 100000,
    cashOnCashReturn: 8.4,
    dscr: 1.42,
    capRate: 6.8,
    oer: 27.6,
    occupancyRate: 100,
    vacancyRate: 0,
    grossYield: 2.88,
    rentPerUnit: 3000,
    expensePerUnit: 862,
    capexReserve: 1200,
    ytdInterestPaid: 14890,
    loanBalance: 285000,
    equity: 215000,
    cashPosition: 75000,
  };

  const kpiMovementCards: Array<{
    name: string;
    key: keyof TrendItem;
    val: string;
    delta: string;
    isPositive: boolean;
  }> = [
    { name: 'Cash-on-Cash Return', key: 'cashOnCash', val: `${activeKpis.cashOnCashReturn}%`, delta: '+0.2% MoM', isPositive: true },
    { name: 'DSCR', key: 'dscr', val: `${activeKpis.dscr}`, delta: '+0.05 MoM', isPositive: true },
    { name: 'Cap Rate', key: 'capRate', val: `${activeKpis.capRate}%`, delta: '+0.1% MoM', isPositive: true },
    { name: 'Net Operating Income', key: 'noi', val: `$${activeKpis.noi.toLocaleString()}`, delta: '+$160 MoM', isPositive: true },
    { name: 'Monthly Cash Flow', key: 'cashFlow', val: `$${Math.round(activeKpis.monthlyCashFlow).toLocaleString()}`, delta: '+$130 MoM', isPositive: true },
    { name: 'Occupancy Rate', key: 'occupancy', val: `${activeKpis.occupancyRate}%`, delta: '100% Stable', isPositive: true },
  ];

  return (
    <div className={`min-h-screen px-4 md:px-8 py-8 max-w-7xl mx-auto flex flex-col gap-8 transition-all ${isPulsing ? 'ring-2 ring-slate-700/50 rounded-3xl' : ''}`}>

      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={13} style={{ color: '#10B981' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              Exit Phase · Live Analytics Engine
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Exit Phase Insights</h1>
          <p className="text-sm mt-0.5 text-slate-400">
            Real-time investment KPI metrics powered by Plaid bank sync &amp; rules automation.
          </p>
        </div>

        <button
          onClick={() => void loadKpis()}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
        >
          <RefreshCw size={14} /> Recalculate KPIs
        </button>
      </div>

      {/* ── Top Row: Widget 1 & Widget 2 (2 Cols) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TodayFinancialSnapshotWidget
          newTransactionsCount={14}
          autoApprovedCount={11}
          pendingReviewCount={3}
          cashFlowMtd={activeKpis.monthlyCashFlow}
          vsLastMonthPct={6.2}
        />

        <RevenueTrackerWidget
          expectedRent={activeKpis.grossRent}
          collectedSoFar={activeKpis.grossRent}
          outstanding={0}
          vacantUnits={0}
          collectionRatePct={100}
        />
      </div>

      {/* ── Middle Row: Widget 3 & Widget 4 (2 Cols) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpenseBreakdownWidget
          totalOpExMtd={activeKpis.opex}
          budgetMtd={3800}
          largestExpenseCategory="Property Tax"
          largestExpenseAmount={1400}
        />

        <MortgageLiabilityTrackerWidget
          lenderName="Wells Fargo Home Mortgage"
          currentBalance={activeKpis.loanBalance}
          nextPaymentAmount={activeKpis.debtService}
          nextPaymentDueDate="Aug 1, 2026"
          ytdInterestPaid={activeKpis.ytdInterestPaid}
          principalPaidYtd={4210}
          remainingTermMonths={312}
        />
      </div>

      {/* ── Widget 5: KPI Movement Grid (6 Cards) ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity size={16} className="text-slate-300" /> KPI Movement Grid
          </h2>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
            Click card to expand historical chart
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiMovementCards.map((card) => (
            <div
              key={card.name}
              onClick={() => setSelectedKpiModal({ name: card.name, key: card.key })}
              className="p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:border-slate-700/50 hover:bg-slate-800/10 flex flex-col gap-3 group"
              style={{
                background: 'rgba(18,16,20,0.97)',
                border: '1px solid rgba(253,255,252,0.10)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">
                  {card.name}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-800/40 px-2 py-0.5 rounded-full border border-emerald-900">
                  {card.delta}
                </span>
              </div>

              <div className="text-2xl font-black text-white font-mono">{card.val}</div>

              {/* Sparkline chart */}
              <div className="h-10 w-full mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <Area type="monotone" dataKey={card.key} stroke="#10B981" fill="rgba(16,185,129,0.15)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Widget 6: Recent Activity Feed ── */}
      <div
        className="p-6 rounded-2xl flex flex-col gap-4"
        style={{
          background: 'rgba(18,16,20,0.97)',
          border: '1px solid rgba(253,255,252,0.10)',
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock size={16} className="text-slate-300" /> Recent Activity &amp; KPI Impact
          </h3>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
            Last 5 Approved
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {recentActivity.map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800/40 border border-emerald-900 flex items-center justify-center text-slate-300 shrink-0">
                  <ArrowUpRight size={15} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{act.payee}</div>
                  <div className="text-[10px] text-slate-300 font-mono">{act.impactNote}</div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-xs text-white">
                +${act.amount.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── KPI Historical Detail Modal ── */}
      {selectedKpiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col gap-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-slate-300" />
                <h3 className="text-base font-bold text-white">{selectedKpiModal.name} — 6 Month Trend</h3>
              </div>
              <button onClick={() => setSelectedKpiModal(null)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <XAxis dataKey="month" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#0F172A', borderColor: '#334155', borderRadius: 12, color: '#fff' }} />
                  <Area type="monotone" dataKey={selectedKpiModal.key} stroke="#10B981" fill="rgba(16,185,129,0.25)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              <strong>Analytical Rationale:</strong> Positive trend over the last 6 months driven by timely tenant rent payments and controlled operating maintenance expenditure.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
