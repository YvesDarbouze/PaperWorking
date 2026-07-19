'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectFinancials, LeaseIncomeEntry, ActualLeaseTerms } from '@/types/schema';
import { DollarSign, Calendar, Plus, Trash2, Check, Sparkles, FileText, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';

interface LeaseOperationsCardProps {
  project: Project;
  refresh: () => void;
  isLocked?: boolean;
}

interface PlaidAttributionProposal {
  id: string;
  amount: number;
  date: string;
  tenantName: string;
  source: 'plaid';
}

const mockPlaidProposals: PlaidAttributionProposal[] = [
  { id: 'lease-prop-1', amount: 4500, date: new Date().toISOString().split('T')[0], tenantName: 'Lexington Tech Corp', source: 'plaid' },
];

export default function LeaseOperationsCard({ project, refresh, isLocked }: LeaseOperationsCardProps) {
  const financials = project.financials || {};
  const leaseIncome = financials.lease_income || [];
  const leaseTerms = financials.lease_terms || { rateCents: 0, termMonths: 12, escalations: '', type: 'Gross' };

  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // States
  const [proposals, setProposals] = useState<PlaidAttributionProposal[]>(mockPlaidProposals);
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Term states
  const [rate, setRate] = useState(leaseTerms.rateCents ? String(leaseTerms.rateCents / 100) : '');
  const [termMonths, setTermMonths] = useState(String(leaseTerms.termMonths));
  const [escalations, setEscalations] = useState(leaseTerms.escalations || '');
  const [leaseType, setLeaseType] = useState<ActualLeaseTerms['type']>(leaseTerms.type);

  // Manual payment entry states
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Sync terms when parent updates
  useEffect(() => {
    setRate(leaseTerms.rateCents ? String(leaseTerms.rateCents / 100) : '');
    setTermMonths(String(leaseTerms.termMonths));
    setEscalations(leaseTerms.escalations || '');
    setLeaseType(leaseTerms.type);
  }, [leaseTerms.rateCents, leaseTerms.termMonths, leaseTerms.escalations, leaseTerms.type]);

  // Save lease terms
  const handleSaveTerms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProjectFinancials(project.id, {
        lease_terms: {
          rateCents: Math.round((Number(rate) || 0) * 100),
          termMonths: Number(termMonths) || 12,
          escalations,
          type: leaseType,
        },
      });
      toast.success('Lease terms updated successfully');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update lease terms');
    }
  };

  // Add manual payment
  const handleAddManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || !manualDate) {
      toast.error('Please enter amount and date');
      return;
    }

    const newEntry: LeaseIncomeEntry = {
      id: `lease-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: Number(manualAmount),
      date: manualDate,
      confirmed: true,
      source: 'manual',
    };

    const updatedIncome = [...leaseIncome, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        lease_income: updatedIncome,
      });
      toast.success('Lease payment logged successfully');
      setManualAmount('');
      setShowManualForm(false);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log lease payment');
    }
  };

  // Confirm proposed Plaid payment
  const handleConfirmProposal = async (proposal: PlaidAttributionProposal) => {
    const newEntry: LeaseIncomeEntry = {
      id: `lease-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: proposal.amount,
      date: proposal.date,
      confirmed: true,
      source: 'plaid',
    };

    const updatedIncome = [...leaseIncome, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        lease_income: updatedIncome,
      });
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      toast.success(`Confirmed lease payment of $${proposal.amount}`);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to confirm lease payment');
    }
  };

  // Decline/Ignore proposed payment
  const handleDeclineProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    toast.success('Proposal ignored');
  };

  // Delete payment entry
  const handleDeleteEntry = async (id: string) => {
    const updatedIncome = leaseIncome.filter(entry => entry.id !== id);
    try {
      await updateProjectFinancials(project.id, {
        lease_income: updatedIncome,
      });
      toast.success('Lease payment deleted');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete payment');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Lease Terms Input */}
      <div
        className="lg:col-span-5 rounded-[8px] border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
      >
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              Activated Lease Terms
            </h3>
            <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
              Specify active commercial/residential lease parameters
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveTerms} className="p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Lease Rate ($ / Month)
            </label>
            <div className="relative group">
              <input
                type="number"
                placeholder="e.g. 4500"
                value={rate}
                onChange={e => setRate(e.target.value)}
                disabled={isLocked}
                className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Term (Months)
              </label>
              <input
                type="number"
                placeholder="e.g. 12"
                value={termMonths}
                onChange={e => setTermMonths(e.target.value)}
                disabled={isLocked}
                className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Lease Type
              </label>
              <select
                value={leaseType}
                onChange={e => setLeaseType(e.target.value as ActualLeaseTerms['type'])}
                disabled={isLocked}
                className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none bg-[var(--bg-surface)] text-[var(--text-primary)]"
              >
                <option value="Gross">Gross</option>
                <option value="NNN">NNN</option>
                <option value="Modified_Gross">Modified Gross</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Escalation Structure
            </label>
            <input
              type="text"
              placeholder="e.g. 3% annual escalation starting Year 2"
              value={escalations}
              onChange={e => setEscalations(e.target.value)}
              disabled={isLocked}
              className="glass-input w-full text-xs py-2.5 px-3 focus:outline-none"
            />
          </div>

          {!isLocked && (
            <button
              type="submit"
              className="w-full mt-2 py-2 rounded text-[10px] font-bold uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90 transition-all"
            >
              Update Lease Terms
            </button>
          )}
        </form>
      </div>

      {/* Right Column: Payments Ledger */}
      <div
        className="lg:col-span-7 rounded-[8px] border overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
      >
        <div
          className="px-6 py-4 border-b flex justify-between items-center"
          style={{ borderColor: 'var(--border-ui)' }}
        >
          <div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" />
              Lease Payments &amp; Receipts
            </h3>
            <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
              Log payments received against lease schedule
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaidConnected(!isPlaidConnected)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest border transition-all"
              style={{
                backgroundColor: isPlaidConnected ? 'rgba(16,185,129,0.1)' : 'transparent',
                borderColor: isPlaidConnected ? '#10b981' : 'var(--border-ui)',
                color: isPlaidConnected ? '#10b981' : 'var(--text-secondary)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              {isPlaidConnected ? 'Plaid Active' : 'Connect Plaid'}
            </button>

            {!isLocked && (
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-all bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90"
              >
                <Plus className="w-3 h-3" />
                Log Payment
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Plaid Auto proposals */}
          {isPlaidConnected && proposals.length > 0 && (
            <div className="p-4 rounded-lg bg-[rgba(16,185,129,0.03)] border border-emerald-500/20 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Plaid Detected Lease Transaction
              </span>
              {proposals.map(p => (
                <div
                  key={p.id}
                  className="p-3 rounded bg-[var(--bg-canvas)] border border-[var(--border-ui)] flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{p.tenantName}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">{p.date}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 mr-2">${p.amount}</span>
                    <button
                      onClick={() => handleConfirmProposal(p)}
                      className="p-1 rounded hover:bg-emerald-500/10 text-emerald-400"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeclineProposal(p.id)}
                      className="p-1 rounded hover:bg-rose-500/10 text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual Entry */}
          {showManualForm && (
            <form onSubmit={handleAddManualPayment} className="p-4 rounded border border-[var(--border-ui)] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Log Lease Payment Manually
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Amount ($)</label>
                  <input
                    type="number"
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    placeholder="e.g. 3000"
                    className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Payment Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={e => setManualDate(e.target.value)}
                    className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  Add Lease Payment
                </button>
              </div>
            </form>
          )}

          {/* Payments Table */}
          <div className="border border-[var(--border-ui)] rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-ui)]">
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Date</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Source</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)] text-right">Amount</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-ui)]">
                {leaseIncome.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-[var(--text-tertiary)]">
                      No lease payments logged yet.
                    </td>
                  </tr>
                ) : (
                  leaseIncome.map(entry => (
                    <tr key={entry.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                      <td className="p-3 text-[var(--text-secondary)]">{entry.date}</td>
                      <td className="p-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: entry.source === 'plaid' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                            color: entry.source === 'plaid' ? '#10b981' : 'var(--text-secondary)',
                          }}
                        >
                          {entry.source || 'manual'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[var(--text-primary)] text-right">${entry.amount}</td>
                      <td className="p-3 text-right">
                        {!isLocked && (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
