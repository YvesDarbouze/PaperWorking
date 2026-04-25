'use client';

import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import {
  HandCoins, ChevronDown, ChevronUp, Clock, CheckCircle2,
  XCircle, AlertTriangle, DollarSign, Percent, UserCheck,
  ShieldCheck, ShieldX, Plus, X, Mail, Calendar,
} from 'lucide-react';
import type { FundingPledge, PledgeStatus } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   PledgeTracker — Investor Commitment Manager

   Two views:
   1. Investor View — Deal summary, deadline, "Commit"
   2. Deal Lead View — Table of all pledges with
      Confirm / Reject actions
   ═══════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<PledgeStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  committed: { label: 'Committed', color: 'text-blue-600', bg: 'bg-blue-50', icon: HandCoins },
  confirmed: { label: 'Confirmed', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-500', bg: 'bg-red-50', icon: XCircle },
};

export default function PledgeTracker() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const updatePledges = useProjectStore((s) => s.updatePledges);
  const pledges = currentProject?.pledges || [];

  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formEquity, setFormEquity] = useState('');
  const [formDeadlineDays, setFormDeadlineDays] = useState('14');

  const stats = useMemo(() => {
    const totalPledged = pledges.reduce((s, p) => s + p.pledgeAmount, 0);
    const confirmed = pledges.filter((p) => p.status === 'confirmed');
    const confirmedAmount = confirmed.reduce((s, p) => s + p.pledgeAmount, 0);
    const pending = pledges.filter((p) => p.status === 'pending' || p.status === 'committed');
    return { totalPledged, confirmedAmount, confirmedCount: confirmed.length, pendingCount: pending.length, total: pledges.length };
  }, [pledges]);

  const handleAddPledge = () => {
    if (!formEmail.trim() || !formName.trim()) {
      toast.error('Email and name are required.');
      return;
    }
    const amount = parseFloat(formAmount);
    const equity = parseFloat(formEquity);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Valid pledge amount is required.');
      return;
    }

    const now = new Date();
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + (parseInt(formDeadlineDays) || 14));

    const pledge: FundingPledge = {
      id: `plg_${Date.now()}`,
      prospectId: currentProject?.id || '',
      investorEmail: formEmail.trim(),
      investorName: formName.trim(),
      pledgeAmount: amount,
      pledgeEquity: isNaN(equity) ? 0 : equity,
      pledgedAt: now,
      deadline,
      status: 'pending',
    };

    if (currentProject) {
      updatePledges(currentProject.id, [...pledges, pledge]);
      toast.success(`Pledge from ${formName.trim()} recorded.`);
    }
    setFormEmail('');
    setFormName('');
    setFormAmount('');
    setFormEquity('');
    setShowAddForm(false);
  };

  const updatePledgeStatus = (id: string, status: PledgeStatus) => {
    if (!currentProject) return;
    const updated = pledges.map((p) =>
      p.id === id
        ? {
            ...p,
            status,
            ...(status === 'confirmed' ? { confirmedAt: new Date() } : {}),
            ...(status === 'rejected' ? { rejectedAt: new Date() } : {}),
          }
        : p
    );
    updatePledges(currentProject.id, updated);
    toast.success(`Pledge ${status}.`);
  };

  const removePledge = (id: string) => {
    if (!currentProject) return;
    updatePledges(currentProject.id, pledges.filter((p) => p.id !== id));
  };

  const getDaysRemaining = (deadline: Date) => {
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  };

  return (
    <section className="rounded-2xl border border-border-accent bg-bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-bg-primary/60 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-pw-subtle/30 flex items-center justify-center">
            <HandCoins className="w-4.5 h-4.5 text-text-secondary" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-text-primary tracking-tight">Pledge Tracker</h2>
            <p className="text-sm text-text-secondary">
              {stats.total} pledge{stats.total !== 1 ? 's' : ''} · {stats.confirmedCount} confirmed · {stats.pendingCount} pending
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
      </button>

      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Summary Badges */}
          {pledges.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-bg-primary rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Total Pledged</p>
                <p className="text-lg font-semibold text-text-primary mt-0.5">${stats.totalPledged.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg px-4 py-3">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Confirmed</p>
                <p className="text-lg font-semibold text-emerald-700 mt-0.5">${stats.confirmedAmount.toLocaleString()}</p>
              </div>
              <div className="bg-amber-50 rounded-lg px-4 py-3 col-span-2 md:col-span-1">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Awaiting Action</p>
                <p className="text-lg font-semibold text-amber-700 mt-0.5">{stats.pendingCount} pledge{stats.pendingCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          )}

          {/* Pledge Table */}
          {pledges.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-accent">
                    {['Investor', 'Amount', 'Equity', 'Deadline', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-text-secondary uppercase tracking-widest py-2 px-2">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pledges.map((pledge) => {
                    const cfg = STATUS_CONFIG[pledge.status];
                    const StatusIcon = cfg.icon;
                    const daysLeft = getDaysRemaining(pledge.deadline);
                    const urgent = daysLeft <= 3 && (pledge.status === 'pending' || pledge.status === 'committed');

                    return (
                      <tr key={pledge.id} className="border-b border-gray-50 hover:bg-bg-primary/50 transition group">
                        <td className="py-3 px-2">
                          <div>
                            <p className="font-medium text-text-primary">{pledge.investorName}</p>
                            <p className="text-xs text-text-secondary">{pledge.investorEmail}</p>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-semibold text-text-primary">${pledge.pledgeAmount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-text-secondary">{pledge.pledgeEquity > 0 ? `${pledge.pledgeEquity}%` : '—'}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            {urgent && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            <span className={`text-xs ${urgent ? 'text-red-500 font-bold' : 'text-text-secondary'}`}>
                              {daysLeft}d left
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                            <StatusIcon className="w-3 h-3" /> {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            {/* Investor action: Commit */}
                            {pledge.status === 'pending' && (
                              <button
                                onClick={() => updatePledgeStatus(pledge.id, 'committed')}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition"
                              >
                                <UserCheck className="w-3 h-3" /> Commit
                              </button>
                            )}
                            {/* Deal Lead actions: Confirm / Reject */}
                            {(pledge.status === 'committed' || pledge.status === 'pending') && (
                              <>
                                <button
                                  onClick={() => updatePledgeStatus(pledge.id, 'confirmed')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition"
                                >
                                  <ShieldCheck className="w-3 h-3" /> Confirm
                                </button>
                                <button
                                  onClick={() => updatePledgeStatus(pledge.id, 'rejected')}
                                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition"
                                >
                                  <ShieldX className="w-3 h-3" /> Reject
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => removePledge(pledge.id)}
                              className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Add Pledge Form */}
          {showAddForm ? (
            <div className="border border-border-accent rounded-xl p-5 space-y-3 bg-bg-primary/40">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Record Investor Pledge</h3>
                <button onClick={() => setShowAddForm(false)} className="p-1 rounded hover:bg-gray-200 text-text-secondary transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Investor Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full border border-border-accent rounded-lg px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="investor@email.com"
                      className="w-full border border-border-accent rounded-lg pl-9 pr-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Pledge Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="25,000"
                      className="w-full border border-border-accent rounded-lg pl-9 pr-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Equity %</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
                    <input
                      type="number"
                      value={formEquity}
                      onChange={(e) => setFormEquity(e.target.value)}
                      placeholder="10"
                      className="w-full border border-border-accent rounded-lg pl-9 pr-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">
                    <Calendar className="w-3 h-3 inline mr-1" />Deadline (days from now)
                  </label>
                  <input
                    type="number"
                    value={formDeadlineDays}
                    onChange={(e) => setFormDeadlineDays(e.target.value)}
                    placeholder="14"
                    min="1"
                    className="w-full border border-border-accent rounded-lg px-3 py-2 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleAddPledge}
                disabled={!formEmail.trim() || !formName.trim() || !formAmount}
                className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                Record Pledge
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition font-medium"
            >
              <Plus className="w-4 h-4" /> Record Pledge
            </button>
          )}
        </div>
      )}
    </section>
  );
}
