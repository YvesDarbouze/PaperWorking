'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Users, 
  FileText, 
  ArrowUpRight, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  File,
  ShieldCheck,
  FileDown
} from 'lucide-react';
import type { Project, PropertyMetricSnapshot } from '@/types/schema';
import { usePropertyMetricSnapshots } from '@/hooks/usePropertyMetricSnapshots';
import { deriveAllMetrics } from '@/lib/metrics/reiMetrics';
import { getBusinessDaysDiff } from '@/lib/utils/businessDays';

interface ProjectAtAGlanceSidebarProps {
  project: Project;
}

interface ActivityLogDoc {
  id: string;
  userId: string;
  fieldPath: string;
  oldValue: any;
  newValue: any;
  source: string;
  timestamp: any;
}

interface VendorAssignment {
  id: string;
  projectId: string;
  vendorId: string;
  vendorName: string;
  serviceType: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  message?: string;
  quotedFee?: number;
  createdAt: any;
}

/* ─── Helpers ───────────────────────────────────────────────── */
function formatTimeAgo(dateInput: any): string {
  if (!dateInput) return 'recently';
  let date: Date;
  if (dateInput.seconds) {
    date = new Date(dateInput.seconds * 1000);
  } else if (typeof dateInput.toDate === 'function') {
    date = dateInput.toDate();
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    date = new Date(dateInput);
  }
  if (isNaN(date.getTime())) return 'recently';
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function fmtValue(v: number | null, format: string): string {
  if (v === null) return '—';
  switch (format) {
    case 'currency': {
      const abs = Math.abs(v);
      const sign = v < 0 ? '-' : '';
      if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
      if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
      return `${sign}$${abs.toFixed(0)}`;
    }
    case 'percent': return `${v.toFixed(1)}%`;
    case 'ratio': return `${v.toFixed(2)}`;
    default: return String(v);
  }
}

const humanizeFieldPath = (path: string): string => {
  const parts = path.split('.');
  const lastPart = parts[parts.length - 1];
  
  const knownPaths: Record<string, string> = {
    'purchasePrice': 'Purchase Price',
    'estimatedARV': 'Estimated ARV',
    'estimatedCurrentValue': 'Current Value (ARV)',
    'rehabTier': 'Rehab Strategy Tier',
    'rehabTierBudgetLow': 'Rehab Budget (Low)',
    'rehabTierBudgetHigh': 'Rehab Budget (High)',
    'exitStrategyType': 'Exit Strategy',
    'monthlyGrossRent': 'Monthly Gross Rent',
    'projectedMonthlyRent': 'Projected Rent',
    'projectedRent': 'Projected Rent',
    'vacancyRatePercent': 'Vacancy Rate',
    'rehabExpenses': 'Rehab Expenses',
    'holdingCosts': 'Holding Costs',
    'siteVisitLogs': 'Site Visit Logs',
    'scopeOfWork': 'Scope of Work',
    'contractorBids': 'Contractor Bids',
    'drawSchedule': 'Draw Schedule',
    'status': 'Project Status',
    'phaseStatus': 'Phase status',
    'currentStage': 'Rehab Phase Stage'
  };
  
  if (knownPaths[lastPart]) return knownPaths[lastPart];
  return lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

const formatValueForLog = (val: any, fieldPath: string): string => {
  if (val === null || val === undefined) return 'none';
  if (typeof val === 'object') {
    if (Array.isArray(val)) return `[${val.length} items]`;
    return 'Object';
  }
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  
  const pathLower = fieldPath.toLowerCase();
  if (pathLower.includes('price') || pathLower.includes('budget') || pathLower.includes('amount') || pathLower.includes('cost') || pathLower.includes('val')) {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
    }
  }
  if (pathLower.includes('percent') || pathLower.includes('rate')) {
    if (typeof val === 'number') {
      return `${val.toFixed(1)}%`;
    }
  }
  return String(val);
};

/* ─── Main Component ────────────────────────────────────────── */
export function ProjectAtAGlanceSidebar({ project }: ProjectAtAGlanceSidebarProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'timeline' | 'activity' | 'vendors' | 'documents'>('metrics');
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const overdueMilestones = useMemo(() => {
    return (project.closingTimeline || []).filter((m: any) => !m.completed && m.targetDate < todayStr);
  }, [project.closingTimeline, todayStr]);

  const tridWarning = useMemo(() => {
    const template = project.closingTimelineTemplate;
    if (template !== 'financed_conventional' && template !== 'sba') {
      return null;
    }

    const milestones = project.closingTimeline || [];
    const cdMilestone = milestones.find((m: any) => m.key === 'cd_delivered');
    const closingMilestone = milestones.find((m: any) => m.key === 'closing');

    if (!cdMilestone || !closingMilestone) {
      return null;
    }

    const cdDate = cdMilestone.actualDate || cdMilestone.targetDate;
    const closingDate = closingMilestone.actualDate || closingMilestone.targetDate;

    if (!cdDate || !closingDate) {
      return null;
    }

    const bizDays = getBusinessDaysDiff(cdDate, closingDate);

    if (bizDays < 3) {
      return {
        type: 'violation' as const,
        message: `Lenders must provide the Closing Disclosure at least three business days before closing. Currently, there are only ${bizDays} business day(s) of separation between Closing Disclosure delivery (${cdDate}) and Closing Settlement (${closingDate}).`
      };
    }

    const today = new Date(todayStr + 'T12:00:00');
    const closing = new Date(closingDate + 'T12:00:00');
    const calendarDiff = Math.ceil((closing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (calendarDiff < 7 && !cdMilestone.completed) {
      return {
        type: 'approaching' as const,
        message: `Closing Settlement is scheduled in ${calendarDiff} day(s) (on ${closingDate}), but the Closing Disclosure (CD) has not been recorded. Lenders must provide the Closing Disclosure at least three business days before closing.`
      };
    }

    return null;
  }, [project.closingTimeline, project.closingTimelineTemplate, todayStr]);

  // Real-time collections state
  const [activities, setActivities] = useState<ActivityLogDoc[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  
  const [vendorAssignments, setVendorAssignments] = useState<VendorAssignment[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  const { snapshots } = usePropertyMetricSnapshots(project.id, 'monthly');

  // Listen to Project Activity Log subcollection
  useEffect(() => {
    if (!project.id) return;
    
    const q = query(
      collection(db, 'projects', project.id, 'activityLog'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate?.() ?? data.timestamp ?? new Date(),
          } as ActivityLogDoc;
        });
        setActivities(list);
        setActivitiesLoading(false);
      },
      (error) => {
        console.error('Error listening to activity log:', error);
        setActivitiesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [project.id]);

  // Listen to Marketplace Vendor assignments subcollection
  useEffect(() => {
    if (!project.id) return;

    const q = query(
      collection(db, 'projects', project.id, 'vendorAssignments'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VendorAssignment[];
        setVendorAssignments(list);
        setVendorsLoading(false);
      },
      (error) => {
        console.error('Error listening to vendor assignments:', error);
        setVendorsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [project.id]);

  /* ── Tab: Metrics Delta PoP ── */
  const popMetrics = useMemo(() => {
    if (snapshots.length >= 2) {
      const latest = snapshots[snapshots.length - 1];
      const prior = snapshots[snapshots.length - 2];

      const config = [
        { key: 'noi', label: 'NOI', format: 'currency' },
        { key: 'monthlyCashFlow', label: 'Cash Flow', format: 'currency' },
        { key: 'capRate', label: 'Cap Rate', format: 'percent' },
        { key: 'cashOnCashReturn', label: 'CoC Return', format: 'percent' },
        { key: 'dscr', label: 'DSCR', format: 'ratio' },
        { key: 'occupancyRate', label: 'Occupancy', format: 'percent' },
        { key: 'oer', label: 'OER', format: 'percent' },
        { key: 'ltv', label: 'LTV', format: 'percent' },
        { key: 'propertyValue', label: 'Property Value', format: 'currency' }
      ];

      const candidates = config.map((cfg) => {
        const cur = latest[cfg.key as keyof PropertyMetricSnapshot] as number | null;
        const pri = prior[cfg.key as keyof PropertyMetricSnapshot] as number | null;
        
        let delta = 0;
        if (cur !== null && pri !== null && pri !== 0) {
          delta = ((cur - pri) / Math.abs(pri)) * 100;
        } else if (cur !== null && pri === 0) {
          delta = cur > 0 ? 100 : cur < 0 ? -100 : 0;
        }

        return {
          label: cfg.label,
          cur,
          pri,
          delta,
          absDelta: Math.abs(delta),
          format: cfg.format
        };
      })
      .filter((c) => c.cur !== null && c.pri !== null)
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 4);

      return { candidates, hasData: true };
    }

    // Fallback: use current live metric values from project object
    const derived = deriveAllMetrics(
      project.financials ?? {},
      undefined,
      project.dispositionType,
      project.currentPhase
    );

    const noiVal = derived.noi;
    const cfVal = derived.annualCashFlow;
    const capVal = derived.capRate;
    const occVal = derived.occupancyRate;

    const fallbackCandidates = [
      { label: 'NOI', cur: noiVal, pri: null, delta: 0, absDelta: 0, format: 'currency' },
      { label: 'Cash Flow', cur: cfVal, pri: null, delta: 0, absDelta: 0, format: 'currency' },
      { label: 'Cap Rate', cur: capVal, pri: null, delta: 0, absDelta: 0, format: 'percent' },
      { label: 'Occupancy', cur: occVal, pri: null, delta: 0, absDelta: 0, format: 'percent' }
    ];

    return { candidates: fallbackCandidates, hasData: false };
  }, [snapshots, project]);

  // Helper to get displayName of change author
  const getMemberName = (userId: string) => {
    const teamMember = project.projectTeam?.find(m => m.uid === userId);
    if (teamMember?.displayName) return teamMember.displayName;
    const projectMember = project.members?.[userId];
    if (projectMember?.role) return `${projectMember.role} (${userId.slice(0, 5)})`;
    return `User (${userId.slice(0, 5)})`;
  };

  return (
    <div 
      className="glass-card rounded-2xl border flex flex-col overflow-hidden shadow-xl"
      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Header / Tabs Selector */}
      <div 
        className="flex border-b text-xs font-bold uppercase tracking-wider select-none"
        style={{ borderColor: 'var(--border-ui)' }}
      >
        {(() => {
          const hasTimeline = Array.isArray(project.closingTimeline) && project.closingTimeline.length > 0;
          const tabsList = hasTimeline
            ? (['metrics', 'timeline', 'activity', 'vendors', 'documents'] as const)
            : (['metrics', 'activity', 'vendors', 'documents'] as const);
          
          return tabsList.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-center transition-colors border-b-2 outline-none ${
                activeTab === tab
                  ? 'border-[#454955] text-[#454955]'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ));
        })()}
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 min-h-[360px] max-h-[500px] overflow-y-auto no-scrollbar">
        
        {/* ──────── T1: Metrics Tab ──────── */}
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                PoP Change Insights
              </span>
              <span className="text-[10px] text-text-secondary">
                {popMetrics.hasData ? 'Based on last 2 periods' : 'Current active data'}
              </span>
            </div>

            <div className="space-y-3">
              {popMetrics.candidates.map((cand, idx) => {
                const isZero = cand.delta === 0;
                const isUp = cand.delta > 0;
                
                let changeColor = 'text-text-secondary';
                let Icon = Minus;

                if (!isZero) {
                  if (cand.label === 'OER') {
                    // OER lower is better
                    changeColor = isUp ? 'text-red-400' : 'text-pw-success';
                    Icon = isUp ? TrendingUp : TrendingDown;
                  } else {
                    changeColor = isUp ? 'text-pw-success' : 'text-red-400';
                    Icon = isUp ? TrendingUp : TrendingDown;
                  }
                }

                return (
                  <div 
                    key={cand.label}
                    className="p-3.5 rounded-xl border flex items-center justify-between transition-all hover:bg-white/5"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    <div>
                      <p className="text-xs text-text-secondary font-bold uppercase tracking-wider">
                        {cand.label}
                      </p>
                      <p className="text-lg font-black tracking-tight text-text-primary mt-1 font-mono">
                        {fmtValue(cand.cur, cand.format)}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1">
                      {popMetrics.hasData ? (
                        <>
                          <div className={`flex items-center gap-1 text-xs font-bold font-mono ${changeColor}`}>
                            <Icon className="w-3.5 h-3.5" />
                            <span>{isUp ? '+' : ''}{cand.delta.toFixed(1)}%</span>
                          </div>
                          <span className="text-[9px] text-text-secondary font-mono">
                            Prior: {fmtValue(cand.pri, cand.format)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-text-secondary font-bold uppercase tracking-wider">
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {!popMetrics.hasData && (
              <p className="text-[10px] text-center text-text-secondary mt-3 italic">
                Delta percentage calculation will activate once you have at least 2 historical snapshots.
              </p>
            )}
          </div>
        )}

        {/* ──────── T_timeline: Timeline Tab ──────── */}
        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
              Closing Timeline Milestones
            </span>

            {/* Overdue alert */}
            {overdueMilestones.length > 0 && (
              <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-200 space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px] text-red-400">Slippage Detected</p>
                <p className="mt-0.5">The following milestones are past their target dates: {overdueMilestones.map((m: any) => m.label).join(', ')}.</p>
                <p className="mt-1 text-[10px] text-red-300/80 italic">Guidance: Customary delays are frequently caused by underwriting backlogs, title defects, or repair negotiations.</p>
              </div>
            )}

            {/* TRID warning alert */}
            {tridWarning && (
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                tridWarning.type === 'violation' 
                  ? 'border-red-500/20 bg-red-500/10 text-red-200' 
                  : 'border-amber-500/20 bg-amber-500/10 text-amber-200'
              }`}>
                <p className={`font-bold uppercase tracking-wider text-[10px] ${
                  tridWarning.type === 'violation' ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {tridWarning.type === 'violation' ? 'TRID Compliance Warning' : 'TRID Warning — Action Required'}
                </p>
                <p className="mt-0.5 leading-normal">{tridWarning.message}</p>
              </div>
            )}

            <div className="relative border-l border-white/10 ml-2.5 pl-4 space-y-4">
              {(project.closingTimeline || []).map((m) => {
                const isCompleted = m.completed;
                return (
                  <div key={m.id} className="relative group text-xs">
                    {/* Timeline Node */}
                    <div 
                      className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border bg-zinc-950 transition-all ${
                        isCompleted ? 'bg-green-500 border-green-500' : 'bg-zinc-950 border-white/20'
                      }`}
                    />
                    
                    <div className="flex justify-between items-baseline gap-2">
                      <span className={`font-semibold ${isCompleted ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {m.label}
                      </span>
                      <span className="text-[9px] text-text-secondary font-mono">
                        Target: {m.targetDate}
                      </span>
                    </div>

                    {isCompleted ? (
                      <p className="text-green-400 text-[10px] mt-0.5 font-mono">
                        Completed on {m.actualDate || 'N/A'}
                      </p>
                    ) : (
                      <p className="text-text-secondary text-[10px] mt-0.5">
                        Pending (+{m.targetOffsetDays}d offset)
                      </p>
                    )}
                    {m.notes && (
                      <p className="text-[10px] text-text-secondary italic mt-1 bg-white/[0.02] p-1.5 rounded border border-white/5">
                        {m.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────── T2: Activity Tab ──────── */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
              Audit Trail (Last 10 updates)
            </span>

            {activitiesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-text-secondary italic text-xs">
                No activity logs available for this project.
              </div>
            ) : (
              <div className="relative border-l border-white/10 ml-2.5 pl-4 space-y-5">
                {activities.map((act) => (
                  <div key={act.id} className="relative group text-xs">
                    {/* Timeline Node */}
                    <div 
                      className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border bg-zinc-950 transition-colors group-hover:bg-[#454955]"
                      style={{ borderColor: 'var(--border-ui)' }}
                    />
                    
                    <div className="flex justify-between items-baseline gap-2">
                      <span className="font-semibold text-text-primary">
                        {humanizeFieldPath(act.fieldPath)}
                      </span>
                      <span className="text-[9px] text-text-secondary shrink-0 font-mono">
                        {formatTimeAgo(act.timestamp)}
                      </span>
                    </div>

                    <p className="text-text-secondary mt-0.5">
                      {getMemberName(act.userId)} changed field from{' '}
                      <span className="font-mono text-text-primary">
                        {formatValueForLog(act.oldValue, act.fieldPath)}
                      </span>{' '}
                      to{' '}
                      <span className="font-mono text-[#454955]">
                        {formatValueForLog(act.newValue, act.fieldPath)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────── T3: Vendors Tab ──────── */}
        {activeTab === 'vendors' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
              Assigned Professionals & Vendors
            </span>

            {vendorsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Project Team Members (Invited professionals) */}
                {project.projectTeam && project.projectTeam.filter(m => m.status !== 'removed').map((team) => (
                  <div 
                    key={team.id}
                    className="p-3 rounded-xl border flex items-center justify-between gap-3 bg-white/5"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-text-primary truncate">
                          {team.displayName}
                        </p>
                        <p className="text-[10px] text-text-secondary truncate">
                          {team.projectRole} {team.firm ? `at ${team.firm}` : ''}
                        </p>
                      </div>
                    </div>

                    <span 
                      className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                        team.status === 'active' 
                          ? 'bg-pw-success-container text-pw-success border border-pw-success-border' 
                          : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                      }`}
                    >
                      {team.status}
                    </span>
                  </div>
                ))}

                {/* Marketplace Vendor Assignments */}
                {vendorAssignments.map((vendor) => {
                  const isAccepted = vendor.status === 'ACCEPTED' || vendor.status === 'COMPLETED';
                  const isPending = vendor.status === 'PENDING';
                  
                  return (
                    <div 
                      key={vendor.id}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#454955]/10 border border-[#454955]/20 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#454955]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary truncate">
                            {vendor.vendorName}
                          </p>
                          <p className="text-[10px] text-text-secondary truncate">
                            {vendor.serviceType} (Marketplace)
                          </p>
                        </div>
                      </div>

                      <span 
                        className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                          isAccepted 
                            ? 'bg-pw-success-container text-pw-success border border-pw-success-border' 
                            : isPending
                              ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                              : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </div>
                  );
                })}

                {(!project.projectTeam || project.projectTeam.filter(m => m.status !== 'removed').length === 0) && vendorAssignments.length === 0 && (
                  <div className="text-center py-8 text-text-secondary text-xs italic">
                    No professionals or marketplace requests found.
                  </div>
                )}
              </div>
            )}
            
            {/* Vetting Disclaimer */}
            <p className="text-[9px] text-[#6B6870] leading-relaxed pt-2 border-t border-white/5 mt-4">
              PaperWorking does not vet vendors. You must verify credentials and references before engaging.
            </p>
          </div>
        )}

        {/* ──────── T4: Documents Tab ──────── */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider block mb-1">
              Document Vault ({project.roleLinkedDocuments?.length ?? 0} files)
            </span>

            {!project.roleLinkedDocuments || project.roleLinkedDocuments.length === 0 ? (
              <div className="text-center py-10 text-text-secondary text-xs italic">
                No documents uploaded to this workspace yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {project.roleLinkedDocuments.map((doc) => {
                  const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf');
                  
                  return (
                    <div 
                      key={doc.id}
                      className="p-3 rounded-xl border flex items-center justify-between gap-3 hover:bg-white/5 transition-all group"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                          {isPdf ? (
                            <FileDown className="w-4 h-4 text-red-400" />
                          ) : (
                            <File className="w-4 h-4 text-blue-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-xs truncate">
                            {doc.fileName}
                          </p>
                          <p className="text-[10px] text-text-secondary truncate">
                            {doc.category} · {formatBytes(doc.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-pw-success shrink-0" />
                        )}
                        {doc.fileUrl ? (
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-1 rounded text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
                            aria-label={`Open ${doc.fileName}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[9px] font-bold text-text-secondary uppercase">
                            No Link
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
