'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Layers,
  Save,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ApiErrorCard } from '@/components/ui/ApiErrorCard';
import { useProjectStore } from '@/store/projectStore';
import {
  UnderwritingAssumptions,
  UnderwritingScenario,
  calculateProFormaAndMetrics,
  generateSensitivityMatrix,
  generateDefaultScenarios,
} from '@/lib/finance/metrics';
import { JourneyProgressHeader } from '@/components/project/JourneyProgressHeader';

type TabType = 'pro-forma' | 'sensitivity' | 'scenarios';

export default function UnderwritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  
  const projects = useProjectStore((s) => s.projects);
  const updateProjectFinancials = useProjectStore((s) => s.updateProjectFinancials);

  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId]);
  const financials = project?.financials || {};

  const [activeTab, setActiveTab] = useState<TabType>('pro-forma');
  const [isSaving, setIsSaving] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState('');
  const [showNewScenarioModal, setShowNewScenarioModal] = useState(false);

  // Initialize editable assumptions from project financials with sensible defaults
  const [assumptions, setAssumptions] = useState<UnderwritingAssumptions>({
    purchasePrice: 250000,
    rehabCost: 30000,
    monthlyGrossRent: 2500,
    monthlyExpenses: 800,
    rentGrowthRate: 3.0,
    expenseGrowthRate: 2.5,
    vacancyRate: 5.0,
    capexReservePct: 5.0,
    loanAmount: 200000,
    interestRate: 6.5,
    amortizationYears: 30,
    exitCapRate: 6.0,
    holdingPeriodYears: 5,
    units: 1,
  });

  // Sync assumptions from project financials on load
  useEffect(() => {
    if (!project) return;
    const f: any = project.financials || {};
    const price = f.purchasePrice || 250000;
    const rehab = f.projectedRehabCost ?? f.rehabBudget ?? 30000;
    const rent = f.monthlyGrossRent ?? f.grossRent ?? 2500;
    const expenses = f.monthlyExpenses ?? f.operatingExpenses ?? 800;
    const loan = f.loanAmount || (price * 0.8);
    const rate = f.loanInterestRate ?? f.interestRate ?? 6.5;
    const units = project.units ?? f.numberOfUnits ?? 1;

    setAssumptions((prev) => ({
      ...prev,
      purchasePrice: price > 0 ? price : prev.purchasePrice,
      rehabCost: rehab >= 0 ? rehab : prev.rehabCost,
      monthlyGrossRent: rent > 0 ? rent : prev.monthlyGrossRent,
      monthlyExpenses: expenses >= 0 ? expenses : prev.monthlyExpenses,
      rentGrowthRate: f.rentGrowthRate ?? prev.rentGrowthRate,
      expenseGrowthRate: f.expenseGrowthRate ?? prev.expenseGrowthRate,
      vacancyRate: f.vacancyRate ?? prev.vacancyRate,
      capexReservePct: f.capexReservePct ?? prev.capexReservePct,
      loanAmount: loan >= 0 ? loan : prev.loanAmount,
      interestRate: rate > 0 ? rate : prev.interestRate,
      exitCapRate: f.exitCapRate ?? prev.exitCapRate,
      units: units > 0 ? units : prev.units,
    }));
  }, [project?.id]);

  // Saved scenarios state (loaded from project or generated defaults)
  const [scenarios, setScenarios] = useState<UnderwritingScenario[]>([]);

  useEffect(() => {
    const proj: any = project;
    if (proj?.underwritingScenarios && proj.underwritingScenarios.length > 0) {
      setScenarios(proj.underwritingScenarios);
    } else {
      setScenarios(generateDefaultScenarios(assumptions));
    }
  }, [project?.id]);

  // Real-time calculation outputs
  const proForma = useMemo(() => calculateProFormaAndMetrics(assumptions), [assumptions]);
  const sensitivity = useMemo(() => generateSensitivityMatrix(assumptions), [assumptions]);

  // Handle assumption field change with sanitized decimal inputs
  const handleAssumptionChange = (field: keyof UnderwritingAssumptions, rawValue: string | number) => {
    let numVal = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue.toString().replace(/[^0-9.]/g, ''));
    if (isNaN(numVal)) numVal = 0;
    
    setAssumptions((prev) => {
      const next = { ...prev, [field]: numVal };
      // Also update Base scenario in local scenarios state
      setScenarios((scens) =>
        scens.map((s) => (s.isBase || s.id === 'base' ? { ...s, inputs: { ...next } } : s))
      );
      return next;
    });
  };

  // Persist assumptions & scenarios to project
  const handleSaveToProject = async () => {
    if (!user) {
      toast.error('You must be logged in to save');
      return;
    }
    setIsSaving(true);
    try {
      let token = '';
      if (typeof window !== 'undefined' && document.cookie.includes('__e2e_test')) {
        token = 'mock_token_123';
      } else {
        token = await user.getIdToken();
      }

      // Update financials via API
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          financials: {
            purchasePrice: assumptions.purchasePrice,
            projectedRehabCost: assumptions.rehabCost,
            monthlyGrossRent: assumptions.monthlyGrossRent,
            monthlyExpenses: assumptions.monthlyExpenses,
            loanAmount: assumptions.loanAmount,
            loanInterestRate: assumptions.interestRate,
            rentGrowthRate: assumptions.rentGrowthRate,
            expenseGrowthRate: assumptions.expenseGrowthRate,
            vacancyRate: assumptions.vacancyRate,
            capexReservePct: assumptions.capexReservePct,
            exitCapRate: assumptions.exitCapRate,
          },
          underwritingScenarios: scenarios,
        }),
      });

      if (!res.ok) throw new Error('Failed to persist underwriting assumptions');

      // Also update Zustand store
      updateProjectFinancials(projectId, {
        purchasePrice: assumptions.purchasePrice,
        monthlyGrossRent: assumptions.monthlyGrossRent,
        monthlyExpenses: assumptions.monthlyExpenses,
        loanAmount: assumptions.loanAmount,
        loanInterestRate: assumptions.interestRate,
      } as any);

      toast.success('Underwriting model & scenarios saved successfully!');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Failed to save underwriting model');
    } finally {
      setIsSaving(false);
    }
  };

  // Save current assumptions as new scenario
  const handleSaveScenario = () => {
    if (!newScenarioName.trim()) {
      toast.error('Scenario name is required');
      return;
    }
    const newScen: UnderwritingScenario = {
      id: `scen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: newScenarioName.trim(),
      inputs: { ...assumptions },
      createdAt: new Date().toISOString(),
    };
    const nextScenarios = [...scenarios, newScen];
    setScenarios(nextScenarios);
    setNewScenarioName('');
    setShowNewScenarioModal(false);
    toast.success(`Saved scenario "${newScen.name}"!`);
  };

  // Apply a scenario's assumptions to the current Base model
  const handleApplyScenario = (scen: UnderwritingScenario) => {
    setAssumptions({ ...scen.inputs });
    toast.success(`Applied "${scen.name}" assumptions to Base model`);
  };

  // Delete a custom scenario
  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    toast.success('Scenario deleted');
  };

  if (!project && projects.length === 0) {
    return (
      <div data-testid="underwriting-skeleton" className="max-w-7xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-16 bg-slate-800/40 rounded-2xl w-full" />
        <div className="h-12 bg-slate-800/30 rounded-xl w-3/4" />
        <div className="h-96 bg-slate-800/20 rounded-2xl w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <JourneyProgressHeader projectId={projectId} currentPhase={2} />
        <ApiErrorCard
          title="Underwriting Workspace Data Unavailable"
          message="Could not locate project financials or property records. Click retry to refresh workspace."
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div data-testid="underwriting-page" className="min-h-screen py-8 px-6 bg-slate-50 dark:bg-[#121014]/40 overflow-x-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* REIL Journey Progress Header */}
        <JourneyProgressHeader projectId={projectId} currentPhase={2} />
        
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
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Underwriting Workspace
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    Phase 2: Fund
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {project?.propertyName || project?.address || 'Project Underwriting Model'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveToProject}
              disabled={isSaving}
              data-testid="save-model-btn"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/15 disabled:opacity-50 transition-all shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Model & Scenarios'}
            </button>
          </div>
        </div>

        {/* ── Metric Summary Strip ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Year 1 NOI</p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              ${Math.round(proForma.years[0]?.noi ?? 0).toLocaleString()}
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Year 1 CoC</p>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {(proForma.years[0]?.coc ?? 0).toFixed(1)}%
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Year 1 DSCR</p>
            <p className="text-lg font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">
              {(proForma.years[0]?.dscr ?? 0).toFixed(2)}x
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">5-Yr Levered IRR</p>
            <p className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
              {proForma.leveredIRR.toFixed(1)}%
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Equity Multiple</p>
            <p className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {proForma.equityMultiple.toFixed(2)}x
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Net Exit Proceeds</p>
            <p className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              ${Math.round(proForma.netExitProceeds).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Main Assumptions Drawer ── */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Underwriting Assumptions & Growth Drivers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Adjust key operational drivers to project multi-year returns and calculate sensitivity.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Purchase Price */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Purchase Price ($)</label>
              <input
                type="text"
                data-testid="input-purchase-price"
                value={assumptions.purchasePrice}
                onChange={(e) => handleAssumptionChange('purchasePrice', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Monthly Gross Rent */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Monthly Gross Rent ($)</label>
              <input
                type="text"
                data-testid="input-gross-rent"
                value={assumptions.monthlyGrossRent}
                onChange={(e) => handleAssumptionChange('monthlyGrossRent', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Monthly Expenses */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Monthly OpEx ($)</label>
              <input
                type="text"
                data-testid="input-monthly-expenses"
                value={assumptions.monthlyExpenses}
                onChange={(e) => handleAssumptionChange('monthlyExpenses', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Rent Growth Rate */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Rent Growth (%/yr)</label>
              <input
                type="text"
                data-testid="input-rent-growth"
                value={assumptions.rentGrowthRate}
                onChange={(e) => handleAssumptionChange('rentGrowthRate', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Expense Growth Rate */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">OpEx Growth (%/yr)</label>
              <input
                type="text"
                data-testid="input-expense-growth"
                value={assumptions.expenseGrowthRate}
                onChange={(e) => handleAssumptionChange('expenseGrowthRate', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Vacancy Rate */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Vacancy Rate (%)</label>
              <input
                type="text"
                data-testid="input-vacancy-rate"
                value={assumptions.vacancyRate}
                onChange={(e) => handleAssumptionChange('vacancyRate', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* CapEx Reserve */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">CapEx Reserve (% of EGI)</label>
              <input
                type="text"
                data-testid="input-capex-reserve"
                value={assumptions.capexReservePct}
                onChange={(e) => handleAssumptionChange('capexReservePct', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* Exit Cap Rate */}
            <div>
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Exit Cap Rate (%)</label>
              <input
                type="text"
                data-testid="input-exit-cap"
                value={assumptions.exitCapRate}
                onChange={(e) => handleAssumptionChange('exitCapRate', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
          <button
            onClick={() => setActiveTab('pro-forma')}
            data-testid="tab-pro-forma"
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'pro-forma'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            5-Year Pro Forma
          </button>

          <button
            onClick={() => setActiveTab('sensitivity')}
            data-testid="tab-sensitivity"
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sensitivity'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Sensitivity Matrix
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            data-testid="tab-scenarios"
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'scenarios'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Scenarios Comparison ({scenarios.length})
          </button>
        </div>

        {/* ── TAB 1: Pro Forma ── */}
        {activeTab === 'pro-forma' && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  5-Year Cash Flow Projection
                </h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Initial Equity Invested: ${proForma.totalCashInvested.toLocaleString()}
                </span>
              </div>

              <table data-testid="pro-forma-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">Line Item</th>
                    {proForma.years.map((y) => (
                      <th key={y.year} className="py-3 px-4 text-right font-semibold">Year {y.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono text-slate-700 dark:text-slate-300">
                  <tr>
                    <td className="py-3 px-4 font-sans font-medium text-slate-900 dark:text-white">Gross Potential Rent</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right">${Math.round(y.grossPotentialRent).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-slate-500">Vacancy Loss ({assumptions.vacancyRate}%)</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right text-rose-500">-${Math.round(y.vacancyLoss).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="font-semibold bg-slate-50 dark:bg-white/[0.01]">
                    <td className="py-3 px-4 font-sans text-slate-900 dark:text-white">Effective Gross Income (EGI)</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right">${Math.round(y.effectiveGrossIncome).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-slate-500">Operating Expenses</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right text-rose-500">-${Math.round(y.operatingExpenses).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-slate-500">CapEx Reserve ({assumptions.capexReservePct}%)</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right text-rose-500">-${Math.round(y.capexReserve).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="font-bold text-slate-900 dark:text-white bg-slate-100/50 dark:bg-white/5">
                    <td className="py-3 px-4 font-sans">Net Operating Income (NOI)</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">${Math.round(y.noi).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-sans text-slate-500">Annual Debt Service</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right text-slate-500">-${Math.round(y.debtService).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="font-bold border-t-2 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <td className="py-3 px-4 font-sans">Net Cash Flow</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-3 px-4 text-right">${Math.round(y.netCashFlow).toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-slate-500 pt-2">
                    <td className="py-2.5 px-4 font-sans italic">Cap Rate</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-2.5 px-4 text-right font-medium">{y.capRate.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-slate-500">
                    <td className="py-2.5 px-4 font-sans italic">Cash-on-Cash (CoC)</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-2.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{y.coc.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="text-[11px] text-slate-500">
                    <td className="py-2.5 px-4 font-sans italic">DSCR</td>
                    {proForma.years.map((y) => (
                      <td key={y.year} className="py-2.5 px-4 text-right font-medium text-blue-600 dark:text-blue-400">{y.dscr.toFixed(2)}x</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: Sensitivity ── */}
        {activeTab === 'sensitivity' && (
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Levered IRR Sensitivity Matrix (Rent Growth × Exit Cap Rate)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Displays 5-Year Levered IRR across combinations of rent growth and exit cap rates.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table data-testid="sensitivity-table" className="w-full text-center text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="py-3 px-3 border-b border-slate-200 dark:border-white/10 text-left font-bold text-slate-500">
                      Rent Growth \ Exit Cap
                    </th>
                    {sensitivity.exitCapSteps.map((cap) => (
                      <th key={cap} className="py-3 px-3 border-b border-slate-200 dark:border-white/10 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {cap.toFixed(2)}%
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {sensitivity.matrix.map((row, rIdx) => (
                    <tr key={rIdx}>
                      <td className="py-3 px-3 text-left font-sans font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/10">
                        {sensitivity.rentGrowthSteps[rIdx].toFixed(1)}% / yr
                      </td>
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          data-testid={cell.isBaseCase ? 'base-case-cell' : undefined}
                          className={`py-3 px-3 font-semibold transition-all ${
                            cell.isBaseCase
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border-2 border-emerald-500 shadow-sm rounded-lg'
                              : cell.leveredIRR >= 15
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : cell.leveredIRR >= 10
                              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{cell.leveredIRR.toFixed(1)}%</span>
                            {cell.isBaseCase && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500 text-white mt-0.5">
                                Base Case
                              </span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: Scenarios ── */}
        {activeTab === 'scenarios' && (
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] backdrop-blur-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Scenario Comparison & Side-by-Side Analysis
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Compare metrics across multiple saved scenario profiles.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="New Scenario Name..."
                  value={newScenarioName}
                  onChange={(e) => setNewScenarioName(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <button
                  onClick={handleSaveScenario}
                  data-testid="save-scenario-btn"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Save Current Scenario
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table data-testid="scenarios-table" className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Metric / Assumption</th>
                    {scenarios.map((scen) => (
                      <th key={scen.id} className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                        {scen.name} {scen.isBase && '(Base)'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-mono">
                  {/* Assumptions */}
                  <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Rent Growth Rate</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-2.5 px-4 text-right">{s.inputs.rentGrowthRate.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">OpEx Growth Rate</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-2.5 px-4 text-right">{s.inputs.expenseGrowthRate.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Vacancy Rate</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-2.5 px-4 text-right">{s.inputs.vacancyRate.toFixed(1)}%</td>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/50 dark:bg-white/[0.01]">
                    <td className="py-2.5 px-4 font-sans font-medium text-slate-700 dark:text-slate-300">Exit Cap Rate</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-2.5 px-4 text-right">{s.inputs.exitCapRate.toFixed(1)}%</td>
                    ))}
                  </tr>

                  {/* Calculated Outputs */}
                  <tr className="border-t-2 border-slate-200 dark:border-white/10 font-bold text-slate-900 dark:text-white">
                    <td className="py-3 px-4 font-sans">Year 1 NOI</td>
                    {scenarios.map((s) => {
                      const res = calculateProFormaAndMetrics(s.inputs);
                      return <td key={s.id} className="py-3 px-4 text-right">${Math.round(res.years[0]?.noi ?? 0).toLocaleString()}</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">Year 1 Cash-on-Cash</td>
                    {scenarios.map((s) => {
                      const res = calculateProFormaAndMetrics(s.inputs);
                      return <td key={s.id} className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400">{(res.years[0]?.coc ?? 0).toFixed(1)}%</td>;
                    })}
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-sans text-slate-600 dark:text-slate-400">Year 1 DSCR</td>
                    {scenarios.map((s) => {
                      const res = calculateProFormaAndMetrics(s.inputs);
                      return <td key={s.id} className="py-2.5 px-4 text-right text-blue-600 dark:text-blue-400">{(res.years[0]?.dscr ?? 0).toFixed(2)}x</td>;
                    })}
                  </tr>
                  <tr className="font-bold text-slate-900 dark:text-white bg-indigo-50/50 dark:bg-indigo-500/10">
                    <td className="py-3 px-4 font-sans">5-Year Levered IRR</td>
                    {scenarios.map((s) => {
                      const res = calculateProFormaAndMetrics(s.inputs);
                      return <td key={s.id} className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-300 font-bold">{res.leveredIRR.toFixed(1)}%</td>;
                    })}
                  </tr>
                  <tr className="font-bold text-slate-900 dark:text-white">
                    <td className="py-3 px-4 font-sans">Equity Multiple</td>
                    {scenarios.map((s) => {
                      const res = calculateProFormaAndMetrics(s.inputs);
                      return <td key={s.id} className="py-3 px-4 text-right text-amber-600 dark:text-amber-400">{res.equityMultiple.toFixed(2)}x</td>;
                    })}
                  </tr>

                  {/* Actions */}
                  <tr>
                    <td className="py-3 px-4 font-sans text-slate-400">Actions</td>
                    {scenarios.map((s) => (
                      <td key={s.id} className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!s.isBase && (
                            <button
                              onClick={() => handleApplyScenario(s)}
                              data-testid="apply-scenario-btn"
                              className="px-2.5 py-1 text-[10px] font-bold uppercase rounded bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-colors"
                            >
                              Apply to Base
                            </button>
                          )}
                          {!s.isBase && s.id !== 'base' && s.id !== 'upside' && s.id !== 'downside' && (
                            <button
                              onClick={() => handleDeleteScenario(s.id)}
                              className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Delete Scenario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
