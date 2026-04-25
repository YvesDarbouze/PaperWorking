'use client';

import React from 'react';
import { X, Mail, DollarSign, Percent, FileText, UserPlus } from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   InvestorInviteDrawer — Slide-out Investor Invite

   Slides in from right edge with fields for:
   • Investor email & name
   • Target pledge amount
   • Equity split percentage
   • Interest rate
   • Custom terms
   ═══════════════════════════════════════════════════════ */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (data: {
    name: string;
    email: string;
    pledgeAmount: number;
    equitySplit: number;
    interestRate: number;
    customTerms: string;
  }) => void;
  dealName: string;
}

export default function InvestorInviteDrawer({ isOpen, onClose, onInvite, dealName }: Props) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pledgeAmount, setPledgeAmount] = React.useState('');
  const [equitySplit, setEquitySplit] = React.useState('');
  const [interestRate, setInterestRate] = React.useState('');
  const [customTerms, setCustomTerms] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    setSending(true);
    // Simulate a small delay
    await new Promise(r => setTimeout(r, 600));
    onInvite({
      name: name.trim(),
      email: email.trim(),
      pledgeAmount: parseFloat(pledgeAmount) || 0,
      equitySplit: parseFloat(equitySplit) || 0,
      interestRate: parseFloat(interestRate) || 0,
      customTerms: customTerms.trim(),
    });
    setSending(false);
    // Reset form
    setName('');
    setEmail('');
    setPledgeAmount('');
    setEquitySplit('');
    setInterestRate('');
    setCustomTerms('');
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-[95] h-full w-full max-w-md bg-bg-surface shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-accent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-full flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Invite Investor</h2>
              <p className="text-xs text-text-secondary">{dealName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-primary transition">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {/* Name */}
          <div>
            <label className="ag-label mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full border border-border-accent rounded-xl px-4 py-3 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="ag-label mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="investor@email.com"
                className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>
          </div>

          {/* Financial Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ag-label mb-1.5 block">Pledge Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="number"
                  value={pledgeAmount}
                  onChange={(e) => setPledgeAmount(e.target.value)}
                  placeholder="50,000"
                  className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>
            <div>
              <label className="ag-label mb-1.5 block">Equity Split</label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="number"
                  value={equitySplit}
                  onChange={(e) => setEquitySplit(e.target.value)}
                  placeholder="25"
                  min="0"
                  max="100"
                  className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Interest Rate */}
          <div>
            <label className="ag-label mb-1.5 block">Annual Interest Rate (%)</label>
            <div className="relative">
              <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="8"
                step="0.5"
                className="w-full pl-10 pr-4 py-3 border border-border-accent rounded-xl text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
              />
            </div>
          </div>

          {/* Custom Terms */}
          <div>
            <label className="ag-label mb-1.5 block">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3 h-3" />
                Custom Terms & Notes
              </span>
            </label>
            <textarea
              value={customTerms}
              onChange={(e) => setCustomTerms(e.target.value)}
              placeholder="Any additional terms, conditions, or notes for this investor..."
              rows={4}
              className="w-full border border-border-accent rounded-xl px-4 py-3 text-sm resize-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
            />
          </div>

          {/* Info */}
          <p className="text-xs text-text-secondary leading-relaxed">
            The investor will receive an email invitation with a secure link to review the deal terms and digitally sign the Letter of Intent.
          </p>
        </div>

        {/* Footer CTA */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-bg-surface border-t border-border-accent">
          <button
            onClick={handleSubmit}
            disabled={sending || !name.trim() || !email.trim()}
            className="w-full py-3.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:bg-gray-200 disabled:text-text-secondary disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {sending ? (
              <span className="animate-pulse">Sending Invitation…</span>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                Send Invitation & Generate LOI
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
