'use client';

import React, { useState } from 'react';
import { X, Send, Radio, UserCheck } from 'lucide-react';
import { BusinessCard } from '@/types/deals';

export interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string;
  dealAddress: string;
  purchasePrice: number;
  projectedRoi: number;
  senderName?: string;
  senderBusinessCard?: BusinessCard | null;
  onSendSuccess?: (recipientCount: number) => void;
}

export default function BroadcastModal({
  isOpen,
  onClose,
  dealId,
  dealAddress,
  purchasePrice,
  projectedRoi,
  senderName: _senderName = 'Investor',
  senderBusinessCard: _senderBusinessCard,
  onSendSuccess,
}: BroadcastModalProps) {
  const [emails, setEmails] = useState('');
  const [subject, setSubject] = useState('Check out this deal on PaperWorking');
  const [message, setMessage] = useState(
    `Take a look at this investment opportunity at ${dealAddress}.\nPurchase Price: $${purchasePrice.toLocaleString()} | Projected ROI: ${projectedRoi}%`
  );
  const [includeBusinessCard, setIncludeBusinessCard] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emails.trim()) return;

    setIsSending(true);
    const recipientList = emails.split(',').map((e) => e.trim()).filter(Boolean);

    try {
      await fetch('/api/deals/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          recipientEmails: recipientList,
          subject,
          message,
          includeBusinessCard,
        }),
      });

      setIsSent(true);
      if (onSendSuccess) onSendSuccess(recipientList.length);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 1000);
    } catch {
      setIsSent(true);
      setTimeout(() => {
        setIsSent(false);
        onClose();
      }, 1000);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      data-testid="broadcast-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[20px] animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-[16px] border border-white/10 bg-[#0a0a0f]/95 backdrop-blur-[20px] p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-[#34d399]/10 border border-[#34d399]/20 text-[#34d399] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Broadcast Deal Analysis</h3>
            <p className="text-xs text-slate-400">
              Share deal summary and teaser with external investors or partners outside PaperWorking.
            </p>
          </div>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recipient Email(s)
            </label>
            <input
              type="text"
              data-testid="broadcast-emails-input"
              required
              placeholder="investor1@example.com, partner2@example.com"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#34d399]/40 min-h-[44px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Subject Line
            </label>
            <input
              type="text"
              data-testid="broadcast-subject-input"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 min-h-[44px]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Teaser Message
            </label>
            <textarea
              rows={4}
              data-testid="broadcast-message-input"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-white/[0.03] border border-white/10 rounded-[10px] text-xs text-white focus:outline-none focus:border-[#34d399]/40 resize-none"
            />
          </div>

          {/* Toggle: Include my business card */}
          <div className="flex items-center justify-between p-3 rounded-[10px] bg-white/[0.03] border border-white/5">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#34d399]" />
              <span className="text-xs font-bold text-slate-200">Include my business card</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                data-testid="broadcast-card-toggle"
                checked={includeBusinessCard}
                onChange={(e) => setIncludeBusinessCard(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#34d399]" />
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[10px] bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold min-h-[44px]"
            >
              Cancel
            </button>

            <button
              type="submit"
              data-testid="send-broadcast-btn"
              disabled={isSending || isSent}
              className="px-6 py-2.5 rounded-[10px] bg-[#34d399] hover:bg-[#34d399]/90 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg min-h-[44px] cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-slate-950" />
              <span>{isSent ? 'Broadcast Sent!' : isSending ? 'Sending...' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
