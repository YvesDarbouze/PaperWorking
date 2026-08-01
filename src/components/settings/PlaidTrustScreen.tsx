'use client';

import React from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Home,
  Lock,
  Unlink,
  X,
  Landmark,
} from 'lucide-react';

interface PlaidTrustScreenProps {
  /** Called when user confirms they want to proceed to Plaid Link */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Whether the confirm CTA is in a loading state (generating link token) */
  loading?: boolean;
}

const TRUST_BULLETS = [
  {
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    title: 'Identify rent deposits automatically',
    desc: 'We detect incoming tenant payments and match them to your projects so you never miss a deposit.',
  },
  {
    icon: Home,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    title: 'Categorize property expenses',
    desc: 'Taxes, insurance, repairs, HOA fees, and utilities are auto-tagged to the right project.',
  },
  {
    icon: Landmark,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    title: 'Track mortgage balance & DSCR',
    desc: 'Outstanding balance, next payment, YTD interest, and escrow are synced every 6 hours.',
  },
  {
    icon: Lock,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    title: 'We never store your bank password',
    desc: 'PaperWorking uses Plaid — a read-only, bank-grade secure connection. Your credentials stay with your bank.',
  },
] as const;

/**
 * PlaidTrustScreen
 *
 * Full-screen overlay modal shown every time a user initiates a new Plaid
 * bank connection. Explains what data PaperWorking requests and why, before
 * the Plaid Link flow opens. Per spec: show on every connect attempt.
 */
export function PlaidTrustScreen({ onConfirm, onCancel, loading = false }: PlaidTrustScreenProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trust-screen-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">

          {/* Close button */}
          <button
            onClick={onCancel}
            aria-label="Close"
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2
                  id="trust-screen-title"
                  className="text-[15px] font-bold text-slate-900 leading-tight"
                >
                  Why PaperWorking needs your bank data
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Read-only · Bank-grade encryption · Disconnect anytime
                </p>
              </div>
            </div>
          </div>

          {/* Trust bullets */}
          <div className="px-6 py-5 space-y-3">
            {TRUST_BULLETS.map(({ icon: Icon, color, bg, border, title, desc }) => (
              <div
                key={title}
                className={`flex items-start gap-3 p-3 rounded-xl border ${bg} ${border}`}
              >
                <div className={`w-7 h-7 rounded-lg ${bg} border ${border} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800 leading-tight">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Data Transparency Messaging footer */}
          <div className="px-6 pb-3">
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              <strong className="font-medium text-slate-500">PaperWorking requests:</strong>{' '}
              Account info, Transactions, Credit &amp; Loans
              <br />
              Use case: <em>Track real estate investment performance</em>
            </p>
          </div>

          {/* Disconnect note */}
          <div className="px-6 pb-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Unlink className="w-3 h-3" />
            <span>You can disconnect your bank at any time from Settings → Integrations</span>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              id="plaid-trust-confirm"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Connecting…
                </>
              ) : (
                'Continue to Bank Link'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
