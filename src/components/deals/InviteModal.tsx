'use client';

import React, { useState } from 'react';
import { Mail, UserCheck, Send, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealAddress: string;
  creatorName?: string;
  onInviteSent?: (invitations: Record<string, unknown>[]) => void;
}

export default function InviteModal({
  isOpen,
  onClose,
  dealId,
  dealAddress,
  creatorName: _creatorName = 'Current Investor',
  onInviteSent,
}: InviteModalProps) {
  const [emailsInput, setEmailsInput] = useState('');
  const [shareBusinessCard, setShareBusinessCard] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawEmails = emailsInput
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (rawEmails.length === 0) {
      setError('Please enter at least one valid email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = rawEmails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setError(`Invalid email address: ${invalidEmails.join(', ')}`);
      return;
    }

    setIsSubmitting(true);

    const createdInvitations = rawEmails.map((email, idx) => ({
      id: `inv_${Date.now()}_${idx}`,
      dealId,
      creatorId: 'user_current',
      inviteeEmail: email,
      status: 'pending',
      shareBusinessCard,
      message: message.slice(0, 500),
      createdAt: new Date().toISOString(),
    }));

    setTimeout(() => {
      setIsSubmitting(false);
      setSentSuccess(true);
      if (onInviteSent) onInviteSent(createdInvitations);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    }, 400);
  };

  return (
    <div
      data-testid="invite-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[20px] animate-fade-in"
    >
      <div
        data-testid="invite-modal-content"
        className="rounded-[16px] border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-[20px] shadow-2xl w-full max-w-lg p-6 space-y-5 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[8px] bg-[#34d399]/15 border border-[#34d399]/30 flex items-center justify-center text-[#34d399]">
              <Mail className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Invite Investors to Deal</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-[8px] hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 font-mono">
          Deal: <strong className="text-slate-200">{dealAddress}</strong>
        </p>

        {sentSuccess ? (
          <div data-testid="invite-success-banner" className="p-6 text-center space-y-2 bg-[#34d399]/10 rounded-[12px] border border-[#34d399]/30">
            <CheckCircle2 className="w-8 h-8 text-[#34d399] mx-auto" />
            <h3 className="text-sm font-bold text-white">Invitations Sent!</h3>
            <p className="text-xs text-slate-300">
              Tokenized deal invitation links have been emailed successfully.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Investor Email Addresses (comma-separated)
              </label>
              <textarea
                data-testid="invite-emails-input"
                rows={2}
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="investor1@example.com, partner@fund.com"
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs font-mono text-slate-100 focus:outline-none focus:border-[#34d399]/40 resize-none min-h-[44px]"
              />
            </div>

            {/* Glass Switch Component: Share my business card (default ON) */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-white/[0.03] border border-white/5">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-[#34d399]" />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Share my business card</span>
                  <span className="text-[10px] text-slate-400">Includes contact info & credentials</span>
                </div>
              </div>
              <button
                type="button"
                data-testid="share-card-toggle"
                onClick={() => setShareBusinessCard(!shareBusinessCard)}
                className={`w-11 h-6 rounded-full transition-colors p-0.5 relative cursor-pointer border ${
                  shareBusinessCard ? 'bg-[#34d399]/30 border-[#34d399]/50' : 'bg-white/10 border-white/10'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full transition-transform ${
                    shareBusinessCard ? 'translate-x-5 bg-[#34d399]' : 'translate-x-0 bg-slate-400'
                  }`}
                />
              </button>
            </div>

            {/* Personal Message Textarea (max 500 chars) */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <label className="font-bold uppercase tracking-wider">Personal Message (Optional)</label>
                <span className="font-mono">{message.length}/500</span>
              </div>
              <textarea
                data-testid="invite-message-textarea"
                rows={3}
                maxLength={500}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Join me in reviewing this high-ROI deal..."
                className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-slate-100 focus:outline-none focus:border-[#34d399]/40 resize-none"
              />
            </div>

            {error && (
              <div data-testid="invite-error-msg" className="p-3 rounded-[10px] bg-red-950/40 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-[10px] bg-[#34d399]/[0.08] border border-[#34d399]/25 hover:bg-[#34d399]/15 text-[#34d399] text-xs font-bold uppercase transition-colors min-h-[44px]"
              >
                Cancel
              </button>

              <button
                type="submit"
                data-testid="send-invites-button"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg min-h-[44px] cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-slate-950" />
                <span>Send Invitations</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
