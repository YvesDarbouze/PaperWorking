'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWorkspaceProject } from '../layout';
import { useProjectStore } from '@/store/projectStore';
import { usePermissions } from '@/hooks/usePermissions';
import { deriveAllMetrics } from '@/lib/metrics';
import {
  ListChecks,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  Shield,
  Save,
  ArrowLeft,
  Briefcase,
  AlertTriangle,
  Layers,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

import type {
  IncomeLedgerEntry,
  ExpenseLedgerEntry,
  TenantRegistryEntry,
  ListingShowingsEntry,
  ReValuationEntry,
  ComplianceChecklistItem,
  SaleRecord
} from '@/types/schema';

type TabId = 'income' | 'expense' | 'tenants' | 'listings' | 'valuations' | 'compliance' | 'sale';

export default function ProjectInstrumentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const { project, loading, refresh } = useWorkspaceProject();
  const updateProjectFinancials = useProjectStore((state: any) => state.updateProjectFinancials);
  const { isLead, isFinanceTeam, isLender, isContractor, role } = usePermissions();

  const [activeTab, setActiveTab] = useState<TabId>('income');

  // Sync activeTab from URL search query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      if (tabParam) {
        let normalizedTab: TabId = 'income';
        if (tabParam === 'tenant' || tabParam === 'tenants') normalizedTab = 'tenants';
        else if (tabParam === 'expense' || tabParam === 'expenses') normalizedTab = 'expense';
        else if (tabParam === 'income') normalizedTab = 'income';
        else if (tabParam === 'listing' || tabParam === 'listings') normalizedTab = 'listings';
        else if (tabParam === 'valuation' || tabParam === 'valuations') normalizedTab = 'valuations';
        else if (tabParam === 'compliance') normalizedTab = 'compliance';
        else if (tabParam === 'sale') normalizedTab = 'sale';
        setActiveTab(normalizedTab);
      }
    }
  }, []);

  // Local state for forms and additions (unsaved local changes before committing)
  const [localFinancials, setLocalFinancials] = useState<any>(null);

  // Sync from DB project financials on load
  useEffect(() => {
    if (project?.financials) {
      setLocalFinancials(JSON.parse(JSON.stringify(project.financials)));
    }
  }, [project]);

  // Canonical account model mapping (Lead Investor, Investment Team, Vendor)
  const canonicalRoleMap: Record<string, 'Lead Investor' | 'Investment Team' | 'Vendor'> = {
    'Lead Investor': 'Lead Investor',
    'Admin': 'Lead Investor',
    'Platform Admin': 'Lead Investor',
    'Accountant': 'Investment Team',
    'Analyst': 'Investment Team',
    'Observer': 'Investment Team',
    'Standard': 'Investment Team',
    'Lender': 'Investment Team',
    'Partner': 'Investment Team', // Partners hold equity but map to Investment Team for permissions
    'General Contractor': 'Vendor',
    'Vendor': 'Vendor',
    'Real Estate Agent': 'Vendor',
    'Guest': 'Vendor'
  };

  const canonicalCategory = canonicalRoleMap[role] || 'Vendor';
  const hasAccess = canonicalCategory === 'Lead Investor' || canonicalCategory === 'Investment Team';
  const isReadOnly = isLender || role === 'Observer' || role === 'Analyst';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#454955]"></div>
      </div>
    );
  }

  if (!project || !localFinancials) {
    return (
      <div className="p-8 text-center text-text-secondary">
        Project not found or failed to load.
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 flex flex-col items-center gap-4 backdrop-blur-xl">
          <Shield className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-text-primary">Access Denied</h2>
          <p className="text-sm text-text-secondary">
            Your account category ({canonicalCategory}) does not have permission to view or modify Project Ingestion Instruments. This panel is restricted to the Investment Team and Lead Investors.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-text-primary text-bg-canvas rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  // derive local metrics dynamically
  const localMetrics = deriveAllMetrics(
    localFinancials,
    localFinancials.estimatedCurrentValue ?? localFinancials.estimatedARV ?? localFinancials.purchasePrice,
    project.dispositionType,
    project.currentPhase
  );

  const saveLedgerChanges = async (updatedFinancials: any) => {
    setLocalFinancials(updatedFinancials);
    try {
      await updateProjectFinancials(project.id, updatedFinancials);
      toast.success('Ledger successfully updated and synced');
      refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync changes');
    }
  };

  // Helper additions & deletions
  const addIncomeEntry = (entry: Omit<IncomeLedgerEntry, 'id'>) => {
    const updated = {
      ...localFinancials,
      incomeLedger: [
        ...(localFinancials.incomeLedger || []),
        { ...entry, id: `inc_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteIncomeEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      incomeLedger: (localFinancials.incomeLedger || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const addExpenseEntry = (entry: Omit<ExpenseLedgerEntry, 'id'>) => {
    const updated = {
      ...localFinancials,
      expenseLedger: [
        ...(localFinancials.expenseLedger || []),
        { ...entry, id: `exp_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteExpenseEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      expenseLedger: (localFinancials.expenseLedger || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const addTenantEntry = (entry: Omit<TenantRegistryEntry, 'id'>) => {
    const updated = {
      ...localFinancials,
      tenantRegistry: [
        ...(localFinancials.tenantRegistry || []),
        { ...entry, id: `ten_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteTenantEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      tenantRegistry: (localFinancials.tenantRegistry || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const addListingEntry = (entry: Omit<ListingShowingsEntry, 'id'>) => {
    const updated = {
      ...localFinancials,
      listingsLog: [
        ...(localFinancials.listingsLog || []),
        { ...entry, id: `lst_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteListingEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      listingsLog: (localFinancials.listingsLog || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const addValuationEntry = (entry: Omit<ReValuationEntry, 'id'>) => {
    const updated = {
      ...localFinancials,
      reValuations: [
        ...(localFinancials.reValuations || []),
        { ...entry, id: `val_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteValuationEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      reValuations: (localFinancials.reValuations || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const addComplianceEntry = (entry: Omit<ComplianceChecklistItem, 'id'>) => {
    const updated = {
      ...localFinancials,
      complianceChecklist: [
        ...(localFinancials.complianceChecklist || []),
        { ...entry, id: `comp_${Date.now()}` }
      ]
    };
    saveLedgerChanges(updated);
  };

  const deleteComplianceEntry = (id: string) => {
    const updated = {
      ...localFinancials,
      complianceChecklist: (localFinancials.complianceChecklist || []).filter((e: any) => e.id !== id)
    };
    saveLedgerChanges(updated);
  };

  const updateSaleRecord = (record: SaleRecord) => {
    const updated = {
      ...localFinancials,
      saleRecord: record
    };
    saveLedgerChanges(updated);
  };

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'income', label: 'Income Ledger', count: (localFinancials.incomeLedger || []).length },
    { id: 'expense', label: 'Expense Ledger', count: (localFinancials.expenseLedger || []).length },
    { id: 'tenants', label: 'Tenant Registry', count: (localFinancials.tenantRegistry || []).length },
    { id: 'listings', label: 'Listings & Showings', count: (localFinancials.listingsLog || []).length },
    { id: 'valuations', label: 'Appraisals / AVMs', count: (localFinancials.reValuations || []).length },
    { id: 'compliance', label: 'Compliance Checklist', count: (localFinancials.complianceChecklist || []).length },
    { id: 'sale', label: 'Sale Settlement', count: localFinancials.saleRecord?.salePrice ? 1 : 0 },
  ];

  return (
    <div className="px-margin-mobile lg:px-margin-desktop py-6 flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-ui hover:bg-black/5 dark:hover:bg-white/5"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-text-primary tracking-tight">Project Ingestion Instruments</h1>
            <p className="text-xs text-text-secondary">Input actual operation and sale settlements to reconcile pro-forma assumptions.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-text-secondary border border-border-ui px-2 py-1 rounded bg-black/5 dark:bg-white/5">
            Role: {role} ({canonicalCategory})
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Forms / Tables Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 border-b border-border-ui no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap ${
                  activeTab === t.id
                    ? 'bg-[#454955] text-white'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {t.label} <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-black/10 dark:bg-white/10">{t.count}</span>
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className="bg-bg-surface border border-border-ui rounded-xl p-6 backdrop-blur-md">
            {activeTab === 'income' && (
              <IncomeLedgerTab
                entries={localFinancials.incomeLedger || []}
                onAdd={addIncomeEntry}
                onDelete={deleteIncomeEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'expense' && (
              <ExpenseLedgerTab
                entries={localFinancials.expenseLedger || []}
                onAdd={addExpenseEntry}
                onDelete={deleteExpenseEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'tenants' && (
              <TenantRegistryTab
                entries={localFinancials.tenantRegistry || []}
                onAdd={addTenantEntry}
                onDelete={deleteTenantEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'listings' && (
              <ListingsTab
                entries={localFinancials.listingsLog || []}
                onAdd={addListingEntry}
                onDelete={deleteListingEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'valuations' && (
              <ValuationsTab
                entries={localFinancials.reValuations || []}
                onAdd={addValuationEntry}
                onDelete={deleteValuationEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'compliance' && (
              <ComplianceTab
                entries={localFinancials.complianceChecklist || []}
                onAdd={addComplianceEntry}
                onDelete={deleteComplianceEntry}
                readOnly={isReadOnly}
              />
            )}
            {activeTab === 'sale' && (
              <SaleRecordTab
                record={localFinancials.saleRecord || {}}
                onSave={updateSaleRecord}
                readOnly={isReadOnly}
              />
            )}
          </div>
        </div>

        {/* Right Sidebar - Pro-Forma vs. Actual Real-Time Reconciler */}
        <div className="lg:col-span-4 bg-bg-surface border border-border-ui rounded-xl p-6 flex flex-col gap-6 backdrop-blur-md sticky top-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-pw-success" />
              Reconciliation Summary
            </h2>
            <p className="text-[11px] text-text-secondary">Comparing projected underwriting assumptions against actual instrument data.</p>
          </div>

          <div className="flex flex-col gap-4">
            {/* NOI Card */}
            <MetricCompareRow
              label="Net Operating Income"
              projected={localMetrics.noi}
              actual={localMetrics.kpi33.NOI.actual}
              reason={localMetrics.kpi33.NOI.actualNullReason}
              format="currency"
            />
            {/* Cap Rate Card */}
            <MetricCompareRow
              label="Capitalization Rate"
              projected={localMetrics.capRate}
              actual={localMetrics.kpi33.CAP_RATE.actual}
              reason={localMetrics.kpi33.CAP_RATE.actualNullReason}
              format="percent"
            />
            {/* Cash Flow */}
            <MetricCompareRow
              label="Annual Cash Flow"
              projected={localMetrics.annualCashFlow}
              actual={localMetrics.kpi33.CASH_FLOW.actual}
              reason={localMetrics.kpi33.CASH_FLOW.actualNullReason}
              format="currency"
            />
            {/* DSCR */}
            <MetricCompareRow
              label="Debt Service Coverage (DSCR)"
              projected={localMetrics.dscr}
              actual={localMetrics.kpi33.DSCR.actual}
              reason={localMetrics.kpi33.DSCR.actualNullReason}
              format="ratio"
            />
            {/* CoC */}
            <MetricCompareRow
              label="Cash-on-Cash Return"
              projected={localMetrics.cashOnCashReturn}
              actual={localMetrics.kpi33.COC.actual}
              reason={localMetrics.kpi33.COC.actualNullReason}
              format="percent"
            />
            {/* Compliance */}
            <MetricCompareRow
              label="Compliance Rate"
              projected={null}
              actual={localMetrics.kpi33.COMPLIANCE_RATE.actual}
              reason={localMetrics.kpi33.COMPLIANCE_RATE.actualNullReason}
              format="percent"
            />
            {/* Risk Score */}
            <MetricCompareRow
              label="Combined Risk Score"
              projected={localMetrics.kpi33.RISK_SCORE.projected}
              actual={localMetrics.kpi33.RISK_SCORE.actual}
              format="ratio"
            />
          </div>

          <div className="border-t border-border-ui pt-4 text-[10px] text-text-secondary flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Actuals are updated instantly. Scorecard pro-forma assumptions are protected and will never be overwritten by actual ingestion data.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function MetricCompareRow({
  label,
  projected,
  actual,
  reason,
  format
}: {
  label: string;
  projected: number | null;
  actual: number | null;
  reason?: string;
  format: 'currency' | 'percent' | 'ratio';
}) {
  const formatVal = (val: number | null) => {
    if (val === null) return '—';
    if (format === 'currency') return `$${Math.round(val).toLocaleString()}`;
    if (format === 'percent') return `${val.toFixed(2)}%`;
    return val.toFixed(2);
  };

  const getReasonLabel = (code?: string) => {
    if (!code) return 'No data';
    return code.replace('REQUIRES_', 'Needs ').replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col gap-1 border-b border-border-ui pb-3 last:border-b-0 last:pb-0">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-bold text-text-secondary">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="bg-black/5 dark:bg-white/5 rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#F59E0B]">Pro-Forma</span>
          <span className="text-sm font-mono font-bold text-text-primary">{formatVal(projected)}</span>
        </div>
        <div className="bg-black/5 dark:bg-white/5 rounded-lg p-2 flex flex-col">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#3B82F6]">Actual (Preview)</span>
          {actual !== null ? (
            <span className="text-sm font-mono font-bold text-text-primary">{formatVal(actual)}</span>
          ) : (
            <span className="text-[10px] font-semibold text-text-secondary leading-normal">{getReasonLabel(reason)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tabs Implementations ───

function IncomeLedgerTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: IncomeLedgerEntry[];
  onAdd: (entry: Omit<IncomeLedgerEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'rent' | 'other'>('rent');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    onAdd({
      date,
      amount: Number(amount),
      type,
      tenantName: notes.trim() || undefined
    });
    setAmount('');
    setNotes('');
    toast.success('Income entry added');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Income Registry</h3>
        <p className="text-xs text-text-secondary">Log rental income and other operations income (e.g. parking, laundry).</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the project income registry.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Amount ($)</label>
            <input
              type="number"
              required
              placeholder="e.g. 1950"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            >
              <option value="rent">Rent Payment</option>
              <option value="other">Other Operations Income</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Notes</label>
              <input
                type="text"
                placeholder="Tenant name or check #"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No income ledger entries recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Notes</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-mono">{e.date}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                      e.type === 'rent' ? 'bg-pw-success-container text-pw-success' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">${e.amount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-text-secondary">{e.tenantName || '—'}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ExpenseLedgerTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: ExpenseLedgerEntry[];
  onAdd: (entry: Omit<ExpenseLedgerEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseLedgerEntry['category']>('maintenance');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    onAdd({
      date,
      amount: Number(amount),
      category,
      description: notes.trim() || undefined
    });
    setAmount('');
    setNotes('');
    toast.success('Expense entry added');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Expense Registry</h3>
        <p className="text-xs text-text-secondary">Log operational costs and capex capital repairs.</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the project expense registry.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Amount ($)</label>
            <input
              type="number"
              required
              placeholder="e.g. 350"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            >
              <option value="tax">Property Tax</option>
              <option value="insurance">Insurance</option>
              <option value="security">Security</option>
              <option value="maintenance">Maintenance</option>
              <option value="utilities">Utilities</option>
              <option value="management">Management Fee</option>
              <option value="HOA">HOA Fee</option>
              <option value="capex">CapEx / Rehab Repair</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Notes</label>
              <input
                type="text"
                placeholder="Vendor name or description"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No expense ledger entries recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Amount</th>
                <th className="py-2.5 px-3">Notes</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-mono">{e.date}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                      e.category === 'capex' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                    }`}>
                      {e.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">${e.amount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-text-secondary">{e.description || '—'}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TenantRegistryTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: TenantRegistryEntry[];
  onAdd: (entry: Omit<TenantRegistryEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState('');
  const [rent, setRent] = useState('');
  const [leaseStart, setLeaseStart] = useState('');
  const [leaseEnd, setLeaseEnd] = useState('');
  const [status, setStatus] = useState<TenantRegistryEntry['status']>('active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a tenant name');
      return;
    }
    if (!rent || isNaN(Number(rent))) {
      toast.error('Please enter a valid rent amount');
      return;
    }
    onAdd({
      unitId: name.trim(),
      rentAmount: Number(rent),
      leaseStart: leaseStart || new Date().toISOString().substring(0, 10),
      leaseEnd: leaseEnd || new Date(Date.now() + 365*24*60*60*1000).toISOString().substring(0, 10),
      moveInDate: leaseStart || new Date().toISOString().substring(0, 10),
      status
    });
    setName('');
    setRent('');
    setLeaseStart('');
    setLeaseEnd('');
    toast.success('Tenant record registered');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Tenant Registry</h3>
        <p className="text-xs text-text-secondary">Track occupant statuses, active rent, and lease terms.</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the tenant registry.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Tenant Name / Unit</label>
            <input
              type="text"
              required
              placeholder="John Doe / Unit A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Rent Amount ($/mo)</label>
            <input
              type="number"
              required
              placeholder="e.g. 1950"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Lease Start</label>
            <input
              type="date"
              value={leaseStart}
              onChange={(e) => setLeaseStart(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Lease End</label>
            <input
              type="date"
              value={leaseEnd}
              onChange={(e) => setLeaseEnd(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
              >
                <option value="active">Active</option>
                <option value="vacated">Vacated</option>
                <option value="renewed">Renewed</option>
              </select>
            </div>
            <button
              type="submit"
              className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No tenant records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Tenant / Unit</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Rent</th>
                <th className="py-2.5 px-3">Lease Start</th>
                <th className="py-2.5 px-3">Lease End</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-semibold">{e.unitId}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                      e.status === 'active' ? 'bg-pw-success-container text-pw-success' :
                      e.status === 'renewed' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">${e.rentAmount.toLocaleString()}/mo</td>
                  <td className="py-3 px-3 font-mono text-text-secondary">{e.leaseStart}</td>
                  <td className="py-3 px-3 font-mono text-text-secondary">{e.leaseEnd}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ListingsTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: ListingShowingsEntry[];
  onAdd: (entry: Omit<ListingShowingsEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [type, setType] = useState<'listing' | 'showing'>('listing');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      date,
      type,
      notes: notes.trim() || undefined
    });
    setNotes('');
    toast.success('Log entry added');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Listings & Showings Log</h3>
        <p className="text-xs text-text-secondary">Record property listing dates and subsequent showings to track Days on Market (DOM).</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the listings log.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            >
              <option value="listing">Listing Event</option>
              <option value="showing">Showing Visit</option>
            </select>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Notes</label>
              <input
                type="text"
                placeholder="e.g. MLS active at $295k"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
              />
            </div>
            <button
              type="submit"
              className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No logs registered yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Description</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-mono">{e.date}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                      e.type === 'listing' ? 'bg-amber-500/10 text-amber-500' : 'bg-[#454955]/10 text-[#454955]'
                    }`}>
                      {e.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-text-secondary">{e.notes || '—'}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ValuationsTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: ReValuationEntry[];
  onAdd: (entry: Omit<ReValuationEntry, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [value, setValue] = useState('');
  const [source, setSource] = useState('appraisal');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || isNaN(Number(value))) {
      toast.error('Please enter a valid value');
      return;
    }
    onAdd({
      date,
      value: Number(value),
      source
    });
    setValue('');
    toast.success('Valuation record logged');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Property Re-Valuations</h3>
        <p className="text-xs text-text-secondary">Log appraisals and AVM estimates over time to track asset equity gains.</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying re-valuations.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Assessed Value ($)</label>
            <input
              type="number"
              required
              placeholder="e.g. 290000"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            >
              <option value="appraisal">Professional Appraisal</option>
              <option value="AVM (RentCast)">RentCast AVM</option>
              <option value="AVM (Tax Assessment)">Tax Assessment</option>
              <option value="broker_bpo">Broker Price Opinion</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Record
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No valuation records found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">Assessed Value</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-mono">{e.date}</td>
                  <td className="py-3 px-3 text-text-secondary uppercase text-[10px] font-semibold">{e.source}</td>
                  <td className="py-3 px-3 font-mono font-bold">${e.value.toLocaleString()}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComplianceTab({
  entries,
  onAdd,
  onDelete,
  readOnly = false
}: {
  entries: ComplianceChecklistItem[];
  onAdd: (entry: Omit<ComplianceChecklistItem, 'id'>) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<ComplianceChecklistItem['status']>('compliant');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter an item name');
      return;
    }
    onAdd({
      title: name.trim(),
      status,
      updatedAt: new Date().toISOString().substring(0, 10)
    });
    setName('');
    toast.success('Compliance requirement logged');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Compliance Checklist</h3>
        <p className="text-xs text-text-secondary">Keep record of regulatory checks (e.g. Lead inspection, safety certificate).</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the compliance checklist.</span>
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-border-ui">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Compliance Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Lead Paint Certification"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-bg-canvas text-xs border border-border-ui p-2 rounded-lg"
            >
              <option value="compliant">Compliant</option>
              <option value="failed">Failed / Non-Compliant</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <button
            type="submit"
            className="h-[38px] px-4 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center justify-center shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Requirement
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-8 text-xs text-text-secondary">No compliance checks recorded.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border-ui text-text-secondary font-bold uppercase text-[9px] tracking-wider">
                <th className="py-2.5 px-3">Requirement</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Updated</th>
                {!readOnly && <th className="py-2.5 px-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-ui/50 last:border-b-0 hover:bg-black/5 dark:hover:bg-white/5">
                  <td className="py-3 px-3 font-semibold">{e.title}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                      e.status === 'compliant' ? 'bg-pw-success-container text-pw-success' :
                      e.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-text-secondary font-mono">{e.updatedAt}</td>
                  {!readOnly && (
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SaleRecordTab({
  record,
  onSave,
  readOnly = false
}: {
  record: SaleRecord;
  onSave: (record: SaleRecord) => void;
  readOnly?: boolean;
}) {
  const [saleDate, setSaleDate] = useState(record.saleDate || new Date().toISOString().substring(0, 10));
  const [salePrice, setSalePrice] = useState(record.salePrice ? String(record.salePrice) : '');
  const [closingCosts, setClosingCosts] = useState(record.closingCosts ? String(record.closingCosts) : '');
  const [commissionPercent, setCommissionPercent] = useState(record.commissionPercent ? String(record.commissionPercent) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salePrice || isNaN(Number(salePrice))) {
      toast.error('Please enter a valid sale price');
      return;
    }
    onSave({
      saleDate,
      salePrice: Number(salePrice),
      closingCosts: closingCosts ? Number(closingCosts) : undefined,
      commissionPercent: commissionPercent ? Number(commissionPercent) : undefined
    });
    toast.success('Sale record settlement saved');
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-text-primary">Sale Settlement Record</h3>
        <p className="text-xs text-text-secondary">Log final transaction details on disposition to calculate actual ROI and hold returns.</p>
      </div>

      {readOnly && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-center gap-2">
          <Shield className="w-4 h-4" />
          <span>Read-Only Access: Your role does not allow modifying the sale record.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/5 dark:bg-white/5 p-6 rounded-xl border border-border-ui">
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Sale Close Date</label>
          <input
            type="date"
            required
            disabled={readOnly}
            value={saleDate}
            onChange={(e) => setSaleDate(e.target.value)}
            className="w-full bg-bg-canvas text-xs border border-border-ui p-2.5 rounded-lg disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Actual Sale Price ($)</label>
          <input
            type="number"
            required
            disabled={readOnly}
            placeholder="e.g. 345000"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="w-full bg-bg-canvas text-xs border border-border-ui p-2.5 rounded-lg font-mono font-bold disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Seller-Paid Closing Costs ($)</label>
          <input
            type="number"
            disabled={readOnly}
            placeholder="e.g. 8000"
            value={closingCosts}
            onChange={(e) => setClosingCosts(e.target.value)}
            className="w-full bg-bg-canvas text-xs border border-border-ui p-2.5 rounded-lg font-mono disabled:opacity-60"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-secondary mb-1.5">Total Agent Commission (%)</label>
          <input
            type="number"
            step="0.1"
            disabled={readOnly}
            placeholder="e.g. 5.0"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(e.target.value)}
            className="w-full bg-bg-canvas text-xs border border-border-ui p-2.5 rounded-lg font-mono disabled:opacity-60"
          />
        </div>
        {!readOnly && (
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#454955] hover:bg-[#454955]/80 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
            >
              <Save className="w-4 h-4" /> Save Settlement Record
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
