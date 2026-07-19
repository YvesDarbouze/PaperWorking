'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectFinancials, OpexEntry } from '@/types/schema';
import { 
  DollarSign, 
  Calendar, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  FileText, 
  ArrowUpRight, 
  Shield, 
  Wrench, 
  Zap, 
  Building, 
  Home, 
  TrendingUp, 
  Calculator,
  Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';
import posthog from 'posthog-js';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface OperatingActualsCardProps {
  project: Project;
  refresh: () => void;
  isLocked?: boolean;
}

export type OpexCategory = 
  | 'tax' 
  | 'insurance' 
  | 'security' 
  | 'maintenance' 
  | 'utilities' 
  | 'management' 
  | 'hoa' 
  | 'capex';

interface PlaidOpexProposal {
  id: string;
  category: OpexCategory;
  description: string;
  amount: number;
  date: string;
  source: 'plaid';
}

const CATEGORY_META: Record<OpexCategory, { label: string; icon: React.ComponentType<any>; color: string; desc: string }> = {
  tax: { label: 'Property Tax', icon: FileText, color: 'text-rose-500', desc: 'County and municipal tax assessments' },
  insurance: { label: 'Insurance', icon: Shield, color: 'text-blue-500', desc: 'Hazard, liability, and binder premiums' },
  security: { label: 'Security', icon: Shield, color: 'text-indigo-500', desc: 'Monitoring systems, gates, guard services' },
  maintenance: { label: 'Maintenance & Repairs', icon: Wrench, color: 'text-amber-500', desc: 'Routine upkeep, turnovers, repairs' },
  utilities: { label: 'Utilities', icon: Zap, color: 'text-yellow-500', desc: 'Water, sewer, trash, power, common areas' },
  management: { label: 'Property Management', icon: Building, color: 'text-emerald-500', desc: 'PM fee on Gross Scheduled Rent basis (BUG-8)' },
  hoa: { label: 'HOA Fees', icon: Home, color: 'text-purple-500', desc: 'Homeowners association assessments' },
  capex: { label: 'Capital Expenditures', icon: TrendingUp, color: 'text-teal-500', desc: 'Capitalized improvements (not standard OpEx)' },
};

export default function OperatingActualsCard({ project, refresh, isLocked }: OperatingActualsCardProps) {
  const financials = project.financials || {};
  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // Active Category State
  const [activeCategory, setActiveCategory] = useState<OpexCategory>('tax');
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);

  // Manual payment form states
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualNotes, setManualNotes] = useState('');

  // Plaid proposals state
  const [proposals, setProposals] = useState<PlaidOpexProposal[]>([]);

  // Generate Plaid proposals dynamically based on assumptions (including BUG-8 PM Gross scheduled basis)
  useEffect(() => {
    const monthlyGrossRent = financials.monthlyGrossRent ?? 1950;
    const pmPct = financials.management_pct ?? financials.propertyManagementFeePercent ?? 10;
    const bug8PMFee = Math.round(monthlyGrossRent * (pmPct / 100) * 100) / 100;

    const todayStr = new Date().toISOString().split('T')[0];

    const mockProposalsList: PlaidOpexProposal[] = [
      {
        id: 'prop-tax-1',
        category: 'tax',
        description: 'County Treasurer Property Tax Payment',
        amount: financials.holdingCostTaxes ?? 200,
        date: todayStr,
        source: 'plaid',
      },
      {
        id: 'prop-ins-1',
        category: 'insurance',
        description: 'Farmers Insurance Home Policy Premium',
        amount: financials.holdingCostInsurance ?? 58,
        date: todayStr,
        source: 'plaid',
      },
      {
        id: 'prop-pm-1',
        category: 'management',
        description: `RPM Management Fee - ${pmPct}% on Gross scheduled basis (BUG-8)`,
        amount: bug8PMFee,
        date: todayStr,
        source: 'plaid',
      },
      {
        id: 'prop-util-1',
        category: 'utilities',
        description: 'City Water & Sewer Utility Bill',
        amount: financials.holdingCostUtilities ?? 125,
        date: todayStr,
        source: 'plaid',
      },
      {
        id: 'prop-maint-1',
        category: 'maintenance',
        description: 'Main Street HVAC Filter replacement & tune-up',
        amount: 85,
        date: todayStr,
        source: 'plaid',
      },
    ];

    setProposals(mockProposalsList);
  }, [financials.monthlyGrossRent, financials.management_pct, financials.propertyManagementFeePercent, financials.holdingCostTaxes, financials.holdingCostInsurance, financials.holdingCostUtilities]);

  // Extract opex items safely
  const getOpexList = (category: OpexCategory): OpexEntry[] => {
    switch (category) {
      case 'tax': return financials.opex_tax || [];
      case 'insurance': return financials.opex_insurance || [];
      case 'security': return financials.opex_security || [];
      case 'maintenance': return financials.opex_maintenance || [];
      case 'utilities': return financials.opex_utilities || [];
      case 'management': return financials.opex_management || [];
      case 'hoa': return financials.opex_hoa || [];
      case 'capex': return financials.opex_capex || [];
      default: return [];
    }
  };

  const getCategorySum = (category: OpexCategory) => {
    return getOpexList(category)
      .filter(e => e.confirmed)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  // Add Manual expense entry
  const handleAddManualExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || !manualDate) {
      toast.error('Please enter amount and date');
      return;
    }

    const amountNum = parseFloat(manualAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newEntry: OpexEntry = {
      id: `opex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: amountNum,
      date: manualDate,
      confirmed: true,
      source: 'manual',
      notes: manualNotes.trim() || undefined,
    };

    const currentList = getOpexList(activeCategory);
    const updatedList = [...currentList, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        [`opex_${activeCategory}`]: updatedList,
      });

      // Emit PostHog telemetry
      try {
        posthog.capture('opex_entry_logged', {
          projectId: project.id,
          category: activeCategory,
          amount: amountNum,
          source: 'manual',
        });
      } catch (err) {
        console.warn('Telemetry capture failed:', err);
      }

      toast.success('Expense item logged successfully');
      setManualAmount('');
      setManualNotes('');
      refresh();
    } catch (err: any) {
      toast.error('Failed to log expense item');
    }
  };

  // Confirm proposed Plaid transaction
  const handleConfirmProposal = async (proposal: PlaidOpexProposal) => {
    const newEntry: OpexEntry = {
      id: `opex-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: proposal.amount,
      date: proposal.date,
      confirmed: true,
      source: 'plaid',
      notes: proposal.description,
    };

    const currentList = getOpexList(proposal.category);
    const updatedList = [...currentList, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        [`opex_${proposal.category}`]: updatedList,
      });

      // Emit PostHog telemetry
      try {
        posthog.capture('opex_entry_logged', {
          projectId: project.id,
          category: proposal.category,
          amount: proposal.amount,
          source: 'plaid',
        });
      } catch (err) {
        console.warn('Telemetry capture failed:', err);
      }

      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      toast.success(`Confirmed payment of $${proposal.amount.toLocaleString()} to ${CATEGORY_META[proposal.category].label}`);
      refresh();
    } catch (err: any) {
      toast.error('Failed to confirm Plaid transaction');
    }
  };

  // Ignore proposal
  const handleIgnoreProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    toast.success('Plaid proposal ignored');
  };

  // Delete expense entry
  const handleDeleteEntry = async (id: string) => {
    const currentList = getOpexList(activeCategory);
    const updatedList = currentList.filter(e => e.id !== id);

    try {
      await updateProjectFinancials(project.id, {
        [`opex_${activeCategory}`]: updatedList,
      });

      toast.success('Expense item deleted');
      refresh();
    } catch (err: any) {
      toast.error('Failed to delete expense item');
    }
  };

  // Derive NOI & OER from actuals for summary KPI header
  const rentReceivedSum = (financials.rent_received || []).filter(e => e.confirmed).reduce((sum, e) => sum + e.amount, 0);
  const leaseIncomeSum = (financials.lease_income || []).filter(e => e.confirmed).reduce((sum, e) => sum + e.amount, 0);

  const actualRent = rentReceivedSum > 0 
    ? rentReceivedSum 
    : leaseIncomeSum > 0 
      ? leaseIncomeSum 
      : 0;

  // Actual OpEx sums everything except CapEx
  const actualOpEx = 
    getCategorySum('tax') +
    getCategorySum('insurance') +
    getCategorySum('security') +
    getCategorySum('maintenance') +
    getCategorySum('utilities') +
    getCategorySum('management') +
    getCategorySum('hoa');

  const actualNOI = actualRent > 0 ? actualRent - actualOpEx : null;
  const actualOER = actualRent > 0 && actualOpEx > 0 
    ? Math.round((actualOpEx / actualRent) * 100 * 100) / 100 
    : null;

  return (
    <div className="space-y-6">
      {/* Premium Dashboard Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-[8px] border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Actual Operating Revenue</p>
              <h4 className="text-xl font-black font-mono text-[var(--text-primary)] mt-1">
                ${actualRent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-500">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Sum of confirmed rent and lease collections
          </p>
        </div>

        <div className="p-4 rounded-[8px] border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Actual Operating Expense (OpEx)</p>
              <h4 className="text-xl font-black font-mono text-[var(--text-primary)] mt-1">
                ${actualOpEx.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
            </div>
            <span className="p-1.5 rounded bg-rose-500/10 text-rose-500">
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2">
            Total actual operating costs logged (excluding CapEx)
          </p>
        </div>

        <div className="p-4 rounded-[8px] border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Actual Net Operating Income (NOI)</p>
              <h4 className="text-xl font-black font-mono text-[var(--text-primary)] mt-1">
                {actualNOI !== null 
                  ? `$${actualNOI.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : 'N/A'
                }
              </h4>
            </div>
            <span className="p-1.5 rounded bg-blue-500/10 text-blue-500">
              <Calculator className="w-4 h-4" />
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-[10px] text-[var(--text-secondary)]">Actual OER:</span>
            <span className="text-[10px] font-bold font-mono text-amber-500">
              {actualOER !== null ? `${actualOER}%` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Categories List */}
        <div 
          className="lg:col-span-4 rounded-[8px] border overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
        >
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-ui)' }}>
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Cost Categories</h3>
            <p className="text-[9px] text-[var(--text-tertiary)] uppercase mt-0.5 tracking-wider">Select category to log operating actuals</p>
          </div>

          <div className="flex-1 divide-y divide-[var(--border-ui)]">
            {(Object.keys(CATEGORY_META) as OpexCategory[]).map(cat => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const sum = getCategorySum(cat);
              const count = getOpexList(cat).length;
              const isActive = activeCategory === cat;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left p-3.5 flex items-center justify-between transition-colors ${
                    isActive 
                      ? 'bg-[var(--bg-canvas)] border-l-4 border-amber-500' 
                      : 'hover:bg-[var(--bg-canvas)]/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`p-1.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-ui)] ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{meta.label}</p>
                      <p className="text-[9px] text-[var(--text-tertiary)] mt-0.5">{count} item(s) logged</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold font-mono text-[var(--text-primary)]">
                      ${sum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Ledger and Entry */}
        <div className="lg:col-span-8 space-y-6">
          {/* Plaid proposed transactions */}
          {/* Plaid proposed transactions */}
          {IS_DEMO_MODE && (
            <div 
              className="rounded-[8px] border overflow-hidden" 
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
            >
              <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Plaid Smart Attribution Feed
                  </h3>
                  <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
                    Confirm proposed transactions matching {CATEGORY_META[activeCategory].label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlaidConnected(!isPlaidConnected)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded border transition-colors ${
                    isPlaidConnected 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' 
                      : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-ui)] hover:bg-[var(--bg-canvas)]/80'
                  }`}
                >
                  {isPlaidConnected ? 'Plaid Connected' : 'Connect Plaid Bank Feed'}
                </button>
              </div>

              {isPlaidConnected ? (
                <div className="p-6 space-y-3">
                  {proposals.filter(p => p.category === activeCategory).length > 0 ? (
                    proposals
                      .filter(p => p.category === activeCategory)
                      .map(prop => (
                        <div 
                          key={prop.id} 
                          className="p-4 rounded-[8px] border bg-[var(--bg-canvas)] border-[var(--border-ui)] flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                Proposed Attribution
                              </span>
                              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{prop.date}</span>
                            </div>
                            <p className="text-xs font-bold text-[var(--text-primary)] mt-1.5">{prop.description}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-sm font-bold font-mono text-[var(--text-primary)]">
                              ${prop.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleIgnoreProposal(prop.id)}
                                className="p-1 text-[10px] font-bold uppercase text-[var(--text-tertiary)] hover:text-rose-500"
                              >
                                Ignore
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConfirmProposal(prop)}
                                disabled={isLocked}
                                className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--text-primary)] text-[var(--bg-surface)] rounded hover:opacity-90 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-[var(--text-tertiary)] italic text-center py-4">
                      No pending Plaid proposals for {CATEGORY_META[activeCategory].label}.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-[var(--bg-canvas)]/30">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Connect your Plaid bank feed to automatically scan and propose attribution for recurring property expenses.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Manual Logger & ledger */}
          <div 
            className="rounded-[8px] border overflow-hidden" 
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
          >
            <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-ui)' }}>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
                  {CATEGORY_META[activeCategory].label} Ledger
                </h3>
                <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
                  {CATEGORY_META[activeCategory].desc}
                </p>
              </div>
            </div>

            {/* Manual expense form */}
            {!isLocked && (
              <form onSubmit={handleAddManualExpense} className="p-6 border-b space-y-4" style={{ borderColor: 'var(--border-ui)' }}>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Log Manual Expense</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Amount ($)</label>
                    <input
                      type="text"
                      placeholder="e.g. 250"
                      value={manualAmount}
                      onChange={e => setManualAmount(e.target.value)}
                      className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Payment Date</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={e => setManualDate(e.target.value)}
                      className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-widest text-[var(--text-tertiary)]">Notes / Vendor</label>
                    <input
                      type="text"
                      placeholder="e.g. Roof repair"
                      value={manualNotes}
                      onChange={e => setManualNotes(e.target.value)}
                      className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[var(--text-primary)] text-[var(--bg-surface)] rounded hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Expense
                  </button>
                </div>
              </form>
            )}

            {/* Confirmed items list */}
            <div className="p-6">
              {getOpexList(activeCategory).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--border-ui)' }}>
                        <th className="py-2.5 font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">Date</th>
                        <th className="py-2.5 font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">Notes/Description</th>
                        <th className="py-2.5 font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider">Source</th>
                        <th className="py-2.5 font-bold text-[var(--text-secondary)] text-[10px] uppercase tracking-wider text-right">Amount</th>
                        {!isLocked && <th className="py-2.5 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-ui)]/50">
                      {getOpexList(activeCategory).map(item => (
                        <tr key={item.id} className="hover:bg-[var(--bg-canvas)]/10">
                          <td className="py-3 font-mono text-[var(--text-primary)]">{item.date}</td>
                          <td className="py-3 text-[var(--text-secondary)]">{item.notes || '—'}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              item.source === 'plaid' 
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                                : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border border-[var(--border-ui)]'
                            }`}>
                              {item.source || 'manual'}
                            </span>
                          </td>
                          <td className="py-3 font-bold font-mono text-[var(--text-primary)] text-right">
                            ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          {!isLocked && (
                            <td className="py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(item.id)}
                                className="p-1 text-[var(--text-tertiary)] hover:text-rose-500 transition-colors"
                                title="Delete entry"
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
              ) : (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--text-tertiary)] italic">
                    No confirmed expense transactions logged under {CATEGORY_META[activeCategory].label} yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
