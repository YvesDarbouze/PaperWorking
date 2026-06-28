'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, Shield, ChevronRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { trackEvent } from '@/lib/analytics';

interface InvestorInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
  /** Firestore project document ID — required to create a scoped invitation. */
  projectId?: string;
}

type AccessRole = 'VIEWER' | 'LIMITED' | 'FULL';
type ModalState = 'form' | 'sending' | 'success' | 'error';

const ACCESS_ROLES: { id: AccessRole; label: string; desc: string }[] = [
  { id: 'VIEWER',  label: 'AUDIT ONLY',         desc: 'Read-only access to financials and ledger.' },
  { id: 'LIMITED', label: 'STRATEGIC PARTNER',  desc: 'Can add comments and export statements.' },
  { id: 'FULL',    label: 'JOINT VENTURE',       desc: 'Collaborative management of the entire asset.' },
];

// Role → equityPercent ceiling used as the proposedEquityPercent placeholder.
// The real equity negotiation happens outside the modal; this is just a typed default.
const ROLE_EQUITY_DEFAULT: Record<AccessRole, number> = {
  VIEWER:  1,
  LIMITED: 10,
  FULL:    25,
};

export default function InvestorInviteModal({
  isOpen,
  onClose,
  propertyName,
  projectId,
}: InvestorInviteModalProps) {
  const [email,          setEmail]          = useState('');
  const [investorName,   setInvestorName]   = useState('');
  const [role,           setRole]           = useState<AccessRole>('VIEWER');
  const [modalState,     setModalState]     = useState<ModalState>('form');
  const [errorMessage,   setErrorMessage]   = useState<string | null>(null);

  const canSend = email.trim().length > 0 && investorName.trim().length > 0 && !!projectId;

  const handleClose = () => {
    // Reset state when closing
    setModalState('form');
    setErrorMessage(null);
    setEmail('');
    setInvestorName('');
    setRole('VIEWER');
    onClose();
  };

  const handleSend = async () => {
    if (!canSend || modalState === 'sending') return;

    setModalState('sending');
    setErrorMessage(null);

    try {
      // ── Auth token (identity is ALWAYS derived server-side from this token) ──
      const user = auth.currentUser;
      if (!user) {
        setErrorMessage('You must be signed in to send an invitation.');
        setModalState('error');
        return;
      }
      const idToken = await user.getIdToken();

      // ── Request payload — invitedByUid is intentionally absent ──────────────
      // The server derives the inviter identity from the verified token.
      // Never send invitedByUid from the client.
      const payload = {
        projectId,
        dealName:              propertyName ?? '',
        email:                 email.trim(),
        name:                  investorName.trim(),
        proposedEquityPercent: ROLE_EQUITY_DEFAULT[role],
        proposedAmount:        0,
        // role is informational for the UI; the server maps access via its own logic
        accessRole:            role,
      };

      const res = await fetch('/api/invitations/send', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json() as {
        success?: boolean;
        error?:   string;
        invitationId?: string;
        inviteUrl?:    string;
      };

      if (!res.ok || !data.success) {
        // Surface the real server error — never swallow it
        const msg = data.error ?? `Request failed (HTTP ${res.status})`;
        setErrorMessage(msg);
        setModalState('error');
        trackEvent('investor_invited', { projectId, role, success: false, error: msg });
        return;
      }

      // ── Real 2xx — invitation persisted ─────────────────────────────────────
      setModalState('success');
      trackEvent('investor_invited', {
        projectId,
        role,
        success:      true,
        invitationId: data.invitationId,
      });

      // Auto-close after showing confirmation
      setTimeout(() => handleClose(), 2200);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setErrorMessage(msg);
      setModalState('error');
      trackEvent('investor_invited', { projectId, role, success: false, error: msg });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-bg-surface border border-border-accent shadow-2xl overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="p-8 border-b border-border-accent flex justify-between items-center bg-pw-black text-pw-white">
              <div className="flex items-center gap-4">
                <UserPlus className="w-5 h-5 text-pw-accent" />
                <h2 className="text-sm font-black uppercase tracking-[0.4em]">INITIATE INVESTOR INVITE</h2>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-bg-surface/10 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-10 space-y-10">
              {/* ── Success state ── */}
              {modalState === 'success' && (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-[#F2F2F2] text-[#1A1A1A] rounded-full flex items-center justify-center mb-6">
                    <Check className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-black text-text-primary uppercase tracking-tighter mb-2">
                    INVITATION COMMITTED
                  </h3>
                  <p className="text-sm text-text-secondary font-medium uppercase tracking-widest">
                    TRANSMITTING CREDENTIALS TO INVESTOR...
                  </p>
                </div>
              )}

              {/* ── Error state ── */}
              {modalState === 'error' && (
                <div className="flex flex-col gap-6">
                  <div className="flex items-start gap-4 p-6 bg-red-950/30 border border-red-800/40">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">
                        INVITATION FAILED
                      </p>
                      <p className="text-xs text-red-300 font-medium">{errorMessage}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalState('form')}
                    className="w-full py-4 border border-border-accent text-text-primary text-xs font-black uppercase tracking-[0.4em] hover:border-pw-accent transition-all"
                  >
                    TRY AGAIN
                  </button>
                </div>
              )}

              {/* ── Sending state ── */}
              {modalState === 'sending' && (
                <div className="py-12 flex flex-col items-center text-center gap-4">
                  <Loader2 className="w-10 h-10 text-pw-accent animate-spin" />
                  <p className="text-xs font-black text-text-secondary uppercase tracking-widest">
                    TRANSMITTING INVITE...
                  </p>
                </div>
              )}

              {/* ── Form state ── */}
              {modalState === 'form' && (
                <>
                  {/* Investor name */}
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4">
                      INVESTOR NAME
                    </label>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={investorName}
                      onChange={(e) => setInvestorName(e.target.value)}
                      className="w-full px-6 py-5 bg-bg-primary border border-border-accent text-text-primary text-xs font-bold tracking-widest focus:outline-none focus:border-pw-accent transition-all"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4">
                      RECIPIENT EMAIL
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input
                        type="email"
                        placeholder="investor@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-16 pr-8 py-6 bg-bg-primary border border-border-accent text-text-primary text-xs font-black tracking-widest focus:outline-none focus:border-pw-accent transition-all uppercase"
                      />
                    </div>
                  </div>

                  {/* Access permissions */}
                  <div>
                    <label className="block text-[10px] font-black text-text-secondary uppercase tracking-[0.3em] mb-4">
                      ACCESS PERMISSIONS
                    </label>
                    <div className="grid grid-cols-1 gap-4">
                      {ACCESS_ROLES.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setRole(r.id)}
                          className={`p-6 text-left border transition-all flex justify-between items-center ${
                            role === r.id
                              ? 'bg-pw-black border-pw-black text-pw-white'
                              : 'bg-bg-primary border-border-accent text-text-primary hover:border-pw-accent'
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest mb-1">{r.label}</p>
                            <p className={`text-[10px] uppercase tracking-tighter ${role === r.id ? 'text-pw-accent' : 'text-text-secondary font-medium'}`}>
                              {r.desc}
                            </p>
                          </div>
                          <Shield className={`w-4 h-4 ${role === r.id ? 'text-pw-accent' : 'text-text-secondary'}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Missing projectId warning */}
                  {!projectId && (
                    <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-800/30">
                      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        No project selected. Open this modal from within a project to send an invitation.
                      </p>
                    </div>
                  )}

                  {/* Security notice */}
                  <div className="bg-[#F2F2F2] border border-[#CCCCCC] p-6 flex items-start gap-4">
                    <Shield className="w-5 h-5 text-[#595959] flex-shrink-0" />
                    <p className="text-[10px] text-amber-900 font-bold uppercase leading-relaxed tracking-wider">
                      SECURITY NOTICE: INVITATION GRANTS ACCESS TO SENSITIVE FINANCIAL ARTIFACTS FOR{' '}
                      <span className="underline">{propertyName || 'ALL ACTIVE DEALS'}</span>.
                    </p>
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="w-full py-8 bg-pw-black text-pw-white text-sm font-black uppercase tracking-[0.4em] hover:bg-pw-accent disabled:opacity-30 disabled:hover:bg-pw-black transition-all flex items-center justify-center gap-4 shadow-xl"
                  >
                    <span>TRANSMIT INVITE</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
