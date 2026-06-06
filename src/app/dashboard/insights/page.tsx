'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { KPIInsightsDashboard } from '@/components/insights/KPIInsightsDashboard';
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

interface MetricInfo {
  id: string;
  name: string;
  formula: string;
  phase: string;
  description: string;
}

const SHORT_TERM_METRICS: MetricInfo[] = [
  { id: 'NOI', name: 'Net Operating Income', formula: 'NOI = Revenue - OpEx', phase: 'Hold (Phase 3) / Acquisition', description: 'Isolates the property\'s pure operational performance to gauge baseline earning power.' },
  { id: 'CASH_FLOW', name: 'Net Cash Flow', formula: 'Cash Flow = NOI - Debt Service', phase: 'Hold (Phase 3)', description: 'Realized net cash flow distributed monthly or annually after all debt obligations.' },
  { id: 'OER', name: 'Expense Ratio (OER)', formula: 'OER = OpEx / Gross Income', phase: 'Hold (Phase 3)', description: 'Measures operational efficiency; lower OER indicates leaner operations.' },
  { id: 'OCCUPANCY', name: 'Occupancy Rate', formula: 'Occupancy = Occupied Units / Total Units', phase: 'Hold (Phase 3)', description: 'Measures rental asset utilization; critical baseline indicator of asset health.' },
];

const LONG_TERM_METRICS: MetricInfo[] = [
  { id: 'CAP_RATE', name: 'Capitalization Rate', formula: 'Cap Rate = NOI / Property Value', phase: 'Acquisition (Phase 1) / Exit (Phase 4)', description: 'Assesses the baseline return on investment and risk level without factoring leverage.' },
  { id: 'COC', name: 'Cash-on-Cash Return', formula: 'CoC = Annual Cash Flow / Cash Invested', phase: 'Fund (Phase 2) / Hold (Phase 3)', description: 'Measures the cash yield on actual out-of-pocket cash invested.' },
  { id: 'APPRECIATION', name: 'Annualized Appreciation', formula: 'Appreciation = CAGR of Property Value', phase: 'Acquisition (Phase 1)', description: 'Annualized rate of value compounding relative to acquisition cost basis.' },
  { id: 'DSCR', name: 'Debt Service Coverage Ratio', formula: 'DSCR = NOI / Annual Debt Service', phase: 'Fund (Phase 2)', description: 'Measures property ability to cover its debt payments; B2B underwriting benchmark.' },
  { id: 'GRM', name: 'Gross Rent Multiplier', formula: 'GRM = Purchase Price / Gross Annual Rent', phase: 'Acquisition (Phase 1)', description: 'Simple screening tool to check value relative to gross potential income.' },
  { id: 'IRR', name: 'Internal Rate of Return', formula: 'IRR = Solve NPV = 0 for cash flows', phase: 'Exit (Phase 4)', description: 'Overall yield over hold duration factoring exit liquidation.' },
];

export default function InsightsPage() {
  useAllDealsSync();
  const projects = useProjectStore((s) => s.projects);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setDeal = useProjectStore((s) => s.setDeal);
  const clearDeal = useProjectStore((s) => s.clearDeal);
  const { user, profile } = useAuth();

  // ── View: KPI Overview (new) | Deep Analysis (legacy) ──────────────────────
  const [view, setView] = useState<'kpi' | 'analysis'>('kpi');

  const [granularity, setGranularity] = useState<Granularity>('month');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

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
        const strategy = p.strategyType || '';
        const isLTR = strategy.toUpperCase().includes('LONG') || strategy.toUpperCase() === 'LTR';
        const isSTR = strategy.toUpperCase().includes('SHORT') || strategy.toUpperCase() === 'STR';
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
    if (!user) {
      toast.error('You must be logged in to assign tasks.');
      return;
    }
    setSendingInbox(prev => ({ ...prev, [insight.id]: true }));
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/inbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          recipientUid: user.uid,
          organizationId: profile?.personalOrganizationId || 'org_placeholder',
          type: 'action',
          category: 'task_assigned',
          title: `Task: ${insight.headline}`,
          body: `${insight.detail} (Current Value: ${insight.value} vs Target: ${insight.benchmark})${insight.recommendedAction ? `\n\nRecommended Action: ${insight.recommendedAction}` : ''}`,
          senderName: profile?.displayName || 'Insight Engine',
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

  // Retrieves actual displayed value & state for a metric card
  const getCardDisplayValue = useCallback((metricId: string) => {
    const req = METRIC_PHASE_REQUIREMENTS[metricId];
    if (!req) return { isLocked: false, isMissing: true, value: '—' };

    // Determine lock state: locked if all focused/active projects have not reached required phase
    const isLocked = focusedProjects.length > 0 && focusedProjects.every(p => (p.currentPhase ?? 1) < req.phase);

    if (isLocked) {
      return { isLocked: true, locksIn: req.name, value: '🔒 Locked' };
    }

    if (granularity === 'date') {
      if (currentProject) {
        const actuals = deriveActualMetrics(currentProject);
        let val: number | null = null;
        let formatted = '—';

        switch (metricId) {
          case 'NOI':
            val = actuals.noi;
            formatted = val !== null ? `$${Math.round(val).toLocaleString()}` : '—';
            break;
          case 'CASH_FLOW':
            val = actuals.monthlyCashFlow;
            formatted = val !== null ? `$${Math.round(val).toLocaleString()}` : '—';
            break;
          case 'OER':
            val = actuals.oer;
            formatted = val !== null ? `${val.toFixed(1)}%` : '—';
            break;
          case 'OCCUPANCY':
            val = actuals.occupancyRate;
            formatted = val !== null ? `${val.toFixed(1)}%` : '—';
            break;
          case 'CAP_RATE':
            val = actuals.capRate;
            formatted = val !== null ? `${val.toFixed(2)}%` : '—';
            break;
          case 'COC':
            val = actuals.cashOnCashReturn;
            formatted = val !== null ? `${val.toFixed(2)}%` : '—';
            break;
          case 'APPRECIATION':
            val = actuals.annualizedAppreciation;
            formatted = val !== null ? `${val.toFixed(2)}%` : '—';
            break;
          case 'DSCR':
            val = actuals.dscr;
            formatted = val === 999 ? 'N/A (Cash)' : val !== null ? `${val.toFixed(2)}x` : '—';
            break;
          case 'GRM':
            val = actuals.grossRentMultiplier;
            formatted = val !== null ? `${val.toFixed(2)}` : '—';
            break;
          case 'IRR':
            val = actuals.irr;
            formatted = val !== null ? `${val.toFixed(2)}%` : '—';
            break;
        }

        const colorClass = getBenchmarkColorClass(metricId, val);
        return { isLocked: false, isMissing: val === null, value: formatted, colorClass };
      } else {
        return { isLocked: false, isMissing: true, missingLabel: 'Select Project focus', value: '—' };
      }
    } else {
      // Portfolio roll-up snapshots
      if (!snapshots || snapshots.length === 0) {
        return { isLocked: false, isMissing: true, missingLabel: 'No Data', value: '—' };
      }

      const latest = snapshots[snapshots.length - 1];
      let val: number | null = null;
      let formatted = '—';

      switch (metricId) {
        case 'NOI':
          val = latest.noi;
          formatted = val !== null ? `$${Math.round(val).toLocaleString()}` : '—';
          break;
        case 'CASH_FLOW':
          val = latest.monthlyCashFlow;
          formatted = val !== null ? `$${Math.round(val).toLocaleString()}` : '—';
          break;
        case 'OER':
          val = latest.oer;
          formatted = val !== null ? `${val.toFixed(1)}%` : '—';
          break;
        case 'OCCUPANCY':
          val = latest.occupancyRate;
          formatted = val !== null ? `${val.toFixed(1)}%` : '—';
          break;
        case 'CAP_RATE':
          val = latest.capRate;
          formatted = val !== null ? `${val.toFixed(2)}%` : '—';
          break;
        case 'COC':
          val = latest.cashOnCashReturn;
          formatted = val !== null ? `${val.toFixed(2)}%` : '—';
          break;
        case 'APPRECIATION':
          val = latest.appreciation;
          formatted = val !== null ? `${val.toFixed(2)}%` : '—';
          break;
        case 'DSCR':
          val = latest.dscr;
          formatted = val === 999 ? 'N/A (Cash)' : val !== null ? `${val.toFixed(2)}x` : '—';
          break;
        case 'GRM':
          val = latest.grossRentMultiplier;
          formatted = val !== null ? `${val.toFixed(2)}` : '—';
          break;
        case 'IRR':
          val = latest.irr;
          formatted = val !== null ? `${val.toFixed(2)}%` : '—';
          break;
      }

      const colorClass = getBenchmarkColorClass(metricId, val);
      return { isLocked: false, isMissing: val === null, value: formatted, colorClass };
    }
  }, [granularity, currentProject, focusedProjects, snapshots, getBenchmarkColorClass]);

  // Sorting projects by chosen metrics for rankings
  const rankedProjects = useMemo(() => {
    const list = filteredProjects.map(p => {
      const actuals = deriveActualMetrics(p);
      const proForma = deriveProFormaMetrics(p);
      let metricVal: number | null = null;
      let proFormaVal: number | null = null;
      let formattedVal = '—';

      switch (rankingMetric) {
        case 'CAP_RATE':
          metricVal = actuals.capRate;
          proFormaVal = proForma.capRate;
          formattedVal = metricVal !== null ? `${metricVal.toFixed(2)}%` : '—';
          break;
        case 'COC':
          metricVal = actuals.cashOnCashReturn;
          proFormaVal = proForma.cashOnCashReturn;
          formattedVal = metricVal !== null ? `${metricVal.toFixed(2)}%` : '—';
          break;
        case 'CASH_FLOW':
          metricVal = actuals.annualCashFlow;
          proFormaVal = proForma.annualCashFlow;
          formattedVal = metricVal !== null ? `$${Math.round(metricVal).toLocaleString()}` : '—';
          break;
        case 'DSCR':
          metricVal = actuals.dscr;
          proFormaVal = proForma.dscr;
          formattedVal = metricVal === 999 ? 'N/A (Cash)' : metricVal !== null ? `${metricVal.toFixed(2)}x` : '—';
          break;
      }

      const currentPhase = p.currentPhase ?? 1;
      const isLocked = currentPhase < (METRIC_PHASE_REQUIREMENTS[rankingMetric]?.phase ?? 1);

      // Compute drift from thesis
      let driftLabel = '—';
      let driftClass = 'text-[#9E9DA0]';
      if (!isLocked && metricVal !== null && proFormaVal !== null && proFormaVal !== 0) {
        const diff = (metricVal - proFormaVal) / proFormaVal;
        const diffPct = diff * 100;
        if (Math.abs(diff) > 0.02) {
          driftLabel = diffPct > 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`;
          driftClass = diffPct > 0 ? 'text-[#6E7480] bg-[#454955]/10' : 'text-red-400 bg-red-500/10';
        } else {
          driftLabel = 'Aligned';
          driftClass = 'text-[#9E9DA0] bg-white/5';
        }
      }

      // Check standout leader or drag from engine
      const projectInsights = engineInsights.filter(i => i.projectId === p.id);
      const isProjectLeader = engineInsights.some(
        (i) => i.kind === 'standout' && i.severity === 'good' && i.detail.includes(p.propertyName || p.name || '')
      ) || projectInsights.some(
        (i) => i.kind === 'drift' && i.severity === 'good'
      );

      const isProjectDrag = engineInsights.some(
        (i) => i.kind === 'standout' && i.severity === 'risk' && i.detail.includes(p.propertyName || p.name || '')
      ) || projectInsights.some(
        (i) => (i.kind === 'drift' || i.kind === 'benchmark') && i.severity === 'risk'
      );

      return {
        id: p.id,
        name: p.propertyName ?? p.name ?? 'Unnamed Deal',
        phase: getPhaseName(currentPhase),
        isLocked,
        value: isLocked ? '🔒 Locked' : formattedVal,
        numValue: isLocked ? -9999 : (metricVal ?? -999),
        driftLabel,
        driftClass,
        isProjectLeader,
        isProjectDrag
      };
    });

    return list.sort((a, b) => b.numValue - a.numValue);
  }, [filteredProjects, rankingMetric, engineInsights]);

  // Card component renderer
  const renderMetricCard = (metric: MetricInfo) => {
    const { isLocked, locksIn, isMissing, missingLabel, value, colorClass } = getCardDisplayValue(metric.id);
    const isTooltipOpen = activeTooltip === metric.id;

    return (
      <div 
        key={metric.id}
        className="rounded-xl border border-white/5 p-5 relative overflow-hidden backdrop-blur-md transition-all duration-200 hover:border-[#454955]/30 group cursor-default"
        style={{ background: 'rgba(255, 255, 255, 0.02)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <span className="text-[10px] text-[#9E9DA0] font-plus-jakarta font-semibold tracking-widest uppercase">
              {metric.name}
            </span>
            
            {isLocked ? (
              <div className="flex items-center gap-1.5 text-[#6B6870] mt-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs font-light tracking-wide">Unlocks in {locksIn}</span>
              </div>
            ) : isMissing ? (
              <div className="flex items-center gap-1.5 text-amber-500/80 mt-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-light tracking-wide">{missingLabel ?? 'Missing Data'}</span>
              </div>
            ) : (
              <div className={`text-2xl font-light font-mono tracking-tight mt-1 ${colorClass || 'text-white'}`}>
                {value}
              </div>
            )}
          </div>

          <button 
            onClick={() => setActiveTooltip(isTooltipOpen ? null : metric.id)}
            className="p-1 rounded-md text-[#6B6870] hover:text-[#6E7480] hover:bg-white/5 transition-colors relative"
            title="Formula & Phase details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between text-[10px] text-[#6B6870] group-hover:text-[#6E7480]/80 transition-colors pt-3 border-t border-white/[0.03] relative z-10">
          <span className="font-extralight tracking-wider uppercase">{metric.phase}</span>
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {isTooltipOpen && (
          <div 
            className="absolute inset-0 z-20 p-5 flex flex-col justify-between rounded-xl border border-[#454955]/30 backdrop-blur-xl transition-all duration-300"
            style={{ background: 'rgba(9, 16, 21, 0.96)' }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-light text-[#6E7480] tracking-wide">{metric.name}</span>
                <button 
                  onClick={() => setActiveTooltip(null)}
                  className="text-[10px] uppercase text-[#6B6870] hover:text-white tracking-widest"
                >
                  Close
                </button>
              </div>
              <p className="text-xs text-[#C0BEC2] font-extralight leading-relaxed">
                {metric.description}
              </p>
            </div>
            
            <div className="space-y-1.5 pt-2 border-t border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-[#6B6870] font-light">Formula</div>
              <div className="text-xs font-mono text-white bg-white/5 p-1.5 rounded border border-white/5">
                {metric.formula}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
        {(["kpi", "analysis"] as const).map((v) => {
          const label = v === "kpi" ? "KPI Overview" : "Deep Analysis";
          const icon  = v === "kpi" ? "monitoring"   : "analytics";
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
      {view === "kpi" && <KPIInsightsDashboard />}

      {/* ── Deep Analysis tab (existing content) ─────────────────────────────── */}
      {view === "analysis" && (
      <div className="p-6 space-y-6">
      <div
        className="w-full rounded-2xl border border-white/10 p-8 shadow-2xl backdrop-blur-[20px] transition-all duration-300 relative overflow-hidden"
        style={{ background: 'rgba(30, 27, 32, 0.7)' }}
      >
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#454955]/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-light tracking-tight text-white font-hanken">
                Portfolio Diagnostics & Insights
              </h1>
              <span className="text-[10px] font-mono bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Read-Only
              </span>
            </div>
            <p className="text-sm text-[#9E9DA0] font-extralight tracking-wide font-hanken">
              Deterministic underwriting analysis, pro-forma thesis drift, and portfolio risk mapping.
            </p>
          </div>
        </div>

        {/* Dominant Phase Notice / Focus Banner */}
        {dominantPhaseInfo && (
          <div className={`mt-4 p-4 rounded-xl border ${dominantPhaseInfo.color} text-xs font-light flex items-center gap-3 relative z-10 font-hanken`}>
            <Layers className="w-5 h-5 shrink-0" />
            <div>
              <span className="font-semibold block mb-0.5">{dominantPhaseInfo.label}</span>
              <span className="text-[#C0BEC2] leading-relaxed block">{dominantPhaseInfo.description}</span>
            </div>
          </div>
        )}

        {/* Global Controls Toolbar */}
        <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-wrap items-center justify-between gap-4 relative z-10 font-hanken">
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

          {/* Time Granularity Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-xl">
            {granularityOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = granularity === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setGranularity(opt.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-all duration-200 ${
                    isActive
                      ? 'bg-[#454955]/20 text-[#8a8e9a] border border-[#454955]/30'
                      : 'text-[#9E9DA0] hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {opt.label.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Controls Empty/Warning state */}
        {filteredProjects.length === 0 && (
          <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/95 text-xs font-light flex items-center gap-2 relative z-10 font-hanken">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No projects in the portfolio match the selected phase and strategy filters. Reset your filters to load underwriting diagnostics.
          </div>
        )}

        {/* SECTION 1: Portfolio Scorecard (10 Core Metrics Grid) */}
        {filteredProjects.length > 0 && (
          <div className="space-y-6 mt-6 relative z-10 font-hanken">
            <div className="rounded-xl border border-white/5 p-6 bg-white/[0.02] backdrop-blur-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#454955]/10 border border-[#454955]/20">
                  <Grid className="w-5 h-5 text-[#6E7480]" />
                </div>
                <div>
                  <h2 className="text-lg font-light tracking-wide text-white">
                    Portfolio Scorecard
                  </h2>
                  <p className="text-xs text-[#9E9DA0] font-extralight tracking-wider uppercase">
                    10 core financial & operational metrics across the REIL investment lifecycle
                  </p>
                </div>
              </div>

              {/* Sub-group A: Short-Term Operational Metrics (NOI, Cash Flow, OER, Occupancy) */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-[#9E9DA0] uppercase tracking-widest border-b border-white/[0.04] pb-2">
                  Short-Term Operational Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {SHORT_TERM_METRICS.map(renderMetricCard)}
                </div>
              </div>

              {/* Sub-group B: Long-Term Performance Projections (Cap Rate, CoC, Appreciation, DSCR, GRM, IRR) */}
              <div className="space-y-4 pt-4 border-t border-white/[0.03]">
                <h3 className="text-xs font-semibold text-[#9E9DA0] uppercase tracking-widest border-b border-white/[0.04] pb-2">
                  Long-Term Performance Projections
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {LONG_TERM_METRICS.map(renderMetricCard)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Underwriting Variance (Pro-Forma vs. Actuals Table) */}
        {filteredProjects.length > 0 && (
          <div className="mt-6 space-y-4 relative z-10 font-hanken">
            <div className="rounded-xl border border-white/5 p-6 bg-white/[0.02] backdrop-blur-sm space-y-4">
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
                      // lower expenses are better, so if actual <= target, variance is negative or 0 (good)
                      const oerVarColor = oerVar !== null ? (oerVar <= 0 ? 'text-[#6E7480] bg-[#454955]/10' : 'text-red-400 bg-red-500/10') : 'text-[#6B6870]';

                      const strategyLabel = p.strategyType || 'LTR';

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

        {/* SECTION 3: Rankings & Trend Intelligence (Comparative Section + Historical charts) */}
        {filteredProjects.length > 0 && (
          <div className="mt-6 space-y-6 relative z-10 font-hanken">
            <div className="rounded-xl border border-white/5 p-6 bg-white/[0.02] backdrop-blur-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#454955]/10 border border-[#454955]/20">
                  <TrendingUp className="w-5 h-5 text-[#454955]" />
                </div>
                <div>
                  <h2 className="text-lg font-light tracking-wide text-white">
                    Rankings & Trend Intelligence
                  </h2>
                  <p className="text-xs text-[#9E9DA0] font-extralight tracking-wider uppercase">
                    Cross-property performance leaderboards, concentrations, and chronological trajectories
                  </p>
                </div>
              </div>

              {/* Leaders list & Scatter plot row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Project Rankings list (5 cols) */}
                <div className="lg:col-span-5 rounded-xl border border-white/5 p-5 bg-white/[0.01] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wide text-white uppercase">Rankings</h3>
                    <div className="flex items-center gap-3">
                      {/* Rank Only Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input 
                          type="checkbox"
                          checked={rankOnly}
                          onChange={(e) => setRankOnly(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-white/10 bg-[#161318] text-[#454955] focus:ring-0 focus:ring-offset-0 focus:outline-none"
                        />
                        <span className="text-[10px] text-[#9E9DA0] hover:text-[#C0BEC2] font-light">Rank Only</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-[#6B6870] uppercase tracking-widest mr-1">Sort:</span>
                        <select 
                          value={rankingMetric}
                          onChange={(e) => setRankingMetric(e.target.value as RankingMetric)}
                          className="bg-[#161318] border border-white/10 rounded px-2 py-1 text-[10px] font-light text-[#C0BEC2] focus:outline-none focus:border-[#454955]/50"
                        >
                          <option value="COC">Cash-on-Cash Return</option>
                          <option value="CAP_RATE">Cap Rate</option>
                          <option value="CASH_FLOW">Cash Flow</option>
                          <option value="DSCR">DSCR</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                    {rankedProjects.map((item, index) => {
                      const isLeader = item.isProjectLeader;
                      const isWorst = item.isProjectDrag;
                      
                      let accentBorder = 'border-white/5 hover:border-white/15';
                      if (isLeader) accentBorder = 'border-[#454955]/20 bg-[#454955]/[0.01] hover:border-[#454955]/30';
                      if (isWorst) accentBorder = 'border-red-500/20 bg-red-500/[0.01] hover:border-red-500/30';

                      return (
                        <div 
                          key={item.id} 
                          className={`p-3 rounded-lg border ${accentBorder} flex items-center justify-between text-xs transition-colors`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="font-mono text-[#6B6870] text-[10px] w-4 shrink-0">#{index + 1}</span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-white truncate max-w-[120px]">{item.name}</p>
                                {isLeader && (
                                  <span className="text-[8px] bg-[#454955]/10 text-[#6E7480] border border-[#454955]/20 px-1 py-0.2 rounded font-plus-jakarta font-semibold shrink-0">
                                    Beating Thesis
                                  </span>
                                )}
                                {isWorst && (
                                  <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-1 py-0.2 rounded font-plus-jakarta font-semibold shrink-0">
                                    Portfolio Drag
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-[#6B6870] uppercase tracking-wider">{item.phase}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3.5 shrink-0 text-right">
                            {!rankOnly && item.driftLabel !== '—' && (
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${item.driftClass}`}>
                                Δ {item.driftLabel}
                              </span>
                            )}
                            <span className="font-mono font-bold text-white text-sm tabular-nums">
                              {rankOnly ? `Ranked #${index + 1}` : item.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Outliers Scatter Plot (7 cols) */}
                <div className="lg:col-span-7 rounded-xl border border-white/5 p-5 bg-white/[0.01] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold tracking-wide text-white uppercase">Risk-vs-Return Outliers</h3>
                    <div className="flex items-center gap-2">
                      {/* X axis metric selection */}
                      <select
                        value={scatterXMetric}
                        onChange={(e) => setScatterXMetric(e.target.value as 'capRate' | 'dscr' | 'oer')}
                        className="bg-[#161318] border border-white/10 rounded px-2 py-1 text-[10px] font-light text-[#C0BEC2] focus:outline-none"
                      >
                        <option value="capRate">X: Cap Rate</option>
                        <option value="dscr">X: DSCR</option>
                        <option value="oer">X: OER</option>
                      </select>
                      
                      {/* Y axis metric selection */}
                      <select
                        value={scatterYMetric}
                        onChange={(e) => setScatterYMetric(e.target.value as 'cashOnCashReturn' | 'annualizedAppreciation' | 'irr')}
                        className="bg-[#161318] border border-white/10 rounded px-2 py-1 text-[10px] font-light text-[#C0BEC2] focus:outline-none"
                      >
                        <option value="cashOnCashReturn">Y: Cash-on-Cash</option>
                        <option value="annualizedAppreciation">Y: Appreciation</option>
                        <option value="irr">Y: IRR</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-2 p-2 bg-[#0c1417]/30 rounded-xl border border-white/[0.03]">
                    <RiskReturnScatterChart 
                      projects={focusedProjects}
                      xAxisMetric={scatterXMetric}
                      yAxisMetric={scatterYMetric}
                    />
                  </div>
                </div>
              </div>

              {/* Historical Trend Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-white/[0.03]">
                {/* Short-Term Trend Chart */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <h4 className="text-[10px] font-semibold text-[#9E9DA0] tracking-wider uppercase mb-2">Short-Term Historical Trend</h4>
                  <ShortTermTrendChart snapshots={snapshots} />
                </div>

                {/* Long-Term Trend Chart */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                  <h4 className="text-[10px] font-semibold text-[#9E9DA0] tracking-wider uppercase mb-2">Long-Term Historical Trend</h4>
                  <LongTermTrendChart snapshots={snapshots} />
                </div>
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
      </div>
      </div>
      )}
    </div>
  );
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
