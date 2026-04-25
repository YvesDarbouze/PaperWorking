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
  'bg-indigo-600', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-cyan-500', 'bg-purple-500', 'bg-orange-400', 'bg-teal-500',
];

interface Props {
  projectId: string;
}

export default function InvestorEquityTable({ projectId }: Props) {
  const currentProject = useProjectStore((s) => s.projects.find((d) => d.id === projectId));
  const updateInvestors = useProjectStore((s) => s.updateInvestors);
  const investors = currentProject?.fractionalInvestors || [];

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
    const percent = parseFloat(newPercent);
    const amount = parseFloat(newAmount);

    if (!newName.trim() || !newEmail.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    if (isNaN(percent) || percent <= 0 || percent > 100) {
      toast.error('Equity must be between 0 and 100%.');
      return;
    }
    if (totalEquity + percent > 100) {
      toast.error(`Cannot exceed 100% equity. ${(100 - totalEquity).toFixed(1)}% available.`);
      return;
    }

    const newInvestor: FractionalInvestor = {
      id: `inv_${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      equityPercentage: percent,
      contributionAmount: isNaN(amount) ? 0 : amount,
      status: 'confirmed',
      confirmedAt: new Date(),
    };

    updateInvestors(projectId, [...investors, newInvestor]);
    toast.success(`${newInvestor.name} added with ${percent}% equity.`);
    setNewName('');
    setNewEmail('');
    setNewPercent('');
    setNewAmount('');
    setShowAddRow(false);
  };

  const handleRemove = (investorId: string) => {
    updateInvestors(
      projectId,
      investors.filter((inv) => inv.id !== investorId)
    );
    toast.success('Investor removed.');
  };

  return (
    <div className="bg-bg-surface rounded-xl border border-border-accent shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            Investor Equity Table
          </h3>
          <p className="text-sm text-text-secondary mt-0.5">Cap table for this deal.</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Allocated</p>
          <p className={`text-lg font-light ${totalEquity > 100 ? 'text-red-600' : 'text-text-primary'}`}>
            {totalEquity.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Stacked Equity Bar */}
      {investors.length > 0 && (
        <div className="mx-6 mb-4">
          <div className="w-full h-6 bg-bg-primary rounded-full overflow-hidden flex">
            {investors.map((inv, i) => (
              <div
                key={inv.id}
                className={`${EQUITY_COLORS[i % EQUITY_COLORS.length]} transition-all duration-500 flex items-center justify-center`}
                style={{ width: `${inv.equityPercentage}%` }}
                title={`${inv.name}: ${inv.equityPercentage}%`}
              >
                {inv.equityPercentage >= 8 && (
                  <span className="text-xs font-bold text-white truncate px-1">
                    {inv.equityPercentage}%
                  </span>
                )}
              </div>
            ))}
            {totalEquity < 100 && (
              <div
                className="bg-bg-primary flex items-center justify-center"
                style={{ width: `${100 - totalEquity}%` }}
              >
                <span className="text-xs text-text-secondary font-medium">
                  {(100 - totalEquity).toFixed(1)}% unallocated
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border-t border-border-accent">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-bg-primary/80">
              <th className="px-6 py-3 text-xs font-bold text-text-secondary uppercase tracking-widest">Investor</th>
              <th className="px-6 py-3 text-xs font-bold text-text-secondary uppercase tracking-widest text-right">Equity %</th>
              <th className="px-6 py-3 text-xs font-bold text-text-secondary uppercase tracking-widest text-right">Contribution</th>
              <th className="px-6 py-3 text-xs font-bold text-text-secondary uppercase tracking-widest text-right">Status</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {investors.map((inv, i) => (
              <tr key={inv.id} className="hover:bg-bg-primary/50 transition">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        EQUITY_COLORS[i % EQUITY_COLORS.length]
                      }`}
                    >
                      {inv.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">{inv.name}</p>
                      <p className="text-xs text-text-secondary">{inv.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span className="text-sm font-medium text-text-primary flex items-center justify-end gap-1">
                    <Percent className="w-3 h-3 text-text-secondary" />
                    {inv.equityPercentage.toFixed(1)}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span className="text-sm font-medium text-text-primary flex items-center justify-end gap-1">
                    <DollarSign className="w-3 h-3 text-text-secondary" />
                    {inv.contributionAmount.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      inv.status === 'confirmed'
                        ? 'bg-green-50 text-green-700'
                        : inv.status === 'invited'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => handleRemove(inv.id)}
                    className="p-1 rounded hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
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
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">No investors assigned to this deal yet.</p>
                </td>
              </tr>
            )}

            {/* Add Investor Row */}
            {showAddRow && (
              <tr className="bg-indigo-50/30">
                <td className="px-6 py-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Name"
                      className="w-28 border border-border-accent rounded px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email"
                      className="w-36 border border-border-accent rounded px-2 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={newPercent}
                    onChange={(e) => setNewPercent(e.target.value)}
                    placeholder="%"
                    min="0"
                    max="100"
                    className="w-16 border border-border-accent rounded px-2 py-1.5 text-xs text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    placeholder="$0"
                    min="0"
                    className="w-24 border border-border-accent rounded px-2 py-1.5 text-xs text-right focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={handleAdd}
                    className="px-3 py-1.5 bg-black text-white text-sm font-medium rounded hover:bg-gray-800 transition"
                  >
                    Add
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setShowAddRow(false); setNewName(''); setNewEmail(''); setNewPercent(''); setNewAmount(''); }}
                    className="p-1 text-text-secondary hover:text-text-secondary"
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
      <div className="px-6 py-4 border-t border-border-accent flex items-center justify-between bg-bg-primary/40">
        <div className="text-sm text-text-secondary">
          <span className="font-semibold text-text-primary">${totalContribution.toLocaleString()}</span> total capital committed
        </div>
        {!showAddRow && (
          <button
            onClick={() => setShowAddRow(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition"
          >
            <Plus className="w-3 h-3" /> Add Investor
          </button>
        )}
      </div>
    </div>
  );
}
