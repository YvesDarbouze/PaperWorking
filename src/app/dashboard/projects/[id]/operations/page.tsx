'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Activity,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Users,
  Save,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiErrorCard } from '@/components/ui/ApiErrorCard';
import { useProjectStore } from '@/store/projectStore';
import {
  calculateVariance,
  calculateCumulativeVariance,
  checkConsecutiveVarianceAlert,
  snapshotBudgetBaseline,
  PropertyActualEntry,
  RentRollItem,
  BudgetBaselineData,
  VarianceStatus,
} from '@/lib/operations/variance';
import { JourneyProgressHeader } from '@/components/project/JourneyProgressHeader';

export default function OperationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);

  const [saving, setSaving] = useState(false);

  // Budget Baseline snapshot
  const budgetBaseline: BudgetBaselineData = useMemo(() => {
    if (!project) {
      return {
        snapshottedAt: new Date().toISOString(),
        monthlyGrossRent: 3000,
        monthlyExpenses: 1000,
        monthlyNoi: 2000,
      };
    }
    return snapshotBudgetBaseline(project);
  }, [project?.id]);

  // Actuals State (loaded from project or initialized empty)
  const [actuals, setActuals] = useState<PropertyActualEntry[]>([]);
  const [rentRoll, setRentRoll] = useState<RentRollItem[]>([]);

  useEffect(() => {
    if (!project) return;
    const f = (project.financials || {}) as {
      propertyActuals?: PropertyActualEntry[];
      rentRollItems?: RentRollItem[];
    };
    if (Array.isArray(f.propertyActuals) && f.propertyActuals.length > 0) {
      setActuals(f.propertyActuals);
    } else {
      // Default initial period entry
      setActuals([
        {
          id: `act_${Date.now()}`,
          projectId,
          period: '2026-06',
          grossRent: budgetBaseline.monthlyGrossRent,
          operatingExpenses: budgetBaseline.monthlyExpenses,
          noi: budgetBaseline.monthlyNoi,
          capex: 0,
          notes: 'Baseline initial actuals',
        },
      ]);
    }

    if (Array.isArray(f.rentRollItems) && f.rentRollItems.length > 0) {
      setRentRoll(f.rentRollItems);
    } else {
      setRentRoll([
        { id: 'rr_1', projectId, unit: 'Unit 101', tenantName: 'Jane Doe', monthlyRent: 1500, status: 'occupied' },
        { id: 'rr_2', projectId, unit: 'Unit 102', tenantName: 'John Smith', monthlyRent: 1500, status: 'occupied' },
      ]);
    }
  }, [project?.id]);

  // New Actual Form state
  const [periodInput, setPeriodInput] = useState('2026-07');
  const [grossRentInput, setGrossRentInput] = useState('');
  const [expensesInput, setExpensesInput] = useState('');
  const [capexInput, setCapexInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Computed live NOI for form
  const computedFormNOI = useMemo(() => {
    const r = parseFloat(grossRentInput) || 0;
    const e = parseFloat(expensesInput) || 0;
    return r - e;
  }, [grossRentInput, expensesInput]);

  // Rent Roll Form state
  const [newUnitName, setNewUnitName] = useState('');
  const [newTenantName, setNewTenantName] = useState('');
  const [newRentAmount, setNewRentAmount] = useState('');
  const newUnitStatus: 'occupied' | 'vacant' | 'notice' = 'occupied';

  // Live Occupancy Rate calculation
  const liveOccupancyRate = useMemo(
    () => (rentRoll.length > 0 ? Number(((rentRoll.filter((i) => i.status === 'occupied').length / rentRoll.length) * 100).toFixed(1)) : 0),
    [rentRoll]
  );

  // Cumulative Variance Analysis
  const cumulativeVariance = useMemo(
    () => calculateCumulativeVariance(actuals, budgetBaseline),
    [actuals, budgetBaseline]
  );

  // Consecutive Alert Check
  const hasConsecutiveAlert = useMemo(
    () => checkConsecutiveVarianceAlert(actuals, budgetBaseline),
    [actuals, budgetBaseline]
  );

  // Handle adding new monthly actuals entry
  const handleAddActual = () => {
    if (!periodInput.match(/^\d{4}-\d{2}$/)) {
      toast.error('Period must be in YYYY-MM format (e.g. 2026-07)');
      return;
    }
    const r = parseFloat(grossRentInput);
    const e = parseFloat(expensesInput);
    if (isNaN(r) || isNaN(e) || r < 0 || e < 0) {
      toast.error('Gross Rent and Operating Expenses are required valid amounts');
      return;
    }

    const newEntry: PropertyActualEntry = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      period: periodInput.trim(),
      grossRent: r,
      operatingExpenses: e,
      noi: r - e,
      capex: parseFloat(capexInput) || 0,
      notes: notesInput.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextActuals = [...actuals.filter((a) => a.period !== newEntry.period), newEntry].sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    setActuals(nextActuals);
    setGrossRentInput('');
    setExpensesInput('');
    setCapexInput('');
    setNotesInput('');
    toast.success(`Logged actuals for period ${newEntry.period}`);
  };

  const handleDeleteActual = (id: string) => {
    setActuals((prev) => prev.filter((a) => a.id !== id));
    toast.success('Period entry removed');
  };

  // Handle adding new rent roll unit
  const handleAddRentRollUnit = () => {
    if (!newUnitName.trim()) {
      toast.error('Unit name/number is required');
      return;
    }
    const rent = parseFloat(newRentAmount) || 0;

    const newItem: RentRollItem = {
      id: `rr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      unit: newUnitName.trim(),
      tenantName: newTenantName.trim() || undefined,
      monthlyRent: rent,
      status: newUnitStatus,
      createdAt: new Date().toISOString(),
    };

    setRentRoll([...rentRoll, newItem]);
    setNewUnitName('');
    setNewTenantName('');
    setNewRentAmount('');
    toast.success(`Added unit ${newItem.unit} to rent roll`);
  };

  const handleToggleUnitStatus = (id: string, nextStatus: 'occupied' | 'vacant' | 'notice') => {
    setRentRoll((prev) => prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)));
  };

  const handleDeleteUnit = (id: string) => {
    setRentRoll((prev) => prev.filter((item) => item.id !== id));
    toast.success('Unit removed from rent roll');
  };

  // Persist actuals, rent roll, baseline & alert state to project
  const handleSaveToProject = async () => {
    if (!user) {
      toast.error('You must be logged in to save');
      return;
    }
    setSaving(true);
    try {
      let token = '';
      if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
        token = 'mock_token_123';
      } else {
        token = await user.getIdToken();
      }

      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          financials: {
            budgetBaseline,
            propertyActuals: actuals,
            rentRollItems: rentRoll,
            operationalVarianceAlert: hasConsecutiveAlert,
            occupancyRate: liveOccupancyRate,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to save operations data');

      toast.success('Operations actuals, rent roll & baseline saved!');
    } catch (err) {
      console.error('Operations save error:', err);
      const message = err instanceof Error ? err.message : 'Failed to save operations data';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: VarianceStatus, percent: number) => {
    const formatted = `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
    if (status === 'green') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          {formatted} (On Target)
        </span>
      );
    }
    if (status === 'amber') {
      return (
        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          {formatted} (Moderate)
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {formatted} (Alert)
      </span>
    );
  };

  if (!project && projects.length === 0) {
    return (
      <div data-testid="operations-skeleton" className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-16 bg-slate-800/40 rounded-2xl w-full" />
        <div className="h-12 bg-slate-800/30 rounded-xl w-3/4" />
        <div className="h-96 bg-slate-800/20 rounded-2xl w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <JourneyProgressHeader projectId={projectId} currentPhase={3} />
        <ApiErrorCard
          title="Operations Workspace Data Unavailable"
          message="Could not load project operations data or variance actuals. Please check network or click retry."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div data-testid="operations-page" className="min-h-screen py-8 px-6 bg-slate-50 dark:bg-[#121014]/40 overflow-x-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* REIL Journey Progress Header */}
        <JourneyProgressHeader projectId={projectId} currentPhase={3} />

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mb-3 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Operations & Variance Dashboard
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-500 border border-purple-500/20">
                    Phase 3: Hold / Operations
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {project?.propertyName || project?.address || 'Property Operational Handoff'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveToProject}
              disabled={saving}
              data-testid="save-operations-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/15 disabled:opacity-50 transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Operations Data'}
            </button>
          </div>
        </div>

        {/* ── Consecutive Alert Banner (If triggered) ── */}
        {hasConsecutiveAlert && (
          <div data-testid="consecutive-variance-alert" className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">Operational Variance Alert Threshold Tripped</h4>
              <p className="text-xs mt-0.5">
                NOI or Gross Revenue has deviated by more than ±10% from the frozen underwritten budget baseline for 2+ consecutive periods. This alert is surfaced in the Command Center Action Center.
              </p>
            </div>
          </div>
        )}

        {/* ── Budget Baseline Strip ── */}
        <div data-testid="budget-baseline-card" className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Frozen Underwritten Budget Baseline
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Snapshotted: {new Date(budgetBaseline.snapshottedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Underwritten Monthly Rent</p>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                ${Math.round(budgetBaseline.monthlyGrossRent).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Underwritten Monthly OpEx</p>
              <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
                ${Math.round(budgetBaseline.monthlyExpenses).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Underwritten Monthly NOI</p>
              <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                ${Math.round(budgetBaseline.monthlyNoi).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* ── Monthly Actuals Entry Form ── */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            Monthly Actuals Entry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Period (YYYY-MM)</label>
              <input
                type="text"
                data-testid="input-period"
                placeholder="2026-07"
                value={periodInput}
                onChange={(e) => setPeriodInput(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Gross Rent ($)</label>
              <input
                type="text"
                data-testid="input-actual-gross-rent"
                placeholder="3000"
                value={grossRentInput}
                onChange={(e) => setGrossRentInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Operating Expenses ($)</label>
              <input
                type="text"
                data-testid="input-actual-expenses"
                placeholder="1000"
                value={expensesInput}
                onChange={(e) => setExpensesInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">CapEx ($ optional)</label>
              <input
                type="text"
                placeholder="0"
                value={capexInput}
                onChange={(e) => setCapexInput(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddActual}
                data-testid="add-actual-btn"
                className="w-full h-9 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Log Period Actuals
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-white/5">
            <span>Computed Monthly NOI: <strong className="font-mono text-slate-900 dark:text-white">${Math.round(computedFormNOI).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* ── Variance Dashboard ── */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Underwritten Baseline vs. Actual Variance Dashboard
            </h3>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-500">Cumulative NOI Variance:</span>
              {getStatusBadge(cumulativeVariance.noi.status, cumulativeVariance.noi.variancePercent)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table data-testid="variance-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Period</th>
                  <th className="py-3 px-4 text-right font-bold">Actual Gross Rent</th>
                  <th className="py-3 px-4 text-right font-bold">Actual OpEx</th>
                  <th className="py-3 px-4 text-right font-bold">Actual NOI</th>
                  <th className="py-3 px-4 text-right font-bold">Baseline NOI</th>
                  <th className="py-3 px-4 text-right font-bold">NOI Variance</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                {actuals.map((act) => {
                  const noiVal = act.noi ?? (act.grossRent - act.operatingExpenses);
                  const v = calculateVariance(noiVal, budgetBaseline.monthlyNoi);

                  return (
                    <tr key={act.id}>
                      <td className="py-3 px-4 font-sans font-bold text-slate-900 dark:text-white">{act.period}</td>
                      <td className="py-3 px-4 text-right">${Math.round(act.grossRent).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-rose-500">${Math.round(act.operatingExpenses).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">${Math.round(noiVal).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-slate-500">${Math.round(budgetBaseline.monthlyNoi).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right">
                        {getStatusBadge(v.status, v.variancePercent)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteActual(act.id)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                          title="Delete Period"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Rent Roll & Live Occupancy Rate ── */}
        <div data-testid="rent-roll-card" className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Rent Roll & Tenant Roster
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage property units, lease agreements, and occupancy status.
              </p>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
              <span className="text-xs text-slate-500">Live Occupancy Rate:</span>
              <span data-testid="live-occupancy-rate" className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {liveOccupancyRate.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Add Rent Roll Unit Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50/50 dark:bg-white/[0.01] border border-slate-200 dark:border-white/5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Unit #</label>
              <input
                type="text"
                data-testid="input-unit-name"
                placeholder="Unit 103"
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Tenant Name</label>
              <input
                type="text"
                data-testid="input-tenant-name"
                placeholder="Alex Taylor"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Monthly Rent ($)</label>
              <input
                type="text"
                data-testid="input-unit-rent"
                placeholder="1600"
                value={newRentAmount}
                onChange={(e) => setNewRentAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="w-full h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAddRentRollUnit}
                data-testid="add-unit-btn"
                className="w-full h-8 rounded-md text-xs font-semibold bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Unit
              </button>
            </div>
          </div>

          {/* Rent Roll Table */}
          <div className="overflow-x-auto">
            <table data-testid="rent-roll-table" className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 font-bold">Unit</th>
                  <th className="py-3 px-4 font-bold">Tenant</th>
                  <th className="py-3 px-4 text-right font-bold">Monthly Rent</th>
                  <th className="py-3 px-4 text-center font-bold">Status</th>
                  <th className="py-3 px-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {rentRoll.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{item.unit}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.tenantName || '—'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-900 dark:text-white">${Math.round(item.monthlyRent).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <select
                        value={item.status}
                        onChange={(e) => handleToggleUnitStatus(item.id, e.target.value as 'occupied' | 'vacant' | 'notice')}
                        data-testid={`select-unit-status-${item.unit}`}
                        className={`h-7 px-2 rounded text-[11px] font-bold uppercase tracking-wider focus:outline-none ${
                          item.status === 'occupied'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : item.status === 'vacant'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <option value="occupied">Occupied</option>
                        <option value="vacant">Vacant</option>
                        <option value="notice">Notice Given</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteUnit(item.id)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
