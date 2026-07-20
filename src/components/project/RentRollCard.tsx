'use client';

import React, { useState, useEffect } from 'react';
import { Project, ProjectFinancials, RentReceivedEntry } from '@/types/schema';
import { DollarSign, Calendar, User, Plus, Trash2, Check, Activity, Building2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProjectStore } from '@/store/projectStore';
import { IS_DEMO_MODE } from '@/lib/config/demo';

interface RentRollCardProps {
  project: Project;
  refresh: () => void;
  isLocked?: boolean;
}

interface PlaidAttributionProposal {
  id: string;
  amount: number; // in dollars
  date: string;
  unit: string;
  tenantName: string;
  source: 'plaid';
}

const mockPlaidProposals: PlaidAttributionProposal[] = [
  { id: 'prop-1', amount: 1500, date: new Date().toISOString().split('T')[0], unit: 'Unit 101', tenantName: 'Alice Vance', source: 'plaid' },
  { id: 'prop-2', amount: 1800, date: new Date().toISOString().split('T')[0], unit: 'Unit 102', tenantName: 'Bob Jenkins', source: 'plaid' },
];

export default function RentRollCard({ project, refresh, isLocked }: RentRollCardProps) {
  const financials = project.financials || {};
  const rentReceived = financials.rent_received || [];
  const numberOfUnits = financials.numberOfUnits || 1;

  const updateProjectFinancials = useProjectStore(state => state.updateProjectFinancials);

  // States
  const [proposals, setProposals] = useState<PlaidAttributionProposal[]>(mockPlaidProposals);
  const [isPlaidConnected, setIsPlaidConnected] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Manual form states
  const [manualUnit, setManualUnit] = useState('');
  const [manualTenant, setManualTenant] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

  // Unit Occupancy states
  const [unitOccupancyDays, setUnitOccupancyDays] = useState<Record<string, { occupied: number; total: number }>>({});

  // Initialize unit occupancy state
  useEffect(() => {
    const initial: Record<string, { occupied: number; total: number }> = {};
    for (let i = 1; i <= numberOfUnits; i++) {
      const unitKey = `Unit ${i}`;
      initial[unitKey] = { occupied: 30, total: 30 };
    }
    // If we have totalHoldDays and daysOccupied, distribute them
    if (financials.daysOccupied !== undefined && financials.totalHoldDays !== undefined && financials.totalHoldDays > 0) {
      const daysPerUnit = Math.floor(financials.daysOccupied / numberOfUnits);
      const totalDaysPerUnit = Math.floor(financials.totalHoldDays / numberOfUnits);
      for (let i = 1; i <= numberOfUnits; i++) {
        const unitKey = `Unit ${i}`;
        initial[unitKey] = {
          occupied: daysPerUnit,
          total: totalDaysPerUnit > 0 ? totalDaysPerUnit : 30,
        };
      }
    }
    setUnitOccupancyDays(initial);
  }, [numberOfUnits, financials.daysOccupied, financials.totalHoldDays]);

  // Handle manual logging
  const handleLogManualRent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUnit || !manualAmount || !manualDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newEntry: RentReceivedEntry = {
      id: `rent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: Number(manualAmount),
      date: manualDate,
      unit: manualUnit,
      tenantName: manualTenant || undefined,
      confirmed: true,
      source: 'manual',
    };

    const updatedRent = [...rentReceived, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        rent_received: updatedRent,
      });
      toast.success('Rent payment logged successfully');
      setShowManualForm(false);
      setManualUnit('');
      setManualTenant('');
      setManualAmount('');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log rent payment');
    }
  };

  // Confirm proposed Plaid payment
  const handleConfirmProposal = async (proposal: PlaidAttributionProposal) => {
    const newEntry: RentReceivedEntry = {
      id: `rent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: proposal.amount,
      date: proposal.date,
      unit: proposal.unit,
      tenantName: proposal.tenantName,
      confirmed: true,
      source: 'plaid',
    };

    const updatedRent = [...rentReceived, newEntry];

    try {
      await updateProjectFinancials(project.id, {
        rent_received: updatedRent,
      });
      setProposals(prev => prev.filter(p => p.id !== proposal.id));
      toast.success(`Confirmed payment of $${proposal.amount} for ${proposal.unit}`);
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to confirm Plaid payment');
    }
  };

  // Decline/Ignore proposed payment
  const handleDeclineProposal = (id: string) => {
    setProposals(prev => prev.filter(p => p.id !== id));
    toast.success('Transaction proposal ignored');
  };

  // Delete rent entry
  const handleDeleteRentEntry = async (id: string) => {
    const updatedRent = rentReceived.filter(entry => entry.id !== id);
    try {
      await updateProjectFinancials(project.id, {
        rent_received: updatedRent,
      });
      toast.success('Rent entry deleted');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete rent entry');
    }
  };

  // Save unit occupancy details to derive daysOccupied & totalHoldDays
  const handleSaveOccupancy = async () => {
    let totalOccupied = 0;
    let totalHold = 0;

    Object.values(unitOccupancyDays).forEach(u => {
      totalOccupied += u.occupied;
      totalHold += u.total;
    });

    try {
      await updateProjectFinancials(project.id, {
        daysOccupied: totalOccupied,
        totalHoldDays: totalHold,
      });
      toast.success('Unit occupancy updated successfully');
      refresh();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save unit occupancy');
    }
  };

  return (
    <div
      className="rounded-[8px] border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-ui)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 border-b flex justify-between items-center"
        style={{ borderColor: 'var(--border-ui)' }}
      >
        <div>
          <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            Rent Roll & Occupancy Tracker
          </h3>
          <p className="text-[10px] uppercase tracking-[0.15em] mt-0.5 text-[var(--text-tertiary)]">
            Log active unit income & occupancy cycles
          </p>
        </div>

        <div className="flex items-center gap-3">
          {IS_DEMO_MODE && (
            <button
              onClick={() => setIsPlaidConnected(!isPlaidConnected)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all border"
              style={{
                backgroundColor: isPlaidConnected ? 'rgba(16,185,129,0.1)' : 'transparent',
                borderColor: isPlaidConnected ? '#10b981' : 'var(--border-ui)',
                color: isPlaidConnected ? '#10b981' : 'var(--text-secondary)',
              }}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              {isPlaidConnected ? 'Plaid Feed Linked (Demo)' : 'Connect Plaid (Demo)'}
            </button>
          )}

          {!isLocked && (
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all bg-[var(--text-primary)] text-[var(--bg-surface)] hover:opacity-90"
            >
              <Plus className="w-3 h-3" />
              Log Payment
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Plaid proposals banner if connected */}
        {IS_DEMO_MODE && isPlaidConnected && proposals.length > 0 && (
          <div className="p-4 rounded-lg bg-[rgba(16,185,129,0.03)] border border-emerald-500/20 space-y-3 relative">
            <div className="absolute top-2 right-2 flex items-center">
              <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Demo</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-500" />
                Plaid Auto-Attribution: Rent Payments Detected (Demo)
              </span>
              <span className="text-[10px] text-emerald-500/60 font-semibold mr-12">{proposals.length} pending</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map(p => (
                <div
                  key={p.id}
                  className="p-3.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-ui)] flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[var(--text-primary)]">{p.tenantName} ({p.unit})</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {p.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-emerald-400 mr-2">${p.amount}</span>
                    <button
                      onClick={() => handleConfirmProposal(p)}
                      className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400"
                      title="Confirm Payment"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeclineProposal(p.id)}
                      className="p-1.5 rounded hover:bg-rose-500/10 text-rose-400"
                      title="Decline"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manual rent logger popup form */}
        {showManualForm && (
          <form onSubmit={handleLogManualRent} className="p-4 rounded-lg border border-[var(--border-ui)] space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Manual Rent payment entry
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Unit ID</label>
                <input
                  type="text"
                  placeholder="e.g. Unit 101"
                  value={manualUnit}
                  onChange={e => setManualUnit(e.target.value)}
                  className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Tenant Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alice Vance"
                  value={manualTenant}
                  onChange={e => setManualTenant(e.target.value)}
                  className="glass-input w-full text-xs py-2 px-3 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">Amount ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={manualAmount}
                  onChange={e => setManualAmount(e.target.value)}
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
                className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
              >
                Add Rent Entry
              </button>
            </div>
          </form>
        )}

        {/* Rent Ledger Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
              Verified Rent Roll Ledger
            </span>
            <span className="text-[10px] text-[var(--text-tertiary)]">
              Total Receipts: {rentReceived.length}
            </span>
          </div>

          <div className="border border-[var(--border-ui)] rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[rgba(255,255,255,0.02)] border-b border-[var(--border-ui)]">
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Unit</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Tenant</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Date</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)]">Source</th>
                  <th className="p-3 font-bold uppercase tracking-widest text-[10px] text-[var(--text-tertiary)] text-right">Amount</th>
                  <th className="p-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-ui)]">
                {rentReceived.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-[var(--text-tertiary)]">
                      No rent payments logged yet. Connect Plaid or click &quot;Log Payment&quot; above.
                    </td>
                  </tr>
                ) : (
                  rentReceived.map(entry => (
                    <tr key={entry.id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                      <td className="p-3 font-semibold text-[var(--text-primary)]">{entry.unit}</td>
                      <td className="p-3 text-[var(--text-secondary)]">{entry.tenantName || '—'}</td>
                      <td className="p-3 text-[var(--text-tertiary)]">{entry.date}</td>
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
                            onClick={() => handleDeleteRentEntry(entry.id)}
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

        {/* Days-Occupied & Overall Occupancy Tracker */}
        <div className="space-y-4 pt-4 border-t border-[var(--border-ui)]">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
                Unit Occupancy Ledger
              </span>
              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                Calculate actual holding days vs occupied days to derive portfolio occupancy
              </p>
            </div>

            {!isLocked && (
              <button
                onClick={handleSaveOccupancy}
                className="flex items-center gap-1 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              >
                Save Occupancy
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(unitOccupancyDays).map(([unitKey, val]) => (
              <div
                key={unitKey}
                className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-ui)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">{unitKey}</span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400">
                    {val.total > 0 ? Math.round((val.occupied / val.total) * 100) : 0}% Occupied
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                      Occupied Days
                    </label>
                    <input
                      type="number"
                      value={val.occupied}
                      onChange={e => {
                        const num = Number(e.target.value);
                        setUnitOccupancyDays(prev => ({
                          ...prev,
                          [unitKey]: { ...prev[unitKey], occupied: num },
                        }));
                      }}
                      disabled={isLocked}
                      className="glass-input w-full text-xs py-1.5 px-2 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                      Billing Cycle Days
                    </label>
                    <input
                      type="number"
                      value={val.total}
                      onChange={e => {
                        const num = Number(e.target.value);
                        setUnitOccupancyDays(prev => ({
                          ...prev,
                          [unitKey]: { ...prev[unitKey], total: num },
                        }));
                      }}
                      disabled={isLocked}
                      className="glass-input w-full text-xs py-1.5 px-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current Derived Occupancy Summary Banner */}
          {financials.daysOccupied !== undefined && financials.totalHoldDays !== undefined && financials.totalHoldDays > 0 && (
            <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.01)] border border-[var(--border-ui)] flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                Derived Actual Occupancy Rate
              </span>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {financials.daysOccupied} / {financials.totalHoldDays} Days Total ({Math.round((financials.daysOccupied / financials.totalHoldDays) * 100 * 100) / 100}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
