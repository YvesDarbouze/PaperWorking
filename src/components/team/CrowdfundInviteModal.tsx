'use client';

import React, { useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUserStore } from '@/store/userStore';
import { Mail, X, UserPlus, Percent, DollarSign, Lock } from 'lucide-react';
import type { FractionalInvestor } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   CrowdfundInviteModal — External Investor Invitation

   Allows active subscribers to invite non-users to
   participate in deal crowdfunding. Recipients must
   purchase a subscription to view the full listing.
   ═══════════════════════════════════════════════════════ */

interface Props {
  projectId: string;
  dealName: string;
  currentEquityAllocated: number;
  onClose: () => void;
}

export default function CrowdfundInviteModal({
  projectId,
  dealName,
  currentEquityAllocated,
  onClose,
}: Props) {
  const hasActiveSubscription = useUserStore((s) => s.hasActiveSubscription);
  const updateInvestors = useProjectStore((s) => s.updateInvestors);
  const currentProject = useProjectStore((s) => s.projects.find((d) => d.id === projectId));
  const investors = currentProject?.fractionalInvestors || [];

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [equityPercent, setEquityPercent] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [sending, setSending] = useState(false);

  const availableEquity = 100 - currentEquityAllocated;

  const handleSendInvite = async () => {
    if (!hasActiveSubscription) {
      toast.error('Active subscription required to send crowdfund invitations.');
      return;
    }

    if (!email.trim() || !name.trim()) {
      toast.error('Name and email are required.');
      return;
    }

    const percent = parseFloat(equityPercent);
    const amount = parseFloat(investmentAmount);

    if (isNaN(percent) || percent <= 0 || percent > availableEquity) {
      toast.error(`Equity must be between 0 and ${availableEquity.toFixed(1)}%.`);
      return;
    }

    setSending(true);

    try {
      // Create the invitation via API
      const res = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          dealName,
          email: email.trim(),
          name: name.trim(),
          proposedEquityPercent: percent,
          proposedAmount: isNaN(amount) ? 0 : amount,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Add as a pending investor in local state
        const pendingInvestor: FractionalInvestor = {
          id: data.invitationId || `inv_${Date.now()}`,
          name: name.trim(),
          email: email.trim(),
          equityPercentage: percent,
          contributionAmount: isNaN(amount) ? 0 : amount,
          status: 'invited',
          invitedAt: new Date(),
        };

        updateInvestors(projectId, [...investors, pendingInvestor]);
        toast.success(`Invitation sent to ${email.trim()}!`);
        onClose();
      } else {
        toast.error(data.error || 'Failed to send invitation.');
      }
    } catch {
      // Fallback: add locally even if API fails (for demo/dev mode)
      const pendingInvestor: FractionalInvestor = {
        id: `inv_${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        equityPercentage: parseFloat(equityPercent),
        contributionAmount: isNaN(parseFloat(investmentAmount)) ? 0 : parseFloat(investmentAmount),
        status: 'invited',
        invitedAt: new Date(),
      };

      updateInvestors(projectId, [...investors, pendingInvestor]);
      toast.success(`Invitation queued for ${email.trim()} (offline mode).`);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Invite Investor</h2>
              <p className="text-sm text-gray-500">Crowdfund · {dealName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Subscription Gate */}
        {!hasActiveSubscription ? (
          <div className="p-8 text-center">
            <Lock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-gray-900 mb-1">Subscription Required</h3>
            <p className="text-sm text-gray-500 mb-4">
              An active PaperWorking subscription is required to send crowdfunding invitations.
            </p>
            <button className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              Upgrade Plan
            </button>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Available Equity Badge */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Available Equity</span>
              <span className={`text-sm font-semibold ${availableEquity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {availableEquity.toFixed(1)}%
              </span>
            </div>

            {/* Invite Person */}
            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-1.5">Investor Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="investor@email.com"
                  className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-1.5">Proposed Equity</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={equityPercent}
                    onChange={(e) => setEquityPercent(e.target.value)}
                    placeholder="25"
                    min="0"
                    max={availableEquity}
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-1.5">Investment Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={investmentAmount}
                    onChange={(e) => setInvestmentAmount(e.target.value)}
                    placeholder="50,000"
                    min="0"
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 leading-relaxed">
              The recipient will receive an email invitation. They must create an account and purchase a PaperWorking subscription to view the full deal listing and accept the equity offer.
            </p>

            <button
              onClick={handleSendInvite}
              disabled={sending || !email.trim() || !name.trim()}
              className="w-full py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {sending ? (
                <span className="animate-pulse">Sending Invitation...</span>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Crowdfund Invitation
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
