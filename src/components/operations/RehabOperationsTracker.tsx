'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useAuth } from '@/context/AuthContext';
import type { LedgerItem } from '@/types/schema';
import { 
  Download, 
  Wallet, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  Clock,
  Activity,
  HardHat,
  MoreVertical,
  Check,
  Verified,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Users,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  Settings
} from 'lucide-react';

// ── Component-local types ─────────────────────────────────────
interface BudgetLine {
  id: string;
  category: string;
  resourceType: 'materials' | 'labor' | 'mixed';
  resourceDescription?: string;
  estimated: number;
}

interface ActualEntry {
  id: string;
  budgetLineId: string;
  vendor: string;
  description: string;
  amount: number;
  createdAt: string; // ISO string
}

interface W9Record {
  vendor: string;
  w9Received: boolean;
}

interface DrawEntry {
  id: string;
  description: string;
  totalAmount: number;
  drawnAmount: number;
  pendingAmount: number;
  status: 'Pending Inspector' | 'Approved' | 'Rejected';
  requestedAt: string;
}

interface PermitEntry {
  id: string;
  type: string;
  municipality: string;
  appliedAt: string | null;
  approvedAt: string | null;
  finalSignOffAt: string | null;
  status: 'Not Filed' | 'Filed' | 'Approved' | 'Final Sign-Off' | 'Denied';
}

interface TrackerData {
  budgetLines: BudgetLine[];
  actualEntries: ActualEntry[];
  w9Records: W9Record[];
  drawEntries: DrawEntry[];
  permitEntries: PermitEntry[];
  contingencyPct: number;
  totalLoanAmount: number;
}

// ── Helpers ───────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  'Demo', 'Foundation', 'Framing', 'Roofing', 'Plumbing',
  'Electrical', 'HVAC', 'Drywall', 'Flooring', 'Painting', 'Landscaping', 'Other',
];

const DEFAULT_TRACKER_DATA: TrackerData = {
  budgetLines: [
    { id: 'bl-1', category: 'Framing', resourceType: 'labor', resourceDescription: 'Labor / Steel', estimated: 240000 },
    { id: 'bl-2', category: 'HVAC', resourceType: 'materials', resourceDescription: 'Materials / Mech', estimated: 85000 },
    { id: 'bl-3', category: 'Foundation', resourceType: 'mixed', resourceDescription: 'Chemical / Labor', estimated: 45000 },
    { id: 'bl-4', category: 'Electrical', resourceType: 'labor', resourceDescription: 'Labor', estimated: 112000 },
    { id: 'bl-5', category: 'Other', resourceType: 'materials', resourceDescription: 'Materials (Millwork)', estimated: 195000 },
    { id: 'bl-6', category: 'Landscaping', resourceType: 'mixed', resourceDescription: 'Mixed', estimated: 60000 },
  ],
  actualEntries: [
    { id: 'ae-1', budgetLineId: 'bl-1', vendor: 'J. Carlson Framing', description: 'Structural steel & framing labor', amount: 238420, createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
    { id: 'ae-2', budgetLineId: 'bl-2', vendor: 'Lunar Electric', description: 'HVAC unit installation', amount: 92300, createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString() },
    { id: 'ae-3', budgetLineId: 'bl-3', vendor: 'Foundation Corp', description: 'Sealant application', amount: 45000, createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString() },
    { id: 'ae-4', budgetLineId: 'bl-4', vendor: 'Lunar Electric', description: 'Electrical rough-in', amount: 108000, createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() },
    { id: 'ae-5', budgetLineId: 'bl-5', vendor: 'Custom Cabinets LLC', description: 'Millwork delivery', amount: 208000, createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
  ],
  w9Records: [
    { vendor: 'J. Carlson Framing', w9Received: true },
    { vendor: 'Lunar Electric', w9Received: false },
    { vendor: 'Foundation Corp', w9Received: true },
    { vendor: 'Custom Cabinets LLC', w9Received: true }
  ],
  drawEntries: [
    { id: 'de-1', description: 'Site Prep & Demolition', totalAmount: 325000, drawnAmount: 325000, pendingAmount: 0, status: 'Approved', requestedAt: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString() },
    { id: 'de-2', description: 'Rough Plumbing/Electrical', totalAmount: 280000, drawnAmount: 280000, pendingAmount: 0, status: 'Approved', requestedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString() },
    { id: 'de-3', description: 'Sheetrock & Insulations', totalAmount: 245000, drawnAmount: 0, pendingAmount: 245000, status: 'Pending Inspector', requestedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString() },
    { id: 'de-4', description: 'Finishes & Landscaping', totalAmount: 185000, drawnAmount: 0, pendingAmount: 0, status: 'Pending Inspector', requestedAt: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString() }
  ],
  permitEntries: [],
  contingencyPct: 0.15,
  totalLoanAmount: 1450000,
};

function toLedgerCategory(cat: string): LedgerItem['category'] {
  const map: Record<string, LedgerItem['category']> = {
    Plumbing: 'Plumbing',
    Electrical: 'Electrical',
    Framing: 'Framing',
    HVAC: 'HVAC',
    Foundation: 'Foundation',
    Other: 'Other',
    Demo: 'Other',
    Roofing: 'Other',
    Drywall: 'Other',
    Flooring: 'Other',
    Painting: 'Other',
    Landscaping: 'Other',
  };
  return map[cat] ?? 'General';
}

export default function RehabOperationsTracker() {
  const currentProject = useProjectStore(s => s.currentProject);
  const projects = useProjectStore(s => s.projects);
  const setDeal = useProjectStore(s => s.setDeal);
  const updateRehabModule = useProjectStore(s => s.updateRehabModule);
  const setLedgerItems = useProjectStore(s => s.setLedgerItems);
  const getLedgerItemsForProject = useProjectStore(s => s.getLedgerItemsForProject);
  const { user } = useAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [resourceFilter, setResourceFilter] = useState<'materials' | 'labor' | null>(null);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // ── Local actual log state (inline under rows) ────────────────
  const [actualVendor, setActualVendor] = useState('');
  const [actualDesc, setActualDesc] = useState('');
  const [actualAmt, setActualAmt] = useState('');

  // ── New Entry Modal state ─────────────────────────────────────
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [modalTab, setModalTab] = useState<'cost' | 'budget' | 'draw' | 'settings'>('cost');

  // Modal cost fields
  const [mCostLineId, setMCostLineId] = useState('');
  const [mCostVendor, setMCostVendor] = useState('');
  const [mCostDesc, setMCostDesc] = useState('');
  const [mCostAmt, setMCostAmt] = useState('');
  const [mCostDate, setMCostDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Modal budget fields
  const [mBudgetCat, setMBudgetCat] = useState(DEFAULT_CATEGORIES[0]);
  const [mBudgetEst, setMBudgetEst] = useState('');
  const [mBudgetType, setMBudgetType] = useState<'materials' | 'labor' | 'mixed'>('mixed');
  const [mBudgetDesc, setMBudgetDesc] = useState('');

  // Modal draw fields
  const [mDrawDesc, setMDrawDesc] = useState('');
  const [mDrawTotal, setMDrawTotal] = useState('');
  const [mDrawDrawn, setMDrawDrawn] = useState('');
  const [mDrawPending, setMDrawPending] = useState('');

  // ── Load client data safely from store ───────────────────────
  const [data, setData] = useState<TrackerData>(() => {
    const stored = (currentProject?.rehab as any)?.rehabTracker as TrackerData | undefined;
    if (!stored) return DEFAULT_TRACKER_DATA;
    return {
      ...DEFAULT_TRACKER_DATA,
      ...stored,
      budgetLines: stored.budgetLines || DEFAULT_TRACKER_DATA.budgetLines,
      actualEntries: stored.actualEntries || DEFAULT_TRACKER_DATA.actualEntries,
      w9Records: stored.w9Records || DEFAULT_TRACKER_DATA.w9Records,
      drawEntries: stored.drawEntries || DEFAULT_TRACKER_DATA.drawEntries,
      permitEntries: stored.permitEntries || DEFAULT_TRACKER_DATA.permitEntries,
    };
  });

  const { budgetLines, actualEntries, w9Records, drawEntries, contingencyPct, totalLoanAmount } = data;

  // ── Persist changes to store and remote API ───────────────────
  const persist = useCallback(
    async (next: TrackerData) => {
      setData(next);
      if (!currentProject) return;

      const baseBudget = next.budgetLines.reduce((s, l) => s + l.estimated, 0);

      const rehabUpdates = {
        rehabTracker: next,
        baseBudget,
        contingencyBufferPercentage: next.contingencyPct,
      };

      updateRehabModule(currentProject.id, rehabUpdates as any);

      // Roll actual costs into transaction ledger
      const existing = getLedgerItemsForProject(currentProject.id) || [];
      const nonTracker = existing.filter(i => !i.id.startsWith('rehab-tracker-'));
      const trackerItems: LedgerItem[] = next.actualEntries.map(e => ({
        id: `rehab-tracker-${e.id}`,
        projectId: currentProject.id,
        organizationId: currentProject.organizationId,
        type: 'expense' as const,
        category: toLedgerCategory(
          next.budgetLines.find(l => l.id === e.budgetLineId)?.category ?? 'Other'
        ),
        description: `${e.description} — ${e.vendor}`,
        amount: e.amount,
        status: 'Approved' as const,
        submittedByUid: 'rehab-tracker',
        createdAt: new Date(e.createdAt),
      }));
      setLedgerItems(currentProject.id, [...nonTracker, ...trackerItems]);

      if (!user) return;
      try {
        setIsSaving(true);
        const idToken = await user.getIdToken();
        
        await fetch('/api/projects/rehab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             idToken,
             projectId: currentProject.id,
             updates: rehabUpdates
          })
        });
      } catch (err) {
        console.error('Failed to save rehab state to backend', err);
      } finally {
        setIsSaving(false);
      }
    },
    [currentProject, updateRehabModule, getLedgerItemsForProject, setLedgerItems, user]
  );

  // ── Derived computations ──────────────────────────────────────
  const actualsByLine = useMemo(() => {
    const map: Record<string, number> = {};
    actualEntries.forEach(e => {
      map[e.budgetLineId] = (map[e.budgetLineId] ?? 0) + e.amount;
    });
    return map;
  }, [actualEntries]);

  const totalEstimated = useMemo(() => {
    return budgetLines.reduce((s, l) => s + l.estimated, 0);
  }, [budgetLines]);

  const totalActual = useMemo(() => {
    return actualEntries.reduce((s, e) => s + e.amount, 0);
  }, [actualEntries]);

  const totalVariance = totalEstimated - totalActual;

  const contingencyAmount = totalEstimated * contingencyPct;
  const overBudgetTotal = useMemo(() => {
    return budgetLines.reduce((s, l) => {
      const actual = actualsByLine[l.id] ?? 0;
      return actual > l.estimated ? s + (actual - l.estimated) : s;
    }, 0);
  }, [budgetLines, actualsByLine]);

  const remainingContingency = Math.max(0, contingencyAmount - overBudgetTotal);

  const weeklyBurn = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return actualEntries
      .filter(e => new Date(e.createdAt).getTime() >= sevenDaysAgo)
      .reduce((s, e) => s + e.amount, 0);
  }, [actualEntries]);

  const vendorTotals = useMemo(() => {
    const map: Record<string, number> = {};
    actualEntries.forEach(e => {
      if (e.vendor) {
        map[e.vendor] = (map[e.vendor] ?? 0) + e.amount;
      }
    });
    return map;
  }, [actualEntries]);

  const totalDrawn = drawEntries.reduce((s, d) => s + d.drawnAmount, 0);
  const totalPendingDraw = drawEntries.reduce((s, d) => s + d.pendingAmount, 0);
  const drawPct = totalLoanAmount > 0 ? Math.min((totalDrawn / totalLoanAmount) * 100, 100) : 0;

  const filteredBudgetLines = useMemo(() => {
    if (!resourceFilter) return budgetLines;
    return budgetLines.filter(l => l.resourceType === resourceFilter);
  }, [budgetLines, resourceFilter]);

  const categorySubtotalEst = filteredBudgetLines.reduce((s, l) => s + l.estimated, 0);
  const categorySubtotalAct = filteredBudgetLines.reduce((s, l) => (actualsByLine[l.id] ?? 0) + s, 0);

  // ── Operations handlers ───────────────────────────────────────
  const addActualEntry = (lineId: string) => {
    if (!actualVendor || !actualAmt) return;
    const entry: ActualEntry = {
      id: `ae-${Date.now()}`,
      budgetLineId: lineId,
      vendor: actualVendor,
      description: actualDesc || `Log payment for ${budgetLines.find(l => l.id === lineId)?.category ?? 'category'}`,
      amount: parseFloat(actualAmt) || 0,
      createdAt: new Date().toISOString(),
    };
    const nextW9 = w9Records.find(r => r.vendor === actualVendor)
      ? w9Records
      : [...w9Records, { vendor: actualVendor, w9Received: false }];

    persist({
      ...data,
      actualEntries: [...actualEntries, entry],
      w9Records: nextW9,
    });

    setActualVendor('');
    setActualDesc('');
    setActualAmt('');
  };

  const deleteActualEntry = (id: string) => {
    persist({
      ...data,
      actualEntries: actualEntries.filter(e => e.id !== id),
    });
  };

  const addBudgetLine = (category: string, estimated: number, type: 'materials' | 'labor' | 'mixed', desc: string) => {
    const line: BudgetLine = {
      id: `bl-${Date.now()}`,
      category,
      estimated,
      resourceType: type,
      resourceDescription: desc || type,
    };
    persist({
      ...data,
      budgetLines: [...budgetLines, line],
    });
  };

  const removeBudgetLine = (id: string) => {
    persist({
      ...data,
      budgetLines: budgetLines.filter(l => l.id !== id),
      actualEntries: actualEntries.filter(e => e.budgetLineId !== id),
    });
    if (expandedRowId === id) setExpandedRowId(null);
  };

  const addDrawRequest = (description: string, total: number, drawn: number, pending: number) => {
    const newDraw: DrawEntry = {
      id: `de-${Date.now()}`,
      description,
      totalAmount: total,
      drawnAmount: drawn,
      pendingAmount: pending,
      status: 'Pending Inspector',
      requestedAt: new Date().toISOString(),
    };
    persist({
      ...data,
      drawEntries: [...drawEntries, newDraw],
    });
  };

  const updateDrawStatus = (id: string, status: DrawEntry['status']) => {
    persist({
      ...data,
      drawEntries: drawEntries.map(d => d.id === id ? { ...d, status } : d),
    });
  };

  const removeDrawEntry = (id: string) => {
    persist({
      ...data,
      drawEntries: drawEntries.filter(d => d.id !== id),
    });
  };

  const toggleW9 = (vendor: string) => {
    persist({
      ...data,
      w9Records: w9Records.map(r => r.vendor === vendor ? { ...r, w9Received: !r.w9Received } : r),
    });
  };

  const handleExportLedger = () => {
    const headers = ['Category', 'Resource Type', 'Estimated', 'Actual', 'Variance', 'Status'];
    const rows = budgetLines.map(line => {
      const actual = actualsByLine[line.id] ?? 0;
      const variance = line.estimated - actual;
      const statusInfo = getLineStatus(line.estimated, actual);
      return [
        `"${line.category}"`,
        `"${line.resourceType || 'mixed'}"`,
        line.estimated,
        actual,
        variance,
        `"${statusInfo.text}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `rehab_ledger_${currentProject?.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLineStatus = (estimated: number, actual: number) => {
    if (actual === 0) return { text: 'PENDING', bg: 'bg-white/10 text-on-surface-variant' };
    const pct = actual / estimated;
    if (pct > 1.05) return { text: 'ALERT', bg: 'bg-error/10 text-error border border-error/20' };
    if (pct > 1.0) return { text: 'OVERAGE', bg: 'bg-error/10 text-error' };
    if (pct === 1.0) return { text: 'STABLE', bg: 'bg-white/10 text-on-surface-variant' };
    return { text: 'SETTLED', bg: 'bg-primary/10 text-primary border border-primary/20' };
  };

  const formatVariance = (estimated: number, actual: number) => {
    const diff = actual - estimated;
    if (diff > 0) return { text: `+$${diff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-error' };
    if (diff < 0) return { text: `-$${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-primary' };
    return { text: '$0.00', color: 'text-on-surface-variant' };
  };

  const handleOpenModal = (tab: typeof modalTab) => {
    setModalTab(tab);
    if (budgetLines.length > 0 && !mCostLineId) {
      setMCostLineId(budgetLines[0].id);
    }
    setShowNewEntryModal(true);
  };

  if (!currentProject) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border border-white/5 max-w-2xl mx-auto my-12">
        <HardHat className="w-16 h-16 mx-auto text-primary/30 mb-4 animate-pulse" />
        <h3 className="text-xl font-bold text-on-surface">No Active Project Selected</h3>
        <p className="mt-2 text-on-surface-variant text-sm mb-6">
          Select an active project from the portfolio or dashboard to load the Rehab & Operations Tracker.
        </p>
        <div className="max-w-xs mx-auto">
          <select
            id="fallback-project-select"
            value=""
            onChange={(e) => {
              const p = projects.find(proj => proj.id === e.target.value);
              if (p) setDeal(p);
            }}
            className="bg-white/5 border border-white/10 rounded-lg text-sm text-on-surface p-2 focus:ring-1 focus:ring-primary backdrop-blur-md cursor-pointer outline-none w-full"
          >
            <option value="" disabled className="bg-surface-container-lowest text-on-surface">-- Select a Project --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface-container-lowest text-on-surface">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest text-on-surface font-sans overflow-x-hidden selection:bg-primary/30 selection:text-primary min-h-screen">
      <main className="pt-8 pb-32 px-5 lg:px-8 max-w-[1600px] mx-auto">
        
        {/* Title & Status */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest border border-primary/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-ping"></span>
                Active Rehab
              </span>
              <span className="text-on-surface-variant text-sm font-mono">ID: {currentProject?.id || 'PW-8842-OPS'}</span>
              {isSaving && (
                <span className="flex items-center gap-1 text-[10px] text-primary/80 font-semibold animate-pulse font-sans">
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </span>
              )}
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-display font-bold text-on-surface tracking-tight">Rehab & Operations Tracker</h1>
              <div className="flex items-center gap-2 mt-1 md:mt-0">
                <select
                  id="header-project-select"
                  value={currentProject?.id || ''}
                  onChange={(e) => {
                    const p = projects.find(proj => proj.id === e.target.value);
                    if (p) setDeal(p);
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg text-sm text-on-surface p-2 focus:ring-1 focus:ring-primary backdrop-blur-md cursor-pointer outline-none max-w-[280px] md:max-w-xs truncate"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface-container-lowest text-on-surface">
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="text-on-surface-variant text-sm font-sans whitespace-nowrap">— Phase 3 Execution</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportLedger}
              className="glass-card px-4 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10"
            >
              <Download className="w-4 h-4" /> Export Ledger
            </button>
            <button 
              onClick={() => handleOpenModal('cost')}
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:brightness-110 active:scale-95 transition-all luminous-glow flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> New Entry
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          
          {/* KPI 1 */}
          <div className="glass-card p-5 rounded-xl border-l-4 border-l-primary flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Total Approved</span>
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">
                ${(totalLoanAmount || totalEstimated).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-primary mt-1 font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> BASED ON CONTRACTED ESTIMATES
              </div>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Deployed Capital</span>
              <Wallet className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">
                ${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-500" 
                  style={{ 
                    width: `${totalEstimated > 0 ? Math.min((totalActual / totalEstimated) * 100, 100) : 0}%`,
                    boxShadow: '0 0 10px rgba(87, 241, 219, 0.4)' 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* KPI 3 */}
          <div className={`glass-card p-5 rounded-xl border-l-4 flex flex-col justify-between h-36 ${
            remainingContingency < 20000 ? 'border-l-error' : 'border-l-primary'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Remaining Contingency</span>
              <AlertTriangle className={`w-5 h-5 ${remainingContingency < 20000 ? 'text-error' : 'text-primary'}`} />
            </div>
            <div>
              <div className={`font-mono text-2xl font-bold ${remainingContingency < 20000 ? 'text-error' : 'text-on-surface'}`}>
                ${remainingContingency.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-[10px] mt-1 font-semibold flex items-center gap-1 ${
                remainingContingency < 20000 ? 'text-error' : 'text-primary'
              }`}>
                <AlertTriangle className="w-3 h-3" /> 
                {contingencyAmount > 0 ? ((remainingContingency / contingencyAmount) * 100).toFixed(0) : 0}% OF BUFFER REMAINING
              </div>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="glass-card p-5 rounded-xl flex flex-col justify-between h-36">
            <div className="flex justify-between items-start">
              <span className="text-on-surface-variant text-xs font-bold uppercase tracking-wider">Burn Rate (Weekly)</span>
              <Activity className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <div className="font-mono text-2xl text-on-surface font-bold">
                ${weeklyBurn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[10px] text-on-surface-variant mt-1 font-semibold">ACTUAL COSTS LOGGED LAST 7 DAYS</div>
            </div>
          </div>
        </div>

        {/* Main Layout: Table + Sidebar */}
        <div className="flex flex-col xl:grid xl:grid-cols-12 gap-8 items-start">
          
          {/* Wide Data Table */}
          <div className="xl:col-span-9 glass-card rounded-2xl overflow-hidden w-full border border-white/5">
            <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-display font-bold text-on-surface">Budget Breakdown</h3>
                <p className="text-xs text-on-surface-variant mt-1">Click a row to expand payments and log invoice details.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setResourceFilter(prev => prev === 'materials' ? null : 'materials')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    resourceFilter === 'materials'
                      ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                      : 'bg-white/5 text-on-surface-variant border-transparent hover:bg-white/10'
                  }`}
                >
                  Materials Only
                </button>
                <button
                  onClick={() => setResourceFilter(prev => prev === 'labor' ? null : 'labor')}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    resourceFilter === 'labor'
                      ? 'bg-primary/20 text-primary border-primary/30 font-semibold'
                      : 'bg-white/5 text-on-surface-variant border-transparent hover:bg-white/10'
                  }`}
                >
                  Labor Only
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-white/5">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant w-1/4">Category</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant w-1/5">Resource</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right w-1/6">Estimated</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right w-1/6">Actual</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right w-1/6">Variance</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-center w-1/12">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-sm">
                  {filteredBudgetLines.map(line => {
                    const actual = actualsByLine[line.id] ?? 0;
                    const varianceInfo = formatVariance(line.estimated, actual);
                    const statusInfo = getLineStatus(line.estimated, actual);
                    const isExpanded = expandedRowId === line.id;
                    const lineActuals = actualEntries.filter(e => e.budgetLineId === line.id);

                    return (
                      <React.Fragment key={line.id}>
                        <tr 
                          onClick={() => setExpandedRowId(isExpanded ? null : line.id)}
                          className="hover:bg-white/[0.04] transition-colors group cursor-pointer"
                        >
                          <td className="px-6 py-4 font-bold text-on-surface font-sans flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-on-surface-variant" />}
                            {line.category}
                          </td>
                          <td className="px-6 py-4 text-on-surface-variant italic font-sans text-xs">
                            {line.resourceDescription || line.resourceType}
                          </td>
                          <td className="px-6 py-4 text-right">
                            ${line.estimated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right">
                            ${actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-6 py-4 text-right font-semibold ${varianceInfo.color}`}>
                            {varianceInfo.text}
                          </td>
                          <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-sans ${statusInfo.bg}`}>
                              {statusInfo.text}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded details */}
                        {isExpanded && (
                          <tr className="bg-white/[0.02] border-t border-b border-white/5">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="border border-white/5 rounded-xl p-4 bg-black/20 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Logged Payments / Actual Costs</h4>
                                  <button
                                    onClick={() => {
                                      if(confirm(`Are you sure you want to delete the budget category "${line.category}"? This will delete all logged actual payments for it.`)) {
                                        removeBudgetLine(line.id);
                                      }
                                    }}
                                    className="text-on-surface-variant hover:text-error text-xs flex items-center gap-1 font-sans transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Delete Category
                                  </button>
                                </div>
                                {lineActuals.length > 0 ? (
                                  <div className="space-y-2 max-h-40 overflow-y-auto mb-4 border-b border-white/5 pb-4">
                                    {lineActuals.map(e => (
                                      <div key={e.id} className="flex items-center justify-between text-xs py-1.5 hover:bg-white/[0.02] px-2 rounded">
                                        <div className="flex items-center gap-4">
                                          <span className="text-on-surface-variant font-sans">{new Date(e.createdAt).toLocaleDateString()}</span>
                                          <span className="font-semibold text-on-surface font-sans">{e.vendor}</span>
                                          <span className="text-on-surface-variant font-sans">{e.description}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="font-mono text-on-surface font-bold">${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                          <button
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              deleteActualEntry(e.id);
                                            }}
                                            className="text-on-surface-variant hover:text-error transition-colors"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-on-surface-variant italic mb-4">No actual costs logged for this category.</p>
                                )}

                                <div className="border-t border-white/5 pt-4">
                                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 font-sans">Log New Payment</h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <input
                                      type="text"
                                      placeholder="Vendor / Contractor *"
                                      value={actualVendor}
                                      onChange={e => setActualVendor(e.target.value)}
                                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-on-surface focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Description (optional)"
                                      value={actualDesc}
                                      onChange={e => setActualDesc(e.target.value)}
                                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-sans text-on-surface focus:outline-none focus:border-primary transition-colors"
                                    />
                                    <div className="flex gap-2">
                                      <input
                                        type="number"
                                        placeholder="Amount *"
                                        value={actualAmt}
                                        onChange={e => setActualAmt(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary transition-colors flex-1"
                                      />
                                      <button
                                        onClick={() => addActualEntry(line.id)}
                                        disabled={!actualVendor || !actualAmt}
                                        className="bg-primary text-on-primary font-bold text-xs px-4 rounded-lg hover:brightness-110 disabled:opacity-40 transition-all flex items-center justify-center"
                                      >
                                        Log
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredBudgetLines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant text-sm font-sans italic">
                        No budget categories match the active filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-on-surface-variant text-xs italic font-sans">
                Active Category Count: {filteredBudgetLines.length} of {budgetLines.length}
              </span>
              <div className="flex gap-4">
                <span className="font-mono text-xs"><span className="text-on-surface-variant font-sans text-[10px] mr-1">SUBTOTAL EST:</span> ${categorySubtotalEst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="font-mono text-xs"><span className="text-on-surface-variant font-sans text-[10px] mr-1">SUBTOTAL ACT:</span> ${categorySubtotalAct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Draw Schedule & Vendor Oversight */}
          <div className="xl:col-span-3 space-y-6 w-full">
            
            {/* Draw Schedule */}
            <div className="glass-card p-6 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-on-surface flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Draw Schedule
                </h3>
                <button 
                  onClick={() => handleOpenModal('draw')}
                  className="text-on-surface-variant hover:text-on-surface transition-colors font-semibold text-xs flex items-center gap-1 font-sans"
                  title="Add new draw request"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-on-surface-variant mb-1 font-sans">
                  <span>Loan drawn: ${totalDrawn.toLocaleString()}</span>
                  <span>{drawPct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${drawPct}%` }} />
                </div>
              </div>

              <div className="relative space-y-8 pl-2">
                {/* Vertical Line */}
                <div className="absolute left-[13px] top-2 bottom-2 w-[1px] bg-white/10"></div>
                
                {drawEntries.length > 0 ? (
                  drawEntries.map((d, index) => {
                    const isApproved = d.status === 'Approved';
                    const isRejected = d.status === 'Rejected';
                    const isPending = d.status === 'Pending Inspector';

                    return (
                      <div key={d.id} className="relative pl-10 group/draw">
                        {/* Timeline Icon */}
                        <div className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 ${
                          isApproved ? 'bg-primary text-on-primary luminous-glow' :
                          isRejected ? 'bg-error text-on-error' :
                          'bg-surface-container border-2 border-primary'
                        }`}>
                          {isApproved && <Check className="w-4 h-4" />}
                          {isRejected && <X className="w-4 h-4" />}
                          {isPending && <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>}
                        </div>

                        {/* Timeline Content */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                              isApproved ? 'text-primary' : isRejected ? 'text-error' : 'text-on-surface-variant'
                            }`}>
                              Draw #{index + 1} - {d.status}
                            </p>
                            <button
                              onClick={() => removeDrawEntry(d.id)}
                              className="text-on-surface-variant hover:text-error opacity-0 group-hover/draw:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <h4 className="font-bold text-on-surface text-sm">{d.description}</h4>
                          <p className="text-xs text-on-surface-variant mt-1 font-mono">
                            Total: ${d.totalAmount.toLocaleString()} • Requested: {new Date(d.requestedAt).toLocaleDateString()}
                          </p>
                          
                          <div className="mt-2 flex flex-wrap gap-2 items-center">
                            <span className="text-[10px] text-on-surface-variant font-sans">Status:</span>
                            <select
                              value={d.status}
                              onChange={(e) => updateDrawStatus(d.id, e.target.value as DrawEntry['status'])}
                              className="bg-white/5 border border-white/10 rounded text-[10px] py-0.5 px-1 focus:outline-none focus:border-primary text-on-surface font-sans cursor-pointer"
                            >
                              <option value="Pending Inspector">Pending Inspector</option>
                              <option value="Approved">Approved</option>
                              <option value="Rejected">Rejected</option>
                            </select>
                          </div>

                          {isPending && (
                            <div className="mt-3 p-3 bg-white/5 rounded-lg border border-white/5">
                              <p className="text-[10px] text-on-surface-variant uppercase mb-1 font-sans">Verification Status</p>
                              <div className="flex items-center gap-2 font-sans">
                                <Verified className="w-3 h-3 text-primary animate-pulse" />
                                <span className="text-xs">Inspector on-site</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-on-surface-variant italic py-4 pl-8">No draw requests tracked.</p>
                )}
              </div>
            </div>

            {/* Vendor Oversight */}
            <div className="glass-card p-6 rounded-2xl overflow-hidden relative border border-white/5">
              <div className="absolute top-0 right-0 p-4">
                <HardHat className="w-10 h-10 text-primary/10" />
              </div>
              <h4 className="font-bold text-on-surface mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Vendor Oversight
              </h4>
              <p className="text-xs text-on-surface-variant mb-4">Payables and 1099 compliance tracking.</p>
              
              <div className="space-y-3 mt-4 relative z-10">
                {Object.keys(vendorTotals).length > 0 ? (
                  Object.entries(vendorTotals).map(([vendor, total]) => {
                    const w9 = w9Records.find(r => r.vendor === vendor);
                    const needsW9 = total >= 600 && !w9?.w9Received;
                    const initials = vendor.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <div key={vendor} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-on-surface">
                            {initials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-on-surface leading-tight">{vendor}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono">Total Paid: ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => toggleW9(vendor)}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border transition-colors ${
                            w9?.w9Received
                              ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                              : needsW9
                              ? 'bg-error/10 text-error border-error/20 hover:bg-error/20'
                              : 'bg-white/10 text-on-surface-variant border-white/10 hover:bg-white/20'
                          }`}
                          title="Click to toggle W-9 status"
                        >
                          {w9?.w9Received ? 'W-9 OK' : needsW9 ? 'W-9 REQ' : 'W-9 PND'}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-on-surface-variant italic py-4">No logged payments yet.</p>
                )}
              </div>
              <button 
                onClick={() => handleOpenModal('settings')}
                className="w-full mt-6 py-2 border border-white/10 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-white/5 transition-colors relative z-10 flex items-center justify-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" /> Tracker Settings
              </button>
            </div>
            
          </div>
        </div>
      </main>

      {/* ── New Entry Modal ───────────────────────────────────────── */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowNewEntryModal(false)}></div>
          <div className="glass-card max-w-lg w-full rounded-2xl border border-white/10 text-on-surface shadow-2xl overflow-hidden relative z-10">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-on-surface">Manage Rehab Tracker</h3>
                <p className="text-xs text-on-surface-variant">Log entries, add budget lines, or modify general settings.</p>
              </div>
              <button 
                onClick={() => setShowNewEntryModal(false)}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-white/5 bg-white/[0.02]">
              {[
                { id: 'cost', label: 'Log Cost' },
                { id: 'budget', label: 'Add Category' },
                { id: 'draw', label: 'Add Draw' },
                { id: 'settings', label: 'Settings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id as typeof modalTab)}
                  className={`flex-1 py-3 text-xs font-semibold border-b-2 transition-all ${
                    modalTab === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-white/[0.02]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {/* Tab 1: Log Cost */}
              {modalTab === 'cost' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Category *</label>
                    {budgetLines.length > 0 ? (
                      <select
                        value={mCostLineId}
                        onChange={e => setMCostLineId(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      >
                        {budgetLines.map(l => (
                          <option key={l.id} value={l.id} className="bg-surface-container-lowest text-on-surface">
                            {l.category} (Est: ${l.estimated.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-error italic">Please add a budget category first.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Vendor Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Lunar Electric"
                        value={mCostVendor}
                        onChange={e => setMCostVendor(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Amount ($) *</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={mCostAmt}
                        onChange={e => setMCostAmt(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Payment Date</label>
                      <input
                        type="date"
                        value={mCostDate}
                        onChange={e => setMCostDate(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Electrical wiring labor"
                        value={mCostDesc}
                        onChange={e => setMCostDesc(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowNewEntryModal(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!mCostLineId || !mCostVendor || !mCostAmt) return;
                        const entry: ActualEntry = {
                          id: `ae-${Date.now()}`,
                          budgetLineId: mCostLineId,
                          vendor: mCostVendor,
                          description: mCostDesc || `Logged cost for ${budgetLines.find(l => l.id === mCostLineId)?.category}`,
                          amount: parseFloat(mCostAmt) || 0,
                          createdAt: new Date(mCostDate).toISOString(),
                        };
                        const nextW9 = w9Records.find(r => r.vendor === mCostVendor)
                          ? w9Records
                          : [...w9Records, { vendor: mCostVendor, w9Received: false }];
                        
                        persist({
                          ...data,
                          actualEntries: [...actualEntries, entry],
                          w9Records: nextW9
                        });
                        setMCostVendor('');
                        setMCostAmt('');
                        setMCostDesc('');
                        setShowNewEntryModal(false);
                      }}
                      disabled={!mCostLineId || !mCostVendor || !mCostAmt}
                      className="bg-primary text-on-primary font-bold text-sm px-5 py-2 rounded-lg hover:brightness-110 disabled:opacity-40 transition-all luminous-glow"
                    >
                      Log Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Add Category */}
              {modalTab === 'budget' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Category Name *</label>
                      <select
                        value={mBudgetCat}
                        onChange={e => setMBudgetCat(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      >
                        {DEFAULT_CATEGORIES.map(c => (
                          <option key={c} value={c} className="bg-surface-container-lowest text-on-surface">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Estimated Budget *</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={mBudgetEst}
                        onChange={e => setMBudgetEst(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Resource Type</label>
                      <select
                        value={mBudgetType}
                        onChange={e => setMBudgetType(e.target.value as any)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      >
                        <option value="mixed" className="bg-surface-container-lowest text-on-surface">Mixed (Labor/Materials)</option>
                        <option value="labor" className="bg-surface-container-lowest text-on-surface">Labor Only</option>
                        <option value="materials" className="bg-surface-container-lowest text-on-surface">Materials Only</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Short Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Steel framing / labor"
                        value={mBudgetDesc}
                        onChange={e => setMBudgetDesc(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowNewEntryModal(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!mBudgetEst) return;
                        addBudgetLine(mBudgetCat, parseFloat(mBudgetEst) || 0, mBudgetType, mBudgetDesc);
                        setMBudgetEst('');
                        setMBudgetDesc('');
                        setShowNewEntryModal(false);
                      }}
                      disabled={!mBudgetEst}
                      className="bg-primary text-on-primary font-bold text-sm px-5 py-2 rounded-lg hover:brightness-110 disabled:opacity-40 transition-all luminous-glow"
                    >
                      Add Category
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: Add Draw */}
              {modalTab === 'draw' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2">Draw Description *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sheetrock & Insulations"
                      value={mDrawDesc}
                      onChange={e => setMDrawDesc(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Total Amount *</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={mDrawTotal}
                        onChange={e => setMDrawTotal(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Drawn Amt</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={mDrawDrawn}
                        onChange={e => setMDrawDrawn(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Pending Inspector</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={mDrawPending}
                        onChange={e => setMDrawPending(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowNewEntryModal(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!mDrawDesc || !mDrawTotal) return;
                        addDrawRequest(
                          mDrawDesc,
                          parseFloat(mDrawTotal) || 0,
                          parseFloat(mDrawDrawn) || 0,
                          parseFloat(mDrawPending) || 0
                        );
                        setMDrawDesc('');
                        setMDrawTotal('');
                        setMDrawDrawn('');
                        setMDrawPending('');
                        setShowNewEntryModal(false);
                      }}
                      disabled={!mDrawDesc || !mDrawTotal}
                      className="bg-primary text-on-primary font-bold text-sm px-5 py-2 rounded-lg hover:brightness-110 disabled:opacity-40 transition-all luminous-glow"
                    >
                      Add Draw Request
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 4: Settings */}
              {modalTab === 'settings' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2 font-sans">Contingency Buffer %</label>
                      <select
                        value={contingencyPct}
                        onChange={e => persist({ ...data, contingencyPct: parseFloat(e.target.value) })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
                      >
                        <option value="0.05" className="bg-surface-container-lowest text-on-surface">5% Contingency</option>
                        <option value="0.10" className="bg-surface-container-lowest text-on-surface">10% Contingency</option>
                        <option value="0.15" className="bg-surface-container-lowest text-on-surface">15% Contingency</option>
                        <option value="0.20" className="bg-surface-container-lowest text-on-surface">20% Contingency</option>
                        <option value="0.25" className="bg-surface-container-lowest text-on-surface">25% Contingency</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-2 font-sans">Total Loan Approved ($)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={totalLoanAmount || ''}
                        onChange={e => persist({ ...data, totalLoanAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-on-surface font-mono focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant bg-white/5 p-3 rounded-lg border border-white/5 font-sans leading-relaxed">
                    Contingency buffers and construction loan parameters are used to calculate loan utilization, draws, remaining contingency buffers, and overruns. Update them here to update calculations in real-time.
                  </p>

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowNewEntryModal(false)}
                      className="bg-primary text-on-primary font-bold text-sm px-5 py-2 rounded-lg hover:brightness-110 transition-all luminous-glow"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
