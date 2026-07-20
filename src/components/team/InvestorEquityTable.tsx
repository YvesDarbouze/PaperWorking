'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { Users, Plus, Trash2, DollarSign, Percent } from 'lucide-react';
import type { FractionalInvestor } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   InvestorEquityTable — Investor Visualization

   Renders all fractional investors on the current deal:
     - Stacked horizontal bar showing equity distribution
     - Table rows with Name, Equity %, $ Contribution
     - Inline "Add Investor" row
   ═══════════════════════════════════════════════════════ */

const EQUITY_COLORS = [
  'bg-pw-black/80',
  'bg-pw-black/60',
  'bg-pw-black/40',
  'bg-pw-black/20',
  'bg-pw-accent/80',
  'bg-pw-accent/60',
  'bg-pw-accent/40',
  'bg-pw-accent/20',
];

interface Props {
  projectId: string;
}

export default function InvestorEquityTable({ projectId }: Props) {
  const currentProject = useProjectStore((s) => s.projects.find((d) => d.id === projectId));
  const updateInvestors = useProjectStore((s) => s.updateInvestors);
  const investors = currentProject?.fractionalInvestors || [];
  const isJTWROS = currentProject?.financials?.titleHolding === 'JTWROS';

  const [showAddRow, setShowAddRow] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPercent, setNewPercent] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const totalEquity = useMemo(
    () => investors.reduce((sum, inv) => sum + inv.equityPercentage, 0),
    [investors]
  );
  const totalContribution = useMemo(
    () => investors.reduce((sum, inv) => sum + inv.contributionAmount, 0),
    [investors]
  );

  const handleAdd = () => {
    const isJTWROS = currentProject?.financials?.titleHolding === 'JTWROS';
    const percent = isJTWROS ? 0 : parseFloat(newPercent);
    const amount = parseFloat(newAmount);

    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (!isJTWROS) {
      if (isNaN(percent) || percent <= 0 || percent > 100) {
        toast.error('Equity must be between 0 and 100%.');
        return;
      }
      if (totalEquity + percent > 100) {
        toast.error(`Cannot exceed 100% equity. ${(100 - totalEquity).toFixed(1)}% available.`);
        return;
      }
    }

    const newInvestor: FractionalInvestor = {
      id: `inv_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      equityPercentage: isJTWROS ? 0 : percent,
      contributionAmount: isNaN(amount) ? 0 : amount,
      status: 'confirmed',
      confirmedAt: new Date(),
    };

    let updatedInvestors = [...investors, newInvestor];
    if (isJTWROS) {
      const count = updatedInvestors.length;
      if (count > 0) {
        const basePct = Math.floor((100 / count) * 100) / 100;
        const remainder = Math.round((100 - basePct * count) * 100) / 100;
        updatedInvestors = updatedInvestors.map((inv, idx) => ({
          ...inv,
          equityPercentage: Math.round((idx === 0 ? basePct + remainder : basePct) * 100) / 100,
        }));
      }
    }

    updateInvestors(projectId, updatedInvestors);
    if (isJTWROS) {
      toast.success(`${newInvestor.name} added. Equity splits adjusted equally for JTWROS.`);
    } else {
      toast.success(`${newInvestor.name} added with ${percent}% equity.`);
    }
    setNewName('');
    setNewEmail('');
    setNewPercent('');
    setNewAmount('');
    setShowAddRow(false);
  };

  const handleRemove = (investorId: string) => {
    let updatedInvestors = investors.filter((inv) => inv.id !== investorId);
    const isJTWROS = currentProject?.financials?.titleHolding === 'JTWROS';
    if (isJTWROS) {
      const count = updatedInvestors.length;
      if (count > 0) {
        const basePct = Math.floor((100 / count) * 100) / 100;
        const remainder = Math.round((100 - basePct * count) * 100) / 100;
        updatedInvestors = updatedInvestors.map((inv, idx) => ({
          ...inv,
          equityPercentage: Math.round((idx === 0 ? basePct + remainder : basePct) * 100) / 100,
        }));
      }
    }
    updateInvestors(projectId, updatedInvestors);
    toast.success('Investor removed.');
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-pw-black tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-pw-accent" />
            Investor Equity Table
          </h3>
          <p className="text-xs text-pw-muted mt-0.5">Cap table for this deal.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-pw-muted uppercase tracking-wider">Allocated</p>
          <p className={`text-lg font-normal ${totalEquity > 100 ? 'text-error' : 'text-pw-black'}`}>
            {totalEquity.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Stacked Equity Bar */}
      {investors.length > 0 && (
        <div className="mx-6 mb-4">
          <div className="w-full h-6 bg-surface-container overflow-hidden flex border border-pw-border">
            {investors.map((inv, i) => (
              <div
                key={inv.id}
                className={`${EQUITY_COLORS[i % EQUITY_COLORS.length]} transition-all duration-500 flex items-center justify-center`}
                style={{ width: `${inv.equityPercentage}%` }}
                title={`${inv.name}: ${inv.equityPercentage}%`}
              >
                {inv.equityPercentage >= 8 && (
                  <span className="text-[10px] font-bold text-white truncate px-1">
                    {inv.equityPercentage}%
                  </span>
                )}
              </div>
            ))}
            {totalEquity < 100 && (
              <div
                className="bg-surface-container flex items-center justify-center"
                style={{ width: `${100 - totalEquity}%` }}
              >
                <span className="text-[10px] text-pw-muted font-medium">
                  {(100 - totalEquity).toFixed(1)}% unallocated
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border-t border-pw-border overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-highest/50 backdrop-blur-md border-b border-pw-border">
              <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Investor</th>
              <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider text-right">Equity %</th>
              <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider text-right">Contribution</th>
              <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider text-right">Status</th>
              <th className="px-4 py-4 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-pw-border">
            {investors.map((inv, i) => (
              <tr key={inv.id} className="border-b border-pw-border last:border-b-0 hover:bg-white/5 transition-colors duration-200">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 flex items-center justify-center text-white text-xs font-bold ${
                        EQUITY_COLORS[i % EQUITY_COLORS.length]
                      }`}
                    >
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-pw-black">{inv.name}</p>
                      <p className="text-xs text-pw-muted">{inv.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-body-sm text-body-sm text-pw-black flex items-center justify-end gap-1">
                    <Percent className="w-3 h-3 text-pw-muted" />
                    {inv.equityPercentage.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="font-body-sm text-body-sm text-pw-black flex items-center justify-end gap-1">
                    <DollarSign className="w-3 h-3 text-pw-muted" />
                    {inv.contributionAmount.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                      inv.status === 'confirmed'
                        ? 'bg-green-600/10 text-green-600'
                        : inv.status === 'invited'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-error/10 text-error'
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => handleRemove(inv.id)}
                    className="p-1.5 text-error hover:bg-white/5 transition-colors"
                    title="Remove investor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {investors.length === 0 && !showAddRow && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <Users className="w-8 h-8 text-pw-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-pw-muted">No investors assigned to this deal yet.</p>
                </td>
              </tr>
            )}

            {/* Add Investor Row */}
            {showAddRow && (
              <tr className="bg-pw-accent/5 border-b border-pw-border">
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Name"
                      className="w-28 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm bg-white/5 text-pw-black"
                    />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email"
                      className="w-36 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm bg-white/5 text-pw-black"
                    />
                  </div>
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type={isJTWROS ? 'text' : 'number'}
                    value={isJTWROS ? `${(100 / (investors.length + 1)).toFixed(2)}%` : newPercent}
                    onChange={(e) => !isJTWROS && setNewPercent(e.target.value)}
                    disabled={isJTWROS}
                    placeholder="%"
                    min="0"
                    max="100"
                    className="w-20 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm text-right bg-white/5 text-pw-black disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="$0"
                    min="0"
                    className="w-24 px-3 py-1.5 rounded-sm border border-pw-border focus:ring-1 focus:ring-pw-accent/50 focus:outline-none text-sm text-right bg-white/5 text-pw-black"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={handleAdd}
                    className="pw-interactive pw-btn pw-btn--primary pw-btn--sm py-1.5 px-3 text-xs font-semibold uppercase tracking-wider"
                  >
                    Add
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setShowAddRow(false); setNewName(''); setNewEmail(''); setNewPercent(''); setNewAmount(''); }}
                    className="p-1 text-pw-muted hover:text-pw-black transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-4 border-t border-pw-border flex items-center justify-between bg-surface-container-highest/20 backdrop-blur-sm">
        <div className="text-sm text-pw-muted font-body-sm">
          <span className="font-semibold text-pw-black">${totalContribution.toLocaleString()}</span> total capital committed
        </div>
        {!showAddRow && (
          <button
            onClick={() => setShowAddRow(true)}
            className="pw-interactive pw-btn pw-btn--secondary pw-btn--sm text-xs font-semibold uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5 mr-1 inline-block" /> Add Investor
          </button>
        )}
      </div>
    </div>
  );
}
