'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { KPIInsightsDashboard } from '@/components/insights/KPIInsightsDashboard';
import { StressTestProvider, RiskStressTester, useStressTest } from '@/components/insights/RiskStressTester';
import InsightsDashboard, { SecondaryDiagnosticsPanel } from '@/components/insights/InsightsDashboard';
import { useQuery } from '@tanstack/react-query';
import { MarketContextPanel } from '@/components/project/MarketContextPanel';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { InsightsEngineInputs, InsightsEngine } from '@/lib/services/insightsEngine';
import { projectToInsightsInputs, REQUIRED_INSIGHTS_FIELDS } from '@/lib/projections/projectionEngine';
import type { Project } from '@/types/schema';
import { 
  Calendar, 
  BarChart3, 
  TrendingUp, 
  CalendarDays, 
  Info,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  Check,
  ShieldAlert,
  Award,
  Lock,
  Grid,
  AlertTriangle,
  CheckCircle,
  Inbox,
  Loader2,
  ExternalLink,
  Layers,
  FolderPlus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';
import { useAllDealsSync } from '@/hooks/useAllProjectsSync';
import { usePortfolioMetricSnapshots } from '@/hooks/usePortfolioMetricSnapshots';
import { useAuth } from '@/context/AuthContext';
import { 
  ShortTermTrendChart, 
  LongTermTrendChart, 
  RiskReturnScatterChart 
} from '@/components/insights/InsightsCharts';
import { 
  evaluateInsights, 
  deriveActualMetrics, 
  deriveProFormaMetrics,
  METRIC_PHASE_REQUIREMENTS,
  BENCHMARKS,
  Insight,
  InsightSeverity
} from '@/lib/insights/engine';

type Granularity = 'date' | 'month' | 'quarter' | 'annual';
type RankingMetric = 'CAP_RATE' | 'COC' | 'CASH_FLOW' | 'DSCR';


export default function InsightsPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);
  const clearDeal = useProjectStore((s) => s.clearDeal);
  const { user, profile, loading } = useAuth();
  const authRef = useRef({ user, profile, loading });
  authRef.current = { user, profile, loading };

  // ── View: KPI Overview | Stress Simulator | Projections ─────────────────────────────
  const [view, setView] = useState<'kpi' | 'stress-test' | 'projections'>('kpi');

  // ── Per-project projections state ─────────────────────────────────────────
  const [projectionProjectId, setProjectionProjectId] = useState<string>('');

  const [granularity, setGranularity] = useState<Granularity>('month');

  // Global filter states
  const [globalPhaseFilter, setGlobalPhaseFilter] = useState<'all' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit'>('all');
  const [globalStrategyFilter, setGlobalStrategyFilter] = useState<'all' | 'LTR' | 'STR'>('all');

  // Filter projects by phase and strategy
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // Phase Filter
      if (globalPhaseFilter !== 'all') {
        const phaseNum = p.currentPhase ?? 1;
        const phaseLabel = getPhaseName(phaseNum);
        if (phaseLabel !== globalPhaseFilter) {
          return false;
        }
      }
      // Strategy Filter (LTR vs STR)
      if (globalStrategyFilter !== 'all') {
        const isLTR = p.dispositionType === 'RENT' && p.subStrategy === 'LONG_TERM';
        const isSTR = p.dispositionType === 'RENT' && p.subStrategy === 'SHORT_TERM';
        if (globalStrategyFilter === 'LTR' && !isLTR) return false;
        if (globalStrategyFilter === 'STR' && !isSTR) return false;
      }
      return true;
    });
  }, [projects, globalPhaseFilter, globalStrategyFilter]);

  // Focused projects list: if a single project focus is active, only calculate for that project.
  // Otherwise, calculate for all filtered projects.
  const focusedProjects = useMemo(() => {
    if (currentProject) {
      return [currentProject];
    }
    return filteredProjects;
  }, [currentProject, filteredProjects]);

  const selectedInputs = useMemo(() => {
    return getInputsFromProjects(focusedProjects);
  }, [focusedProjects]);

  const filteredProjectsForDropdown = filteredProjects;

  // Auto-clear focused project if it no longer matches active filters
  React.useEffect(() => {
    if (currentProject) {
      const isValid = filteredProjects.some(p => p.id === currentProject.id);
      if (!isValid) {
        clearDeal();
      }
    }
  }, [filteredProjects, currentProject, clearDeal]);

  // Dominant phase calculation for active portfolio focus banner
  const dominantPhaseInfo = useMemo(() => {
    const activeList = currentProject ? [currentProject] : filteredProjects;
    if (activeList.length === 0) return null;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of activeList) {
      const phase = p.currentPhase ?? 1;
      counts[phase] = (counts[phase] || 0) + 1;
    }
    let maxPhase = 1;
    let maxCount = -1;
    for (const phaseKey in counts) {
      const pKey = Number(phaseKey);
      if (counts[pKey] > maxCount) {
        maxCount = counts[pKey];
        maxPhase = pKey;
      }
    }
    
    switch (maxPhase) {
      case 1:
        return {
          label: 'Acquisition Focus',
          color: 'text-[#6E7480] border-[#454955]/20 bg-[#454955]/10',
          description: 'Leaning on Cap Rate & GRM screening insights to assess deal feasibility and thesis alignment.'
        };
      case 2:
        return {
          label: 'Fund / Financing Focus',
          color: 'text-blue-400 border-blue-500/20 bg-blue-500/10',
          description: 'Focusing on DSCR and Cash-on-Cash metrics to optimize capitalization structures and underwriting targets.'
        };
      case 3:
        return {
          label: 'Hold / Operations Focus',
          color: 'text-[#9E9DA0] border-slate-500/20 bg-slate-500/10',
          description: 'Leaning on Occupancy, OER efficiency, and monthly cash flow drift to track asset management performance.'
        };
      case 4:
        return {
          label: 'Exit / Liquidation Focus',
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/10',
          description: 'Surfacing realized IRR, annualized appreciation, and capital gains projections for exiting deals.'
        };
      default:
        return null;
    }
  }, [currentProject, filteredProjects]);

  const rollUpProject = useMemo(() => {
    if (currentProject) return currentProject;
    if (filteredProjects.length === 0) return null;
    
    // Find the dominant phase number
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const p of filteredProjects) {
      const phase = p.currentPhase ?? 1;
      counts[phase] = (counts[phase] || 0) + 1;
    }
    let dominantPhase = 1;
    let maxCount = -1;
    for (const phaseKey in counts) {
      const pKey = Number(phaseKey);
      if (counts[pKey] > maxCount) {
        maxCount = counts[pKey];
        dominantPhase = pKey;
      }
    }

    // Accumulate financials
    let purchasePrice = 0;
    let loanAmount = 0;
    let monthlyGrossRent = 0;
    let capitalReserves = 0;
    let monthlyMaintenanceReserve = 0;
    let numberOfUnits = 0;
    let tenantTurnoverRateSum = 0;
    let leaseRenewalRateSum = 0;
    let daysOnMarketSum = 0;
    let rehabBudget = 0;
    let rehabActual = 0;

    for (const p of filteredProjects) {
      const f = p.financials || {};
      purchasePrice += f.purchasePrice || f.targetPurchasePrice || f.targetPrice || 0;
      loanAmount += f.loanAmount || 0;
      monthlyGrossRent += f.monthlyGrossRent || f.projectedMonthlyRent || f.projectedRent || 0;
      capitalReserves += f.capitalReserves || 0;
      monthlyMaintenanceReserve += f.monthlyMaintenanceReserve || 0;
      numberOfUnits += p.numberOfUnits || f.numberOfUnits || 1;
      tenantTurnoverRateSum += f.tenantTurnoverRate || 0;
      leaseRenewalRateSum += f.leaseRenewalRate || 0;
      daysOnMarketSum += f.daysOnMarket || 0;
      rehabBudget += f.rehabBudget || 0;
      rehabActual += f.rehabActual || 0;
    }

    const n = filteredProjects.length;

    return {
      id: 'blended-portfolio',
      propertyName: 'Portfolio Roll-up',
      currentPhase: dominantPhase,
      dispositionType: 'RENT',
      subStrategy: 'LONG_TERM',
      numberOfUnits,
      financials: {
        purchasePrice,
        loanAmount,
        loanInterestRate: 6.0,
        loanTermYears: 30,
        monthlyGrossRent,
        monthlyMaintenanceReserve,
        capitalReserves,
        numberOfUnits,
        tenantTurnoverRate: tenantTurnoverRateSum / n,
        leaseRenewalRate: leaseRenewalRateSum / n,
        daysOnMarket: daysOnMarketSum / n,
        rehabBudget,
        rehabActual,
      }
    };
  }, [currentProject, filteredProjects]);

  // Attention feed filter states
  const [attentionRiskOnly, setAttentionRiskOnly] = useState(false);
  const [attentionPhase, setAttentionPhase] = useState<'all' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit'>('all');
  const [attentionProject, setAttentionProject] = useState<string>('all');

  // Inbox sending states
  const [sendingInbox, setSendingInbox] = useState<Record<string, boolean>>({});
  const [sentInbox, setSentInbox] = useState<Record<string, boolean>>({});
  
  // Comparative section states
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('COC');
  const [rankOnly, setRankOnly] = useState(false);
  const [scatterXMetric, setScatterXMetric] = useState<'capRate' | 'dscr' | 'oer'>('capRate');
  const [scatterYMetric, setScatterYMetric] = useState<'cashOnCashReturn' | 'annualizedAppreciation' | 'irr'>('cashOnCashReturn');
  
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  // Map toggle granularity to hook parameters
  const periodTypeMap = useMemo(() => {
    switch (granularity) {
      case 'month': return 'monthly';
      case 'quarter': return 'quarterly';
      case 'annual': return 'annual';
      default: return 'monthly';
    }
  }, [granularity]);

  const { snapshots, rawSnapshots } = usePortfolioMetricSnapshots(
    periodTypeMap,
    focusedProjects
  );

  const granularityOptions = [
    { id: 'date' as const, label: 'Date (Live)', icon: Calendar },
    { id: 'month' as const, label: 'Month', icon: CalendarDays },
    { id: 'quarter' as const, label: 'Quarter', icon: BarChart3 },
    { id: 'annual' as const, label: 'Annual', icon: TrendingUp },
  ];

  // Evaluate insights using the Insight Engine
  const engineInsights = useMemo(() => {
    return evaluateInsights(focusedProjects, rawSnapshots);
  }, [focusedProjects, rawSnapshots]);



  // Slug helper for metric drilldown links
  const getMetricSlug = useCallback((metricId: string): string => {
    switch (metricId.toUpperCase()) {
      case 'CAP_RATE': return 'cap-rate';
      case 'COC': return 'coc';
      case 'CASH_FLOW': return 'cash-flow';
      case 'NOI': return 'noi';
      case 'DSCR': return 'dscr';
      case 'LTV': return 'ltv';
      case 'GRM': return 'grm';
      case 'PRICE_TO_RENT': return 'grm';
      case 'OER': return 'oer';
      case 'OCCUPANCY': return 'occupancy';
      case 'IRR': return 'irr';
      case 'APPRECIATION': return 'appreciation';
      default: return 'performance';
    }
  }, []);

  // Filter insights for the Attention Feed
  const attentionInsights = useMemo(() => {
    return engineInsights.filter((insight) => {
      // 1. Risk Only filter
      if (attentionRiskOnly && insight.severity !== 'risk') {
        return false;
      }
      
      // 2. Project filter
      if (attentionProject !== 'all' && insight.projectId !== attentionProject) {
        return false;
      }

      // 3. Phase filter
      if (attentionPhase !== 'all') {
        const req = METRIC_PHASE_REQUIREMENTS[insight.metric];
        const phaseName = req ? req.name : (insight.metric === 'REHAB_COST' ? 'Hold' : 'Hold');
        if (phaseName !== attentionPhase) {
          return false;
        }
      }

      return true;
    });
  }, [engineInsights, attentionRiskOnly, attentionProject, attentionPhase]);

  // Deduplicate and group by severity
  const deduplicatedAttentionInsights = useMemo(() => {
    const seen = new Set<string>();
    return attentionInsights.filter((insight) => {
      const key = `${insight.id}_${insight.projectId || ''}_${insight.metric}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [attentionInsights]);

  const groupedInsights = useMemo(() => {
    const groups: Record<InsightSeverity, Insight[]> = {
      risk: [],
      warning: [],
      good: [],
      info: [],
    };
    for (const insight of deduplicatedAttentionInsights) {
      groups[insight.severity].push(insight);
    }
    return groups;
  }, [deduplicatedAttentionInsights]);

  // Inbox handoff function
  const handleSendToInbox = async (insight: Insight) => {
    // 1. Wait for authentication to resolve if still loading
    if (authRef.current.loading) {
      toast.loading('Resolving authentication, please wait...', { id: `auth-wait-${insight.id}` });
      const startTime = Date.now();
      while (authRef.current.loading && Date.now() - startTime < 6000) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      toast.dismiss(`auth-wait-${insight.id}`);
    }

    // 2. Fetch the latest resolved state from ref
    const { user: resolvedUser, profile: resolvedProfile } = authRef.current;

    // 3. Ensure a valid user and organizationId are available
    if (!resolvedUser) {
      toast.error('You must be logged in to assign tasks.');
      return;
    }

    const resolvedOrgId = resolvedProfile?.personalOrganizationId;
    if (!resolvedOrgId || resolvedOrgId === 'org_placeholder') {
      toast.error('Could not resolve your organization. Please try again in a moment.');
      return;
    }

    setSendingInbox(prev => ({ ...prev, [insight.id]: true }));
    try {
      const idToken = await resolvedUser.getIdToken();
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          recipientUid: resolvedUser.uid,
          organizationId: resolvedOrgId,
          type: 'action',
          category: 'task_assigned',
          title: `Task: ${insight.headline}`,
          body: `${insight.detail} (Current Value: ${insight.value} vs Target: ${insight.benchmark})${insight.recommendedAction ? `\n\nRecommended Action: ${insight.recommendedAction}` : ''}`,
          senderName: resolvedProfile?.displayName || 'Insight Engine',
          projectId: insight.projectId,
          projectName: insight.projectName,
          actionUrl: insight.projectId ? `/dashboard/projects/${insight.projectId}` : `/dashboard/insights`,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success(`Task created: "${insight.headline}" sent to your Inbox!`);
        setSentInbox(prev => ({ ...prev, [insight.id]: true }));
      } else {
        throw new Error(resData.error || 'Failed to create task');
      }
    } catch (err) {
      console.error('[Inbox Handoff] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error sending task to Inbox';
      toast.error(errorMessage);
    } finally {
      setSendingInbox(prev => ({ ...prev, [insight.id]: false }));
    }
  };

  // Color helper for metrics thresholds
  const getBenchmarkColorClass = useCallback((metricId: string, value: number | null) => {
    if (value === null) return 'text-[#9E9DA0]';
    const bounds = BENCHMARKS[metricId];
    if (!bounds) return 'text-slate-200';

    if (metricId === 'DSCR' && value === 999) return 'text-[#6E7480]'; // All Cash DSCR

    if (metricId === 'OER') {
      if (value <= (bounds.goodMax ?? 40)) return 'text-[#6E7480]';
      if (value > (bounds.warningMax ?? 55)) return 'text-red-400';
      return 'text-amber-400';
    }

    if (bounds.goodMin !== undefined) {
      if (value < (bounds.warningMin ?? bounds.goodMin)) return 'text-red-400';
      if (value < bounds.goodMin) return 'text-amber-400';
      if (bounds.goodMax !== undefined && value > bounds.goodMax) return 'text-amber-400';
      return 'text-[#6E7480]';
    }

    return 'text-slate-200';
  }, []);



  if (projects.length === 0) {
    return (
      <div className="font-plus-jakarta min-h-screen text-slate-100 p-6 flex items-center justify-center font-hanken">
        <div 
          className="w-full max-w-lg rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-[20px] text-center space-y-6 relative overflow-hidden"
          style={{ background: 'rgba(30, 27, 32, 0.7)' }}
        >
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#454955]/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-[#454955]/10 border border-[#454955]/20">
              <FolderPlus className="w-10 h-10 text-[#6E7480]" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-tight text-white">
              Assemble Your Portfolio
            </h1>
            <p className="text-sm text-[#9E9DA0] font-extralight leading-relaxed">
              PaperWorking connects pro-forma thesis models to live operational metrics. Add a project to unlock the portfolio diagnostic engine, trend lines, and underwriting variance sheets.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/dashboard/projects/new"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#454955] text-[#FDFFFC] font-semibold rounded-xl hover:bg-[#6E7480] transition-all duration-200 shadow-lg shadow-[#454955]/20 text-sm"
            >
              <span>Add a Project</span>
            </Link>
            <Link
              href="/dashboard/projects"
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all duration-200 text-[#C0BEC2] hover:text-white text-sm"
            >
              <span>View Projects</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="font-plus-jakarta min-h-screen text-slate-100">

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 flex items-center gap-1 px-6 py-3 border-b"
        style={{
          background: "rgba(18,16,20,0.88)",
          backdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {(["kpi", "stress-test", "projections"] as const).map((v) => {
          const label = v === "kpi" ? "KPI Overview" : v === "stress-test" ? "Stress Simulator" : "Projections";
          const icon  = v === "kpi" ? "monitoring"   : v === "stress-test" ? "tune" : "trending_up";
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => setView(v)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{
                background: active ? "rgba(69,73,85,0.25)" : "transparent",
                color: active ? "rgba(253,255,252,0.92)" : "rgba(253,255,252,0.45)",
                border: active ? "1px solid rgba(255,255,255,0.10)" : "1px solid transparent",
              }}
            >
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── KPI Overview tab ─────────────────────────────────────────────────── */}

      {view === "kpi" && (
        <div className="space-y-6">
          <KPIInsightsDashboard />
          
          {/* SECTION 2: Underwriting Variance (Pro-Forma vs. Actuals Table) */}
          {filteredProjects.length > 0 && (
            <div className="px-6 pb-12">
              <div className="rounded-xl border border-white/5 p-6 bg-white/[0.02] backdrop-blur-sm space-y-4 relative z-10 font-hanken">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Layers className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-light tracking-wide text-white">
                      Underwriting Variance Analysis
                    </h2>
                    <p className="text-xs text-[#9E9DA0] font-extralight tracking-wider uppercase">
                      Comparison of actual operations vs pro-forma target underwriting for NOI, CoC, and OER
                    </p>
                  </div>
                </div>

                {/* Table Wrapper */}
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0a1114]/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#9E9DA0] font-semibold bg-white/[0.02] font-hanken">
                        <th className="p-4">Project Name</th>
                        <th className="p-4">REIL Phase</th>
                        <th className="p-4">Strategy</th>
                        <th className="p-4 text-center border-l border-white/5 bg-white/[0.01]" colSpan={3}>Net Operating Income (NOI)</th>
                        <th className="p-4 text-center border-l border-white/5 bg-white/[0.01]" colSpan={3}>Cash-on-Cash Return (CoC)</th>
                        <th className="p-4 text-center border-l border-white/5 bg-white/[0.01]" colSpan={3}>Operating Expense Ratio (OER)</th>
                      </tr>
                      <tr className="border-b border-white/5 text-[9px] uppercase tracking-widest text-[#6B6870] bg-white/[0.01] font-mono">
                        <th className="p-2"></th>
                        <th className="p-2"></th>
                        <th className="p-2"></th>
                        <th className="p-2 text-center border-l border-white/5">Target</th>
                        <th className="p-2 text-center">Actual</th>
                        <th className="p-2 text-center border-r border-white/5">Var</th>
                        <th className="p-2 text-center">Target</th>
                        <th className="p-2 text-center">Actual</th>
                        <th className="p-2 text-center border-r border-white/5">Var</th>
                        <th className="p-2 text-center">Target</th>
                        <th className="p-2 text-center">Actual</th>
                        <th className="p-2 text-center">Var</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs font-light">
                      {focusedProjects.map((p) => {
                        const actuals = deriveActualMetrics(p);
                        const proForma = deriveProFormaMetrics(p);
                        const phaseNum = p.currentPhase ?? 1;

                        // NOI (Phase 3 lock)
                        const noiLocked = phaseNum < 3;
                        const targetNoi = proForma.noi;
                        const actualNoi = actuals.noi;
                        const noiVar = (actualNoi !== null && targetNoi) ? ((actualNoi - targetNoi) / targetNoi) * 100 : null;
                        const noiVarColor = noiVar !== null ? (noiVar >= 0 ? 'text-[#6E7480] bg-[#454955]/10' : 'text-red-400 bg-red-500/10') : 'text-[#6B6870]';

                        // CoC (Phase 2 lock)
                        const cocLocked = phaseNum < 2;
                        const targetCoc = proForma.cashOnCashReturn;
                        const actualCoc = actuals.cashOnCashReturn;
                        const cocVar = (actualCoc !== null && targetCoc !== null) ? actualCoc - targetCoc : null;
                        const cocVarColor = cocVar !== null ? (cocVar >= 0 ? 'text-[#6E7480] bg-[#454955]/10' : 'text-red-400 bg-red-500/10') : 'text-[#6B6870]';

                        // OER (Phase 3 lock)
                        const oerLocked = phaseNum < 3;
                        const targetOer = proForma.oer;
                        const actualOer = actuals.oer;
                        const oerVar = (actualOer !== null && targetOer !== null) ? actualOer - targetOer : null;
                        const oerVarColor = oerVar !== null ? (oerVar <= 0 ? 'text-[#6E7480] bg-[#454955]/10' : 'text-red-400 bg-red-500/10') : 'text-[#6B6870]';

                        const strategyLabel = p.dispositionType === 'RENT'
                          ? (p.subStrategy === 'BRRRR' ? 'Rent' : 'Buy & Hold')
                          : (p.subStrategy === 'WHOLESALE' ? 'Sell' : 'Fix & Flip');

                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/5">
                            <td className="p-4 font-semibold text-white">
                              <Link href={`/dashboard/projects/${p.id}`} className="hover:text-[#6E7480] hover:underline transition-all">
                                {p.propertyName ?? p.name}
                              </Link>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider ${
                                phaseNum === 1 ? 'bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20' :
                                phaseNum === 2 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                phaseNum === 3 ? 'bg-slate-500/10 text-[#9E9DA0] border border-slate-500/20' :
                                'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {getPhaseName(phaseNum)}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className="text-[10px] text-[#9E9DA0] font-mono tracking-wider">{strategyLabel}</span>
                            </td>

                            {/* NOI */}
                            <td className="p-4 text-center font-mono text-[#C0BEC2] border-l border-white/5">
                              {targetNoi !== null ? `$${Math.round(targetNoi).toLocaleString()}` : '—'}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {noiLocked ? (
                                <span className="text-[#6B6870] text-[10px] flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>Locked (Hold)</span>
                                </span>
                              ) : actualNoi !== null ? (
                                <span className="text-white font-semibold">${Math.round(actualNoi).toLocaleString()}</span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center font-mono border-r border-white/5">
                              {!noiLocked && noiVar !== null ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] ${noiVarColor}`}>
                                  {noiVar >= 0 ? '+' : ''}{noiVar.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>

                            {/* CoC */}
                            <td className="p-4 text-center font-mono text-[#C0BEC2]">
                              {targetCoc !== null ? `${targetCoc.toFixed(2)}%` : '—'}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {cocLocked ? (
                                <span className="text-[#6B6870] text-[10px] flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>Locked (Fund)</span>
                                </span>
                              ) : actualCoc !== null ? (
                                <span className="text-white font-semibold">{actualCoc.toFixed(2)}%</span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center font-mono border-r border-white/5">
                              {!cocLocked && cocVar !== null ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] ${cocVarColor}`}>
                                  {cocVar >= 0 ? '+' : ''}{cocVar.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>

                            {/* OER */}
                            <td className="p-4 text-center font-mono text-[#C0BEC2]">
                              {targetOer !== null ? `${targetOer.toFixed(1)}%` : '—'}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {oerLocked ? (
                                <span className="text-[#6B6870] text-[10px] flex items-center justify-center gap-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>Locked (Hold)</span>
                                </span>
                              ) : actualOer !== null ? (
                                <span className="text-white font-semibold">{actualOer.toFixed(1)}%</span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center font-mono">
                              {!oerLocked && oerVar !== null ? (
                                <span className={`px-2 py-0.5 rounded text-[10px] ${oerVarColor}`}>
                                  {oerVar >= 0 ? '+' : ''}{oerVar.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[#6B6870]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

      {/* SECTION 4: Attention Feed (Grouped, prioritised system diagnostics feed) */}
      {filteredProjects.length > 0 && (
          <div className="mt-6 p-6 rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-sm space-y-6 relative z-10 font-hanken">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-[#6E7480]" />
                <div>
                  <h3 className="text-sm font-semibold tracking-wide text-white uppercase font-hanken">Attention Feed</h3>
                  <p className="text-[11px] text-[#9E9DA0] font-light">Prioritized actionable system diagnostics and underwriting anomalies.</p>
                </div>
              </div>
              
              {/* Attention Feed Filter Toolbar */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Project Filter */}
                <select
                  value={attentionProject}
                  onChange={(e) => setAttentionProject(e.target.value)}
                  className="bg-[#161318] border border-white/10 text-[#C0BEC2] text-[11px] rounded-lg px-2.5 py-1.5 focus:border-[#454955] focus:outline-none font-light"
                >
                  <option value="all">All Projects</option>
                  {filteredProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.propertyName ?? p.name}
                    </option>
                  ))}
                </select>

                {/* Phase Filter */}
                <select
                  value={attentionPhase}
                  onChange={(e) => setAttentionPhase(e.target.value as 'all' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit')}
                  className="bg-[#161318] border border-white/10 text-[#C0BEC2] text-[11px] rounded-lg px-2.5 py-1.5 focus:border-[#454955] focus:outline-none font-light"
                >
                  <option value="all">All Phases</option>
                  <option value="Acquisition">Acquisition (Phase 1)</option>
                  <option value="Fund">Fund (Phase 2)</option>
                  <option value="Hold">Hold (Phase 3)</option>
                  <option value="Exit">Exit (Phase 4)</option>
                </select>

                {/* Risk Only checkbox */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#C0BEC2] hover:text-white transition-colors bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg px-2.5 py-1.5 font-hanken">
                  <input
                    type="checkbox"
                    checked={attentionRiskOnly}
                    onChange={(e) => setAttentionRiskOnly(e.target.checked)}
                    className="rounded border-white/10 bg-white/5 text-[#454955] focus:ring-[#454955]/20 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-light">Risk Only</span>
                </label>

                <span className="text-[10px] font-mono bg-white/5 px-2.5 py-1.5 rounded-lg text-[#9E9DA0] border border-white/[0.02]">
                  {deduplicatedAttentionInsights.length} active
                </span>
              </div>
            </div>

            {/* Attention Feed Alerts List */}
            <div className="space-y-6 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              {deduplicatedAttentionInsights.length === 0 ? (
                <div className="py-12 text-center text-[#9E9DA0] font-light text-xs flex flex-col items-center justify-center gap-2 font-hanken">
                  <CheckCircle className="w-8 h-8 text-[#454955]/40" />
                  <span>No active alerts fit the current filters. All metrics nominal.</span>
                </div>
              ) : (
                (['risk', 'warning', 'good', 'info'] as const).map((sev) => {
                  const groupItems = groupedInsights[sev];
                  if (groupItems.length === 0) return null;

                  const sectionTitle = sev === 'risk' 
                    ? 'Critical Risks' 
                    : sev === 'warning' 
                    ? 'Warnings' 
                    : sev === 'good' 
                    ? 'Performance Leaders & Standouts' 
                    : 'System Notices';

                  const sectionColor = sev === 'risk' 
                    ? 'text-red-400' 
                    : sev === 'warning' 
                    ? 'text-amber-400' 
                    : sev === 'good' 
                    ? 'text-[#6E7480]' 
                    : 'text-blue-400';

                  return (
                    <div key={sev} className="space-y-3 font-hanken">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold text-[#9E9DA0] font-hanken">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          sev === 'risk' ? 'bg-red-500' : sev === 'warning' ? 'bg-amber-500' : sev === 'good' ? 'bg-[#454955]' : 'bg-blue-500'
                        }`} />
                        <span className={sectionColor}>{sectionTitle}</span>
                        <span className="text-slate-600">({groupItems.length})</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groupItems.map((insight) => {
                          const isRisk = insight.severity === 'risk';
                          const isWarning = insight.severity === 'warning';
                          const isGood = insight.severity === 'good';

                          const borderClass = isRisk 
                            ? 'border-red-500/10 bg-red-500/[0.02] hover:border-red-500/20' 
                            : isWarning 
                            ? 'border-amber-500/10 bg-amber-500/[0.02] hover:border-amber-500/20'
                            : isGood
                            ? 'border-[#454955]/10 bg-[#454955]/[0.02] hover:border-[#454955]/20'
                            : 'border-white/5 bg-white/[0.01] hover:border-white/10';

                          const iconColor = isRisk 
                            ? 'text-red-400' 
                            : isWarning 
                            ? 'text-amber-400' 
                            : isGood
                            ? 'text-[#6E7480]' 
                            : 'text-blue-400';

                          const IconComponent = isRisk 
                            ? ShieldAlert 
                            : isWarning 
                            ? AlertTriangle 
                            : isGood
                            ? Award 
                            : Info;

                          return (
                            <div 
                              key={insight.id} 
                              className={`p-4 rounded-xl border ${borderClass} transition-all duration-200 flex flex-col justify-between gap-3 bg-[#0d161a]/60 backdrop-blur-sm`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-4 font-hanken">
                                  <div className="flex items-start gap-2.5">
                                    <IconComponent className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
                                    <div className="space-y-0.5">
                                      <span className="text-xs font-semibold text-white tracking-wide font-hanken block">{insight.headline}</span>
                                      {insight.projectName && (
                                        <span className="text-[9px] uppercase tracking-wider text-[#6B6870] block">
                                          Project: <span className="text-[#C0BEC2] font-light">{insight.projectName}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className={`text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full font-mono font-medium ${
                                    isRisk 
                                      ? 'bg-red-500/15 text-red-400 border border-red-500/20' 
                                      : isWarning 
                                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                      : isGood
                                      ? 'bg-[#454955]/15 text-[#6E7480] border border-[#454955]/20'
                                      : 'bg-white/5 text-[#9E9DA0]'
                                  }`}>
                                    {insight.kind}
                                  </span>
                                </div>
                                <p className="text-[11px] font-extralight text-[#C0BEC2] leading-relaxed font-hanken">{insight.detail}</p>
                              </div>

                              {/* Recommended Action alerts */}
                              {insight.recommendedAction && (
                                <div className="text-[10px] text-[#C0BEC2] bg-red-950/15 border border-red-500/10 p-2.5 rounded-lg flex items-start gap-2 font-light font-hanken">
                                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                  <div>
                                    <span className="font-semibold text-slate-200 block mb-0.5">Recommended Action:</span>
                                    <span className="leading-relaxed block">{insight.recommendedAction}</span>
                                  </div>
                                </div>
                              )}

                              {/* Figure vs. Benchmark & Links */}
                              <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                                <div className="flex items-center justify-between text-[10px] text-[#9E9DA0] font-mono">
                                  <span>Value: <span className="text-white font-semibold">{insight.value}</span></span>
                                  <span>Target: <span className="text-[#C0BEC2] font-semibold">{insight.benchmark}</span></span>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-1 font-hanken">
                                  <div className="flex items-center gap-3">
                                    {insight.projectId && (
                                      <Link
                                        href={`/dashboard/projects/${insight.projectId}`}
                                        className="flex items-center gap-1 text-[10px] font-light text-[#9E9DA0] hover:text-[#6E7480] transition-colors"
                                      >
                                        <span>Project Workspace</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                      </Link>
                                    )}
                                    <Link
                                      href={`/dashboard/intelligence/${getMetricSlug(insight.metric)}`}
                                      className="flex items-center gap-1 text-[10px] font-light text-[#9E9DA0] hover:text-blue-400 transition-colors"
                                    >
                                      <span>Drill-down</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </Link>
                                  </div>

                                  {/* Inbox Assign Action Handoff */}
                                  <button
                                    onClick={() => handleSendToInbox(insight)}
                                    disabled={sendingInbox[insight.id] || sentInbox[insight.id]}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] transition-all duration-200 ${
                                      sentInbox[insight.id]
                                        ? 'bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20 cursor-default'
                                        : 'bg-white/5 text-[#C0BEC2] border border-white/5 hover:bg-white/10 hover:text-white'
                                    }`}
                                  >
                                    {sendingInbox[insight.id] ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin text-[#6E7480]" />
                                        <span>Assigning...</span>
                                      </>
                                    ) : sentInbox[insight.id] ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#6E7480]" />
                                        <span>In Inbox</span>
                                      </>
                                    ) : (
                                      <>
                                        <Inbox className="w-3 h-3" />
                                        <span>Send to Inbox</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {filteredProjects.length > 0 && (
          <div className="mt-8 border-t border-white/5 pt-8">
            <SecondaryDiagnosticsPanel project={rollUpProject || undefined} />
          </div>
        )}
      </div>
      )}

      {/* ── Stress Simulator tab ────────────────────────────────────────────── */}
      {/* Gate: only open the stress tester when real portfolio inputs exist.    */}
      {/* Without real data we show the honest missing-fields state instead of   */}
      {/* charting the hardcoded default scenario.                               */}
      {view === "stress-test" && !selectedInputs && (
        <div className="p-6">
          <InsightsDashboard missingFields={REQUIRED_INSIGHTS_FIELDS} />
        </div>
      )}
      {view === "stress-test" && selectedInputs && (
        <StressTestProvider key={currentProject?.id ?? 'portfolio'} initialInputs={selectedInputs}>
          <div className="p-5 lg:p-6 space-y-6">
            
            {/* Global Controls Toolbar for Stress Tester */}
            <div className="w-full rounded-2xl border border-white/10 p-4 shadow-2xl backdrop-blur-[20px]"
              style={{ background: 'rgba(30, 27, 32, 0.7)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4 relative z-10 font-hanken">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Phase Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6B6870] uppercase tracking-wider font-semibold">Phase:</span>
                    <select
                      value={globalPhaseFilter}
                      onChange={(e) => setGlobalPhaseFilter(e.target.value as 'all' | 'Acquisition' | 'Fund' | 'Hold' | 'Exit')}
                      className="bg-[#161318] border border-white/10 text-[#C0BEC2] text-xs rounded-lg px-3 py-1.5 focus:border-[#454955] focus:outline-none font-light"
                    >
                      <option value="all">All Phases</option>
                      <option value="Acquisition">Acquisition (Phase 1)</option>
                      <option value="Fund">Fund (Phase 2)</option>
                      <option value="Hold">Hold (Phase 3)</option>
                      <option value="Exit">Exit (Phase 4)</option>
                    </select>
                  </div>

                  {/* Market / Strategy Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6B6870] uppercase tracking-wider font-semibold">Strategy:</span>
                    <select
                      value={globalStrategyFilter}
                      onChange={(e) => setGlobalStrategyFilter(e.target.value as 'all' | 'LTR' | 'STR')}
                      className="bg-[#161318] border border-white/10 text-[#C0BEC2] text-xs rounded-lg px-3 py-1.5 focus:border-[#454955] focus:outline-none font-light"
                    >
                      <option value="all">All Strategies</option>
                      <option value="LTR">Long-Term Rental (LTR)</option>
                      <option value="STR">Short-Term Rental (STR)</option>
                    </select>
                  </div>
                  
                  {/* Single-Project Focus mode selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6B6870] uppercase tracking-wider font-semibold">Focus Mode:</span>
                    <div className="relative">
                      <button
                        onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#161318] border border-white/10 rounded-lg text-xs font-light text-[#C0BEC2] hover:text-white transition-all duration-200"
                      >
                        <span className="max-w-[150px] truncate">{currentProject ? currentProject.propertyName : 'All Projects (Roll-up)'}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-[#6B6870]" />
                      </button>
                      {isProjectDropdownOpen && (
                        <div className="absolute left-0 mt-1 w-60 rounded-xl border border-white/10 bg-[#161318] p-1.5 shadow-2xl z-30 space-y-0.5">
                          <button
                            onClick={() => {
                              clearDeal();
                              setIsProjectDropdownOpen(false);
                            }}
                            className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-left text-xs text-[#C0BEC2] hover:text-white hover:bg-white/5"
                          >
                            <span>All Projects (Roll-up)</span>
                            {!currentProject && <Check className="w-3.5 h-3.5 text-[#6E7480]" />}
                          </button>
                          {filteredProjectsForDropdown.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setDeal(p);
                                setIsProjectDropdownOpen(false);
                              }}
                              className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-left text-xs text-[#C0BEC2] hover:text-white hover:bg-white/5"
                            >
                              <span className="truncate">{p.propertyName ?? p.name}</span>
                              {currentProject?.id === p.id && <Check className="w-3.5 h-3.5 text-[#6E7480]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Empty state if no projects match */}
            {filteredProjects.length === 0 ? (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/95 text-xs font-light flex items-center gap-2 relative z-10 font-hanken">
                <AlertCircle className="w-4 h-4 shrink-0" />
                No projects in the portfolio match the selected phase and strategy filters. Reset your filters to load underwriting diagnostics.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Simulator Sidebar */}
                <div className="lg:col-span-1">
                  <RiskStressTester />
                </div>
                
                {/* Dynamic Charts Dashboard */}
                <div className="lg:col-span-3 rounded-2xl border border-white/10 p-6 shadow-2xl backdrop-blur-[20px] relative overflow-hidden"
                  style={{ background: 'rgba(30, 27, 32, 0.7)' }}
                >
                  <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#454955]/10 rounded-full blur-[100px] pointer-events-none" />
                  <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10 mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-light tracking-tight text-white font-hanken">
                          Underwriting Stress Test Simulator
                        </h1>
                        <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Interactive Simulation
                        </span>
                      </div>
                      <p className="text-sm text-[#9E9DA0] font-extralight tracking-wide font-hanken">
                        Adjust sliders to model worst-case vacancies, opex shocks, rate hikes, and tax spikes.
                      </p>
                    </div>
                  </div>
                  
                  <div className="relative z-10">
                    <StressTestDashboardContent />
                  </div>
                </div>
              </div>
            )}
          </div>
        </StressTestProvider>
      )}

      {/* ── Projections tab ──────────────────────────────────────────────────── */}
      {view === "projections" && (
        <ProjectionsTabContent projects={projects} />
      )}
    </div>
  );
}

// ─── Stress Simulator Inner Wrapper ───
function StressTestDashboardContent() {
  const { result } = useStressTest();
  return <InsightsDashboard data={result} />;
}

// ─── Project mapper helper for Stress Tester ───
// Returns null when there are no projects with the required real-data inputs
// (purchase price + scheduled income). Callers must show the honest gate
// rather than charting any defaults.
function getInputsFromProjects(projectsList: Project[]): InsightsEngineInputs | undefined {
  if (projectsList.length === 0) return undefined;
  
  let totalPurchasePrice = 0;
  let totalRehabBudget = 0;
  let totalDownPayment = 0;
  let totalLoanAmount = 0;
  let weightedInterestRateSum = 0;
  let totalAmortizationTerm = 0;
  let totalGrossScheduledIncome = 0;
  let totalOperatingExpenses = 0;
  let totalVacancyRate = 0;
  
  let totalDaysOnMarket = 0;
  let domCount = 0;
  let totalMedianHomePrice = 0;
  let totalAverageRent = 0;
  let validCount = 0;

  for (const p of projectsList) {
    const f = p.financials;
    if (!f) continue;

    const purchasePrice = f.purchasePrice || f.targetPurchasePrice || f.targetPrice || 0;
    const rehabBudget = f.rehabBudget || f.projectedRehabCost || f.rehabActual || 0;
    const loanAmount = f.loanAmount ?? Math.max(0, purchasePrice - (f.financingCashInvested ?? 0));
    const downPayment = Math.max(0, purchasePrice - loanAmount);
    
    totalPurchasePrice += purchasePrice;
    totalRehabBudget += rehabBudget;
    totalDownPayment += downPayment;
    totalLoanAmount += loanAmount;
    
    weightedInterestRateSum += (f.loanInterestRate ?? 6.0) * loanAmount;
    totalAmortizationTerm += f.loanTermYears ?? f.amortizationYears ?? 30;
    
    const monthlyGrossRent = f.monthlyGrossRent ?? f.projectedMonthlyRent ?? f.projectedRent ?? 0;
    const otherMonthlyIncome = f.otherMonthlyIncome ?? ((f.grossIncomeParking ?? 0) + (f.grossIncomeLaundry ?? 0));
    totalGrossScheduledIncome += (monthlyGrossRent + otherMonthlyIncome) * 12;
    
    const metrics = deriveAllMetrics(f, undefined, p.dispositionType, p.currentPhase);
    totalOperatingExpenses += metrics.noiComponents.totalOperatingExpenses;
    
    totalVacancyRate += f.vacancyRatePercent ?? f.vacancyRate ?? 7.0;
    
    if (f.comparableSales && f.comparableSales.length > 0) {
      totalDaysOnMarket += f.comparableSales.reduce((a, b) => a + b.daysOnMarket, 0) / f.comparableSales.length;
      domCount++;
    }
    
    totalMedianHomePrice += f.estimatedCurrentValue || f.estimatedARV || purchasePrice || 0;
    totalAverageRent += monthlyGrossRent;
    validCount++;
  }

  // Gate: require at least one project that contributed purchase price and rent.
  // Without both we cannot produce a meaningful pro-forma.
  if (validCount === 0 || totalPurchasePrice === 0 || totalGrossScheduledIncome === 0) return undefined;

  const interestRate = totalLoanAmount > 0 
    ? weightedInterestRateSum / totalLoanAmount 
    : 6.0;

  return {
    purchasePrice: totalPurchasePrice,
    rehabBudget: totalRehabBudget,
    downPayment: totalDownPayment,
    interestRate,
    amortizationTerm: Math.round(totalAmortizationTerm / validCount),
    grossScheduledIncome: totalGrossScheduledIncome,
    operatingExpenses: totalOperatingExpenses,
    vacancyRate: totalVacancyRate / validCount,
    marketData: {
      daysOnMarket: domCount > 0 ? Math.round(totalDaysOnMarket / domCount) : 45,
      medianHomePrice: totalMedianHomePrice / validCount,
      averageRent: totalAverageRent / validCount,
    }
  };
}

// Helper to translate phase number to label
function getPhaseName(phaseNum: number): string {
  switch (phaseNum) {
    case 1: return 'Acquisition';
    case 2: return 'Fund';
    case 3: return 'Hold';
    case 4: return 'Exit';
    default: return `Phase ${phaseNum}`;
  }
}

// ─── Per-project Projections Tab ────────────────────────────────────────────
function ProjectionsTabContent({ projects }: { projects: Project[] }) {
  const [selectedId, setSelectedId] = React.useState<string>(projects[0]?.id ?? '');
  const { user } = useAuth();

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  const zipCode = selectedProject?.zip || "";

  // Fetch zip-level market stats
  const { data: marketStats } = useQuery({
    queryKey: ["market-stats-insights", zipCode],
    queryFn: async () => {
      const token = await user?.getIdToken();
      if (!token || !zipCode) throw new Error("Not ready");
      const res = await fetch(`/api/reil/market-stats?zipCode=${zipCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch market stats");
      const data = await res.json();
      return data.stats;
    },
    enabled: !!zipCode && !!user,
  });

  const inputs = selectedProject ? projectToInsightsInputs(selectedProject) : null;

  // Override placeholder days on market using fetched zip statistics
  if (inputs && marketStats?.saleData) {
    const saleData = marketStats.saleData;
    if (saleData.medianDaysOnMarket !== undefined) {
      inputs.marketData.daysOnMarket = saleData.medianDaysOnMarket;
    }
    if (saleData.medianPrice !== undefined) {
      inputs.marketData.medianHomePrice = saleData.medianPrice;
    }
    inputs.marketData.source = marketStats.sourceProvider || "RentCast API";
    inputs.marketData.asOf = marketStats.fetchedAt 
      ? new Date(marketStats.fetchedAt).toISOString()
      : new Date().toISOString();
  }

  const result = inputs ? InsightsEngine.calculate(inputs) : undefined;

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#9E9DA0] text-2xl">folder_open</span>
        </div>
        <p className="text-sm font-semibold text-white">No projects yet</p>
        <p className="text-xs text-[#9E9DA0] font-light max-w-xs">
          Add a project with underwriting inputs to see its 10-year pro-forma projections.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Project selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-[#9E9DA0] whitespace-nowrap">
          Project
        </label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 max-w-xs text-xs font-medium rounded-xl px-3 py-2 cursor-pointer transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(253,255,252,0.85)',
          }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} style={{ background: '#121014' }}>
              {p.propertyName || p.address || p.id}
            </option>
          ))}
        </select>
        {selectedProject && (
          <span className="text-[10px] font-mono text-[#9E9DA0] bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg">
            {selectedProject.phaseStatus ?? `Phase ${selectedProject.currentPhase ?? 1}`}
          </span>
        )}
      </div>

      {/* Market Context Panel */}
      {selectedProject && (
        <MarketContextPanel
          zipCode={selectedProject.zip || ""}
          beds={selectedProject.propertyFacts?.beds}
          propertyType={selectedProject.propertyFacts?.propertyType}
          projectRent={selectedProject.propertyFacts?.estRentCents ? Number(selectedProject.propertyFacts.estRentCents) / 100 : undefined}
          projectPrice={selectedProject.financials?.purchasePrice ? Number(selectedProject.financials.purchasePrice) / 100 : undefined}
        />
      )}

      {/* Assumptions panel — shows the real inputs driving the projection */}
      {inputs && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl border border-white/5 p-4 bg-white/[0.02]">
          {[
            { label: 'Purchase Price',  value: `$${inputs.purchasePrice.toLocaleString()}` },
            { label: 'Annual Rent',     value: `$${inputs.grossScheduledIncome.toLocaleString()}` },
            { label: 'Interest Rate',   value: `${inputs.interestRate}%` },
            { label: 'Vacancy Rate',    value: `${inputs.vacancyRate}%` },
            { label: 'Down Payment',    value: `$${inputs.downPayment.toLocaleString()}` },
            { label: 'Loan Term',       value: `${inputs.amortizationTerm} yr` },
            { label: 'Annual OpEx',     value: `$${inputs.operatingExpenses.toLocaleString()}` },
            { label: 'Rehab Budget',    value: `$${inputs.rehabBudget.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <p className="text-[9px] uppercase tracking-widest text-[#9E9DA0] font-semibold">{label}</p>
              <p className="text-xs font-mono text-white">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard — real data or gate */}
      <InsightsDashboard
        data={result}
        missingFields={result ? undefined : REQUIRED_INSIGHTS_FIELDS}
      />
    </div>
  );
}
