'use client';

import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Info, HelpCircle, AlertTriangle, Check, X, ShieldAlert, Sparkles, CheckCircle2, History } from 'lucide-react';
import toast from 'react-hot-toast';
import type { RehabSpendEntry, RehabSpendHistoryEntry } from '@/types/schema';

interface Props {
  projectId: string;
  rehabSpend: RehabSpendEntry[];
  onSpendChange: (updatedSpend: RehabSpendEntry[]) => void;
  totalBudget: number;
}

interface PlaidProposal {
  id: string;
  amount: number; // in cents
  date: string;
  merchant: string;
  suggestedCategory: 'CapEx' | 'Repairs & Maintenance';
  note: string;
}

const INITIAL_PLAID_PROPOSALS: PlaidProposal[] = [
  { id: 'tx-001', amount: 85000, date: '2026-07-15', merchant: 'The Home Depot', suggestedCategory: 'CapEx', note: 'Purchase of lumber and drywalls for framing' },
  { id: 'tx-002', amount: 12000, date: '2026-07-16', merchant: 'Sherwin-Williams', suggestedCategory: 'CapEx', note: 'Interior primer and trim paint' },
  { id: 'tx-003', amount: 4500, date: '2026-07-17', merchant: 'Ace Hardware', suggestedCategory: 'Repairs & Maintenance', note: 'Replacement washers and pipe sealant' }
];

export function RenovationSpendTracker({ projectId, rehabSpend, onSpendChange, totalBudget }: Props) {
  const [plaidProposals, setPlaidProposals] = useState<PlaidProposal[]>(INITIAL_PLAID_PROPOSALS);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Add Form State
  const [addAmount, setAddAmount] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().slice(0, 10));
  const [addCategory, setAddCategory] = useState<'CapEx' | 'Repairs & Maintenance'>('CapEx');
  const [addNote, setAddNote] = useState('');

  // Edit Form State
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCategory, setEditCategory] = useState<'CapEx' | 'Repairs & Maintenance'>('CapEx');
  const [editNote, setEditNote] = useState('');

  // Auto-attribution confirmation handler
  const handleConfirmProposal = (proposal: PlaidProposal, category: 'CapEx' | 'Repairs & Maintenance') => {
    const newEntry: RehabSpendEntry = {
      id: `spend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: proposal.amount,
      date: proposal.date,
      category,
      note: `${proposal.merchant} (Plaid Auto-attributed): ${proposal.note}`,
      source: 'plaid',
      plaidTransactionId: proposal.id
    };

    onSpendChange([...rehabSpend, newEntry]);
    setPlaidProposals(prev => prev.filter(p => p.id !== proposal.id));
    toast.success(`Confirmed Plaid transaction from ${proposal.merchant}`);
  };

  const handleRejectProposal = (proposal: PlaidProposal) => {
    setPlaidProposals(prev => prev.filter(p => p.id !== proposal.id));
    toast.success('Plaid transaction dismissed');
  };

  // Add spend handler
  const handleAddSpend = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(addAmount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!addNote.trim()) {
      toast.error('Please enter a description note');
      return;
    }

    const newEntry: RehabSpendEntry = {
      id: `spend-${Date.now()}`,
      amount: Math.round(parsedAmount * 100),
      date: addDate,
      category: addCategory,
      note: addNote,
      source: 'manual'
    };

    onSpendChange([...rehabSpend, newEntry]);
    setAddAmount('');
    setAddNote('');
    setShowAddForm(false);
    toast.success('Renovation expense added');
  };

  // Edit save handler
  const handleSaveEdit = (id: string) => {
    const parsedAmount = parseFloat(editAmount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!editNote.trim()) {
      toast.error('Please enter a description note');
      return;
    }

    const entryToUpdate = rehabSpend.find(e => e.id === id);
    if (!entryToUpdate) return;

    const newAmount = Math.round(parsedAmount * 100);
    const hasChanges = entryToUpdate.amount !== newAmount ||
      entryToUpdate.date !== editDate ||
      entryToUpdate.category !== editCategory ||
      entryToUpdate.note !== editNote;

    if (!hasChanges) {
      setEditingId(null);
      return;
    }

    // Build history entry
    const historyEntry: RehabSpendHistoryEntry = {
      updatedAt: new Date().toISOString(),
      updatedBy: getAuth().currentUser?.email || 'user@paperworking.com',
      previousValue: {
        amount: entryToUpdate.amount,
        date: entryToUpdate.date,
        category: entryToUpdate.category,
        note: entryToUpdate.note
      }
    };

    const updatedList = rehabSpend.map(e => {
      if (e.id === id) {
        return {
          ...e,
          amount: newAmount,
          date: editDate,
          category: editCategory,
          note: editNote,
          history: [...(e.history || []), historyEntry]
        };
      }
      return e;
    });

    onSpendChange(updatedList);
    setEditingId(null);
    toast.success('Renovation expense updated');
  };

  // Delete handler
  const handleDeleteSpend = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      onSpendChange(rehabSpend.filter(e => e.id !== id));
      toast.success('Renovation expense deleted');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Plaid Proposals Bar */}
      {plaidProposals.length > 0 && (
        <div className="border border-[#7A9EAA]/30 bg-[#7A9EAA]/5 p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[12px] font-bold text-[#7A9EAA] flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 animate-pulse" />
              Plaid Auto-Attribution ({plaidProposals.length} Proposed Matches)
            </span>
            <span className="text-[10px] text-[#9E9DA0]/80">Confirm category to add to ledger</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plaidProposals.map(proposal => (
              <div key={proposal.id} className="glass-card border border-white/5 p-3 rounded-lg flex flex-col justify-between gap-3 text-left">
                <div>
                  <div className="flex justify-between items-center w-full">
                    <span className="text-xs font-bold text-white line-clamp-1">{proposal.merchant}</span>
                    <span className="text-xs font-mono font-bold text-[#7A9EAA]">${(proposal.amount / 100).toFixed(2)}</span>
                  </div>
                  <p className="text-[10px] text-[#9E9DA0]/60 mt-0.5 font-mono">{proposal.date}</p>
                  <p className="text-[10px] text-[#9E9DA0] mt-2 line-clamp-2 italic">"{proposal.note}"</p>
                </div>
                <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleRejectProposal(proposal)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400 transition"
                    title="Dismiss"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleConfirmProposal(proposal, 'Repairs & Maintenance')}
                      className="text-[9px] font-bold border border-white/10 hover:border-white/20 text-[#9E9DA0] px-2 py-0.5 rounded transition"
                    >
                      Maint.
                    </button>
                    <button
                      onClick={() => handleConfirmProposal(proposal, 'CapEx')}
                      className="text-[9px] font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-2 py-0.5 rounded transition flex items-center gap-0.5"
                    >
                      <Check className="w-2.5 h-2.5" /> CapEx
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax Guidance Header Banner */}
      <div className="bg-[#454955]/10 border border-[#454955]/20 p-4 rounded-xl flex gap-3 text-left">
        <ShieldAlert className="w-5 h-5 text-[#7A9EAA] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">CapEx vs. Repairs &amp; Maintenance Classification</h4>
          <p className="text-[11px] text-[#9E9DA0] leading-relaxed">
            <strong>Capital Expenditures (CapEx/Improvements)</strong> add permanent value, extend the useful life of the asset, or adapt it to new uses (e.g. replacing a roof, complete HVAC overhaul). They must be capitalized and depreciated.
            <br />
            <strong>Repairs &amp; Maintenance (Expenses)</strong> keep the property in normal operating condition without adding significant value (e.g. patching drywall, fixing leaks). They can be expensed immediately.
          </p>
          <p className="text-[9px] text-[#9E9DA0]/50 italic flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[#ffb4ab]" />
            <span>This classification is provided for operational tracking only, not official tax advice. Consult a licensed CPA for regulatory tax filings.</span>
          </p>
        </div>
      </div>

      {/* Main spend log list */}
      <div className="glass-card border border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[14px] font-bold text-white uppercase tracking-wider">Spend Log ({rehabSpend.length} Entries)</span>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="text-xs font-bold bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 text-white px-3 py-1.5 rounded-lg transition"
          >
            {showAddForm ? 'Cancel' : '+ Add Spend'}
          </button>
        </div>

        {/* Add Entry Form */}
        {showAddForm && (
          <form onSubmit={handleAddSpend} className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Amount ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1,250.00"
                  value={addAmount}
                  onChange={e => setAddAmount(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Transaction Date</label>
                <input
                  type="date"
                  required
                  value={addDate}
                  onChange={e => setAddDate(e.target.value)}
                  className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none filter invert"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Category</label>
                <select
                  value={addCategory}
                  onChange={e => setAddCategory(e.target.value as any)}
                  className="bg-[#121014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
                >
                  <option value="CapEx">CapEx (Capital Improvements)</option>
                  <option value="Repairs & Maintenance">Repairs &amp; Maintenance</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Description / Notes</label>
              <input
                type="text"
                required
                placeholder="e.g. Home Depot plumbing fixtures"
                value={addNote}
                onChange={e => setAddNote(e.target.value)}
                className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white w-full outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-xs text-[#9E9DA0] px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs text-white font-bold px-4 py-1.5 rounded bg-[#7A9EAA] hover:bg-[#7A9EAA]/80 transition"
              >
                Add Transaction
              </button>
            </div>
          </form>
        )}

        {/* Spend Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#9E9DA0] uppercase tracking-wider">
                <th className="py-2.5">Date</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Amount</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rehabSpend.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#9E9DA0]">
                    No spend entries recorded. Add manual transactions or confirm Plaid matches above.
                  </td>
                </tr>
              ) : (
                rehabSpend.map(entry => {
                  const isEditing = editingId === entry.id;

                  return (
                    <tr key={entry.id} className="border-b border-white/5 hover:bg-white/5 transition-all align-top">
                      {isEditing ? (
                        <td colSpan={5} className="py-3">
                          <div className="bg-white/5 border border-white/5 p-4 rounded-xl space-y-4 text-left">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Amount ($)</label>
                                <input
                                  type="text"
                                  value={editAmount}
                                  onChange={e => setEditAmount(e.target.value)}
                                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white w-full outline-none font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Date</label>
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={e => setEditDate(e.target.value)}
                                  className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white w-full outline-none filter invert"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Category</label>
                                <select
                                  value={editCategory}
                                  onChange={e => setEditCategory(e.target.value as any)}
                                  className="bg-[#121014] border border-white/10 rounded px-2 py-1 text-xs text-white w-full outline-none"
                                >
                                  <option value="CapEx">CapEx</option>
                                  <option value="Repairs & Maintenance">Repairs &amp; Maint.</option>
                                </select>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase font-bold text-[#9E9DA0]">Description</label>
                              <input
                                type="text"
                                value={editNote}
                                onChange={e => setEditNote(e.target.value)}
                                className="bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-white w-full outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2 text-[10px]">
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[#9E9DA0]"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(entry.id)}
                                className="px-2 py-1 rounded bg-[#7A9EAA] text-white font-bold"
                              >
                                Save Updates
                              </button>
                            </div>
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="py-3 text-[#9E9DA0] font-mono">{entry.date}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              entry.category === 'CapEx'
                                ? 'bg-[#7A9EAA]/15 text-[#7A9EAA]'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}>
                              {entry.category}
                            </span>
                          </td>
                          <td className="py-3 text-white">
                            <div className="flex flex-col">
                              <span>{entry.note}</span>
                              {entry.source === 'plaid' && (
                                <span className="text-[9px] text-[#7A9EAA] mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" /> Plaid Attributed
                                </span>
                              )}
                              {entry.history && entry.history.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 group relative">
                                  <span className="text-[9px] text-amber-400 font-bold flex items-center gap-0.5 cursor-help">
                                    <History className="w-2.5 h-2.5" /> Edited ({entry.history.length}x)
                                  </span>
                                  {/* Hover popup with audit trails */}
                                  <div className="absolute top-5 left-0 scale-0 group-hover:scale-100 bg-[#161318] border border-white/10 rounded-lg p-2.5 text-[9px] text-[#9E9DA0] w-64 z-20 shadow-2xl transition-all">
                                    <p className="font-bold text-white border-b border-white/10 pb-1 mb-1">Edit Audit History</p>
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                      {entry.history.map((hist, idx) => (
                                        <div key={idx} className="border-b border-white/5 pb-1 last:border-0">
                                          <p className="text-white/80 font-semibold">{hist.updatedBy}</p>
                                          <p className="text-[8px]">{new Date(hist.updatedAt).toLocaleString()}</p>
                                          <p className="mt-0.5 text-amber-400/80">Prev: ${(hist.previousValue.amount / 100).toFixed(2)} | {hist.previousValue.category} | "{hist.previousValue.note}"</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-white">
                            ${(entry.amount / 100).toFixed(2)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingId(entry.id);
                                  setEditAmount((entry.amount / 100).toString());
                                  setEditDate(entry.date);
                                  setEditCategory(entry.category);
                                  setEditNote(entry.note);
                                }}
                                className="text-[10px] font-bold text-[#7A9EAA] hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSpend(entry.id)}
                                className="text-[10px] font-bold text-red-400 hover:underline"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
