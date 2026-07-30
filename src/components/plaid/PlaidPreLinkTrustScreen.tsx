'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  X,
  Landmark,
  TrendingUp,
  PiggyBank,
  Wrench,
  Lock,
  Ban,
  Share2,
  ArrowRight,
  PenLine,
  RefreshCw,
} from 'lucide-react';

/* ─── Purpose config ─────────────────────────────────────────── */
type ConnectionPurpose =
  | 'RENT_COLLECTION'
  | 'OPERATING_EXPENSES'
  | 'MORTGAGE_LIABILITY'
  | 'RESERVE_ACCOUNT'
  | 'CAPX_ACCOUNT';

interface PurposeConfig {
  headline: string;
  subheadline: string;
  features: { icon: React.ElementType; label: string; desc: string; color: string; bg: string }[];
  connectCta: string;
  reconnectCta: string;
}

const PURPOSE_CONFIG: Record<ConnectionPurpose, PurposeConfig> = {
  RENT_COLLECTION: {
    headline: 'Track Rent Deposits Automatically',
    subheadline: 'Connect your rent deposit account so PaperWorking can detect incoming tenant payments and match them to your projects.',
    features: [
      { icon: TrendingUp, label: 'Rent Detection',     desc: 'Incoming payments are auto-matched to your leases and tenants.',               color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
      { icon: Landmark,   label: 'Balance Tracking',   desc: 'See your rent account balance alongside your investment KPIs.',                 color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
      { icon: ShieldCheck,label: 'Transaction History', desc: 'Up to 2 years of history imported on first connect for baseline analysis.',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    ],
    connectCta: 'Connect Rent Collection Account',
    reconnectCta: 'Reconnect Rent Account',
  },
  OPERATING_EXPENSES: {
    headline: 'Auto-Categorize Property Expenses',
    subheadline: 'Connect your operating account to automatically tag taxes, insurance, repairs, utilities, and management fees to the right project.',
    features: [
      { icon: Wrench,     label: 'Expense Categorization', desc: 'Repairs, HOA, insurance, and utilities are auto-tagged by AI.',           color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
      { icon: TrendingUp, label: 'NOI & Cap Rate',         desc: 'Every expense updates your NOI, cap rate, and OER in real time.',          color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
      { icon: ShieldCheck,label: 'Audit Trail',            desc: 'Every transaction is stored with a confidence score for your CPA.',         color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    ],
    connectCta: 'Connect Operating Account',
    reconnectCta: 'Reconnect Operating Account',
  },
  MORTGAGE_LIABILITY: {
    headline: 'Monitor Your Mortgage & DSCR Live',
    subheadline: 'Connect your mortgage account to track outstanding balance, next payment, YTD interest, and escrow — synced every 6 hours.',
    features: [
      { icon: Landmark,   label: 'Balance & Equity',  desc: 'Outstanding principal, original loan, and implied equity updated continuously.', color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
      { icon: PiggyBank,  label: 'DSCR Calculation',  desc: 'Debt service is pulled directly so DSCR is always based on actual payments.',   color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
      { icon: ShieldCheck,label: 'Escrow Monitoring',  desc: 'Escrow balance and YTD interest paid are synced for tax accuracy.',             color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    ],
    connectCta: 'Connect Mortgage Account',
    reconnectCta: 'Reconnect Mortgage Account',
  },
  RESERVE_ACCOUNT: {
    headline: 'Track Your Reserve Fund Balance',
    subheadline: 'Connect your reserve account so PaperWorking can monitor your cash reserves relative to your portfolio size and risk profile.',
    features: [
      { icon: PiggyBank,  label: 'Reserve Ratio',     desc: 'Your reserve-to-portfolio ratio is calculated and flagged when low.',           color: '#10B981', bg: 'rgba(16,185,129,0.10)' },
      { icon: TrendingUp, label: 'Balance History',   desc: 'Track reserve depletion trends over time with sparklines.',                     color: '#3B82F6', bg: 'rgba(59,130,246,0.10)' },
      { icon: ShieldCheck,label: 'Real-Time Sync',    desc: 'Balance is synced every 6 hours from your bank — no manual updates needed.',    color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    ],
    connectCta: 'Connect Reserve Account',
    reconnectCta: 'Reconnect Reserve Account',
  },
  CAPX_ACCOUNT: {
    headline: 'Monitor CapEx Budget & Spending',
    subheadline: 'Connect your CapEx account to track renovation and capital improvement spending against your project budget.',
    features: [
      { icon: Wrench,     label: 'CapEx Tracking',    desc: 'Construction draws and contractor payments are auto-tagged as CapEx.',          color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
      { icon: TrendingUp, label: 'Budget vs. Actual', desc: 'Spending is compared to your CapEx budget and flagged on overrun.',             color: '#EF4444', bg: 'rgba(239,68,68,0.10)'  },
      { icon: ShieldCheck,label: 'ARV Impact',        desc: 'Improvements are linked to your ARV estimate for ROI calculation.',             color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)' },
    ],
    connectCta: 'Connect CapEx Account',
    reconnectCta: 'Reconnect CapEx Account',
  },
};

const NEVER_DO = [
  { icon: Lock,  text: 'Store your bank password' },
  { icon: Share2,text: 'Move or transfer money from your accounts' },
  { icon: Ban,   text: 'Share your data with third parties' },
];

/* ─── Props ──────────────────────────────────────────────────── */
export interface PlaidPreLinkTrustScreenProps {
  purpose: ConnectionPurpose;
  onConnect: () => void;
  onManualEntry: () => void;
  onClose: () => void;
  loading?: boolean;
  isReconnect?: boolean;
}

/* ─── Component ──────────────────────────────────────────────── */
export function PlaidPreLinkTrustScreen({
  purpose,
  onConnect,
  onManualEntry,
  onClose,
  loading = false,
  isReconnect = false,
}: PlaidPreLinkTrustScreenProps) {
  const config = PURPOSE_CONFIG[purpose];
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  if (!mounted) return null;

  const modal = (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plaid-trust-headline"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        background: 'rgba(8,8,12,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl flex flex-col"
        style={{
          background: 'rgba(18,16,20,0.97)',
          border: '1px solid rgba(253,255,252,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* ── Close ── */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 z-10"
          style={{ color: 'rgba(253,255,252,0.4)' }}
        >
          <X size={15} />
        </button>

        <div className="p-7 pb-6 flex flex-col gap-6">
          {/* ── Brand lockup ── */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <ShieldCheck size={18} style={{ color: '#10B981' }} />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'rgba(253,255,252,0.4)' }}>
              <span style={{ color: 'rgba(253,255,252,0.9)' }} className="font-semibold">PaperWorking</span>
              <span>+</span>
              <span style={{ color: 'rgba(253,255,252,0.9)' }} className="font-semibold">Plaid</span>
            </div>
          </div>

          {/* ── Headline ── */}
          <div>
            {isReconnect && (
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw size={13} style={{ color: '#F59E0B' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F59E0B' }}>
                  Connection Refresh Needed
                </span>
              </div>
            )}
            <h2 id="plaid-trust-headline" className="text-xl font-bold leading-tight" style={{ color: '#FDFFFC' }}>
              {isReconnect ? `Your bank connection needs a quick refresh` : config.headline}
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'rgba(253,255,252,0.55)' }}>
              {isReconnect
                ? 'Your credentials may have changed or your bank session expired. Re-linking takes about 20 seconds and your data will resume syncing immediately.'
                : config.subheadline}
            </p>
          </div>

          {/* ── Feature cards (What we access) ── */}
          {!isReconnect && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(253,255,252,0.35)' }}>
                What PaperWorking will access
              </p>
              <div className="flex flex-col gap-2">
                {config.features.map((f) => (
                  <div
                    key={f.label}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: 'rgba(253,255,252,0.04)', border: '1px solid rgba(253,255,252,0.06)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: f.bg }}
                    >
                      <f.icon size={15} style={{ color: f.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#FDFFFC' }}>{f.label}</p>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(253,255,252,0.5)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Never do ── */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(253,255,252,0.35)' }}>
              What PaperWorking will NEVER do
            </p>
            <div className="flex flex-col gap-2">
              {NEVER_DO.map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(239,68,68,0.10)' }}
                  >
                    <item.icon size={11} style={{ color: '#EF4444' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(253,255,252,0.65)' }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Disconnect note ── */}
          <p className="text-xs" style={{ color: 'rgba(253,255,252,0.35)' }}>
            You can{' '}
            <a
              href="/dashboard/settings/integrations"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(253,255,252,0.5)' }}
            >
              disconnect anytime
            </a>
            {' '}from Settings. Your data is encrypted with AES-256-GCM and never sold.{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity"
              style={{ color: 'rgba(253,255,252,0.5)' }}
            >
              Privacy policy →
            </a>
          </p>
        </div>

        {/* ── CTAs ── */}
        <div
          className="px-7 pb-6 pt-4 flex flex-col gap-3 sticky bottom-0"
          style={{
            borderTop: '1px solid rgba(253,255,252,0.06)',
            background: 'rgba(18,16,20,0.97)',
          }}
        >
          {/* Primary: Connect */}
          <button
            id="plaid-trust-connect-btn"
            onClick={onConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: loading ? 'rgba(16,185,129,0.6)' : '#10B981',
              color: '#FDFFFC',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(16,185,129,0.3)',
            }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Preparing secure connection…
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                {isReconnect ? config.reconnectCta : config.connectCta}
                <ArrowRight size={14} className="ml-auto opacity-60" />
              </>
            )}
          </button>

          {/* Secondary: Manual Entry */}
          {!isReconnect && (
            <button
              id="plaid-trust-manual-btn"
              onClick={onManualEntry}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all duration-150 hover:bg-white/5 active:scale-[0.98]"
              style={{
                border: '1px solid rgba(253,255,252,0.10)',
                color: 'rgba(253,255,252,0.55)',
              }}
            >
              <PenLine size={14} />
              I'll enter transactions manually
            </button>
          )}

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Lock size={11} style={{ color: 'rgba(253,255,252,0.25)' }} />
            <span className="text-[10px]" style={{ color: 'rgba(253,255,252,0.25)' }}>
              Bank-level security powered by Plaid
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
