'use client';

import React, { useState } from 'react';
import {
  FileSignature, Plus, X, DollarSign, Calendar, User, Send,
  RotateCcw, Check, Clock, Ban,
} from 'lucide-react';
import type { OfferLetter, OfferLetterStatus } from '@/types/schema';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   OfferLetterGenerator — Inline Offer Tracking
   Compact form for generating and tracking offer letters
   sent outside the SaaS platform.
   ═══════════════════════════════════════════════════════ */

const STATUS_BADGES: Record<OfferLetterStatus, { bg: string; text: string; icon: React.ElementType }> = {
  Draft: { bg: 'bg-gray-100', text: 'text-gray-600', icon: Clock },
  Sent: { bg: 'bg-blue-50', text: 'text-blue-600', icon: Send },
  Countered: { bg: 'bg-amber-50', text: 'text-amber-600', icon: RotateCcw },
  Accepted: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: Check },
  Expired: { bg: 'bg-red-50', text: 'text-red-500', icon: Clock },
  Withdrawn: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Ban },
};

const STATUS_TRANSITIONS: Record<OfferLetterStatus, OfferLetterStatus[]> = {
  Draft: ['Sent', 'Withdrawn'],
  Sent: ['Countered', 'Accepted', 'Expired', 'Withdrawn'],
  Countered: ['Sent', 'Accepted', 'Withdrawn'],
  Accepted: [],
  Expired: [],
  Withdrawn: [],
};

interface Props {
  letters: OfferLetter[];
  onUpdate: (letters: OfferLetter[]) => void;
}

export default function OfferLetterGenerator({ letters, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [expiresIn, setExpiresIn] = useState('10'); // days
  const [notes, setNotes] = useState('');

  const handleCreate = () => {
    if (!recipient.trim()) {
      toast.error('Recipient name is required.');
      return;
    }
    const offerAmt = parseFloat(amount);
    if (isNaN(offerAmt) || offerAmt <= 0) {
      toast.error('Valid offer amount is required.');
      return;
    }

    const now = new Date();
    const expDays = parseInt(expiresIn) || 10;
    const exp = new Date(now);
    exp.setDate(exp.getDate() + expDays);

    const letter: OfferLetter = {
      id: `ofl_${Date.now()}`,
      recipientName: recipient.trim(),
      offerAmount: offerAmt,
      sentDate: now,
      expiresDate: exp,
      status: 'Draft',
      notes: notes.trim(),
    };

    onUpdate([...letters, letter]);
    toast.success('Offer letter created.');
    setRecipient('');
    setAmount('');
    setNotes('');
    setShowForm(false);
  };

  const updateStatus = (id: string, newStatus: OfferLetterStatus) => {
    onUpdate(
      letters.map((l) =>
        l.id === id ? { ...l, status: newStatus } : l
      )
    );
    toast.success(`Status → ${newStatus}`);
  };

  const removeLetter = (id: string) => {
    onUpdate(letters.filter((l) => l.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Existing Letters */}
      {letters.map((letter) => {
        const badge = STATUS_BADGES[letter.status];
        const Icon = badge.icon;
        const transitions = STATUS_TRANSITIONS[letter.status];

        return (
          <div
            key={letter.id}
            className="flex items-center justify-between bg-white border border-gray-100 rounded-lg px-4 py-3 hover:border-gray-200 transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 w-7 h-7 rounded-md ${badge.bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${badge.text}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {letter.recipientName} · ${letter.offerAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  Expires {new Date(letter.expiresDate).toLocaleDateString()}
                  {letter.notes && ` · ${letter.notes}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Status transitions */}
              {transitions.map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(letter.id, s)}
                  className="px-2 py-1 text-xs font-semibold rounded-md bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                  title={`Mark as ${s}`}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => removeLetter(letter.id)}
                className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Create Form */}
      {showForm ? (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-700">New Offer Letter</h4>
            <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-200 text-gray-400 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Recipient</label>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Seller Name"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Offer Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="185,000"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Expires (days)</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  placeholder="10"
                  min="1"
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
                />
              </div>
            </div>
          </div>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes (e.g., contingencies, counter terms)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition"
          />

          <button
            onClick={handleCreate}
            disabled={!recipient.trim() || !amount}
            className="w-full py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-1.5"
          >
            <FileSignature className="w-3.5 h-3.5" /> Create Offer Letter
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> New Offer Letter
        </button>
      )}
    </div>
  );
}
