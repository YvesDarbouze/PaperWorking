'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, ShieldAlert, CheckCircle, XCircle, RefreshCw, AlertCircle, FileCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Negotiation, NegotiationRound } from '@/types/negotiation';
import {
  respondToNegotiationRound,
  issueFinalTerms,
  confirmFinalTerms,
  markTransactionCompleted,
  confirmTransactionNumbers,
  correctTransactionRecord,
} from '@/actions/negotiations';
import toast from 'react-hot-toast';

interface Props {
  negotiationId: string;
  onBack?: () => void;
}

export default function NegotiationThreadDetail({ negotiationId, onBack }: Props) {
  const { user } = useAuth();
  
  const [negotiation, setNegotiation] = useState<Negotiation | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // Forms states
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [counterAmt, setCounterAmt] = useState('');
  const [counterEquity, setCounterEquity] = useState('');
  const [counterNote, setCounterNote] = useState('');

  const [showFinalTermsModal, setShowFinalTermsModal] = useState(false);
  const [finalPriceBasis, setFinalPriceBasis] = useState('');
  const [finalContribution, setFinalContribution] = useState('');
  const [finalEquity, setFinalEquity] = useState('');
  const [finalClosingDate, setFinalClosingDate] = useState('');

  const [showTxnModal, setShowTxnModal] = useState(false);
  const [txnPriceBasis, setTxnPriceBasis] = useState('');
  const [txnContribution, setTxnContribution] = useState('');
  const [txnEquity, setTxnEquity] = useState('');

  const [nonBindingCheck, setNonBindingCheck] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Firestore real-time listener for the negotiation thread
  useEffect(() => {
    if (!negotiationId) return;
    setLoading(true);

    const unsub = onSnapshot(
      doc(db, 'negotiations', negotiationId),
      (snap) => {
        if (snap.exists()) {
          setNegotiation(snap.data() as Negotiation);
        } else {
          setNegotiation(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Listen negotiation error:', err);
        setLoading(false);
      }
    );

    return unsub;
  }, [negotiationId]);

  // Scroll to bottom on rounds change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [negotiation?.rounds]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] text-[#9E9DA0]">
        <RefreshCw className="w-8 h-8 animate-spin mb-2" />
        <p className="text-xs uppercase tracking-wider font-bold">Syncing negotiation thread...</p>
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#9E9DA0]">
        <ShieldAlert className="w-12 h-12 mb-4 text-[#F06543]" />
        <h3 className="text-lg font-bold">Negotiation Thread Not Found</h3>
        <p className="text-sm text-[#9E9DA0]/60 mt-1 max-w-sm">
          This thread may have been deleted, or you do not have permission to view it.
        </p>
      </div>
    );
  }

  const isLead = user?.uid === negotiation.leadInvestorUid;
  const isInvestor = user?.uid === negotiation.investorUid;
  
  // Format cents helpers
  const fmtCents = (cents?: number) => {
    if (cents == null) return '—';
    return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  // Chat message submit
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !user || sending) return;

    setSending(true);
    try {
      const idToken = await user.getIdToken();
      // Writing a message corresponds to a round proposal with no terms change
      const negRef = doc(db, 'negotiations', negotiationId);
      const now = new Date().toISOString();
      const currentVersion = (negotiation.currentTerms?.version ?? 0) + 1;
      
      const newRound: NegotiationRound = {
        version: currentVersion,
        type: 'message',
        senderUid: user.uid,
        senderName: user.displayName || user.email || 'User',
        createdAt: now,
        note: replyText.trim(),
      };

      // Inline append round in rounds array
      const rounds = [...(negotiation.rounds || []), newRound];
      // On client component, we can use direct updateDoc if authorized
      const { updateDoc: clientUpdateDoc } = await import('firebase/firestore');
      await clientUpdateDoc(negRef, {
        rounds,
        updatedAt: now,
      });

      setReplyText('');
    } catch (err) {
      console.error('Failed to send reply:', err);
      toast.error('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // General action wrapper
  const runAction = async (label: string, fn: () => Promise<any>) => {
    setActionLoading(true);
    const toastId = toast.loading(`${label}...`);
    try {
      await fn();
      toast.success(`${label} completed successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(`${label} failed:`, err);
      toast.error(err.message || 'Action failed.', { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  // Lead Investor Choices
  const handleAcceptTerms = () => {
    if (!user) return;
    runAction('Accepting terms', async () => {
      const idToken = await user.getIdToken();
      await respondToNegotiationRound(idToken, negotiationId, 'accept');
    });
  };

  const handleDeclineTerms = () => {
    if (!user) return;
    runAction('Declining terms', async () => {
      const idToken = await user.getIdToken();
      await respondToNegotiationRound(idToken, negotiationId, 'decline');
    });
  };

  const handleCounterTerms = () => {
    if (!user || !counterAmt || !counterEquity) return;
    runAction('Submitting counter-offer', async () => {
      const idToken = await user.getIdToken();
      await respondToNegotiationRound(idToken, negotiationId, 'counter', {
        contributionCents: Math.round(parseFloat(counterAmt) * 100),
        equityPct: parseFloat(counterEquity),
        note: counterNote || undefined,
      });
      setShowCounterModal(false);
      setCounterAmt('');
      setCounterEquity('');
      setCounterNote('');
    });
  };

  // Final Terms
  const handleIssueFinalTerms = () => {
    if (!user || !finalPriceBasis || !finalContribution || !finalEquity) return;
    runAction('Issuing Final Terms', async () => {
      const idToken = await user.getIdToken();
      await issueFinalTerms(idToken, negotiationId, {
        priceBasisCents: Math.round(parseFloat(finalPriceBasis) * 100),
        contributionCents: Math.round(parseFloat(finalContribution) * 100),
        equityPct: parseFloat(finalEquity),
        estimatedClosingDate: finalClosingDate || undefined,
      });
      setShowFinalTermsModal(false);
      setFinalPriceBasis('');
      setFinalContribution('');
      setFinalEquity('');
      setFinalClosingDate('');
    });
  };

  const handleConfirmFinalTerms = () => {
    if (!user || !nonBindingCheck) return;
    runAction('Confirming Final Terms', async () => {
      const idToken = await user.getIdToken();
      await confirmFinalTerms(idToken, negotiationId);
      setNonBindingCheck(false);
    });
  };

  // Transaction
  const handleMarkTxnCompleted = () => {
    if (!user || !txnPriceBasis || !txnContribution || !txnEquity) return;
    runAction('Recording transaction numbers', async () => {
      const idToken = await user.getIdToken();
      await markTransactionCompleted(idToken, negotiationId, {
        priceBasisCents: Math.round(parseFloat(txnPriceBasis) * 100),
        contributionCents: Math.round(parseFloat(txnContribution) * 100),
        equityPct: parseFloat(txnEquity),
      });
      setShowTxnModal(false);
      setTxnPriceBasis('');
      setTxnContribution('');
      setTxnEquity('');
    });
  };

  const handleConfirmTxnNumbers = () => {
    if (!user || !nonBindingCheck) return;
    runAction('Confirming final numbers', async () => {
      const idToken = await user.getIdToken();
      await confirmTransactionNumbers(idToken, negotiationId);
      setNonBindingCheck(false);
    });
  };

  const handleCorrectTxnRecord = () => {
    if (!user || !txnPriceBasis || !txnContribution || !txnEquity) return;
    runAction('Submitting corrected record', async () => {
      const idToken = await user.getIdToken();
      await correctTransactionRecord(idToken, negotiationId, {
        priceBasisCents: Math.round(parseFloat(txnPriceBasis) * 100),
        contributionCents: Math.round(parseFloat(txnContribution) * 100),
        equityPct: parseFloat(txnEquity),
      });
      setShowTxnModal(false);
      setTxnPriceBasis('');
      setTxnContribution('');
      setTxnEquity('');
    });
  };

  // Helpers to detect active rounds & actions availability
  const hasPendingCounter = negotiation.currentTerms?.isCounter && 
    ((isLead && negotiation.currentTerms.proposedBy === 'investor') || 
     (isInvestor && negotiation.currentTerms.proposedBy === 'lead'));

  const pendingFinalTermsConfirmation = isInvestor && 
    negotiation.confirmations?.finalTermsLead && 
    !negotiation.confirmations?.finalTermsInvestor;

  const pendingTransactionConfirmation = isInvestor && 
    negotiation.confirmations?.transactionLead && 
    !negotiation.confirmations?.transactionInvestor;

  const isLocked = negotiation.status === 'transaction_confirmed';

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0a0b] relative overflow-hidden">
      
      {/* ── Thread Header ── */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-[#161318]/40 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-[#9E9DA0] transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              {negotiation.projectName}
            </h3>
            <p className="text-[10px] font-mono text-[#9E9DA0] uppercase mt-0.5">
              Partnership Negotiation • {negotiation.investorName} & {negotiation.leadInvestorName}
            </p>
          </div>
        </div>

        {/* Locked status indicator */}
        {isLocked && (
          <span className="px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-[var(--color-positive)]/10 text-[var(--color-positive)] border border-[var(--color-positive)]/20 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-positive)]" />
            Locked Record
          </span>
        )}
      </div>

      {/* ── Conversation Rounds Feed ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        
        {/* Intro notice */}
        <div className="text-center py-2 max-w-sm mx-auto text-[11px] text-[#9E9DA0]/50 border border-white/5 bg-white/5 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 mx-auto mb-1.5 text-[#9E9DA0]/40" />
          Negotiation thread established. All term agreements, counter proposals, and final confirmation events are version-tracked inline below.
        </div>

        {negotiation.rounds?.map((round, idx) => {
          const isSenderMe = round.senderUid === user?.uid;
          const isMessage = round.type === 'message';
          
          if (isMessage) {
            return (
              <div key={idx} className={`flex ${isSenderMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] space-y-1 ${isSenderMe ? 'text-right' : 'text-left'}`}>
                  <span className="text-[10px] font-bold text-[#9E9DA0]/60 px-1">
                    {round.senderName} • {new Date(round.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                    isSenderMe
                      ? 'bg-[#00DD94]/10 text-white border-[#00DD94]/20'
                      : 'bg-white/5 text-[#9E9DA0] border-white/5'
                  }`}>
                    {round.note}
                  </div>
                </div>
              </div>
            );
          }

          // Structured Terms Cards (Agree, Counter, Accept, Decline, Final Terms)
          return (
            <div key={idx} className="flex justify-center">
              <div className={`w-full max-w-md rounded-2xl border p-5 space-y-4 shadow-lg ${
                round.type === 'agree' || round.type === 'accept'
                  ? 'bg-[#00DD94]/5 border-[#00DD94]/20'
                  : round.type === 'decline'
                  ? 'bg-[#F06543]/5 border-[#F06543]/20'
                  : 'bg-[#454955]/5 border-[#454955]/20'
              }`}>
                {/* Card Title */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-[#9E9DA0]">
                      {round.type === 'final_terms' ? 'assignment' : 'handshake'}
                    </span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {round.type === 'final_terms'
                        ? 'Final Terms Issued'
                        : round.type === 'counter'
                        ? `Counter Terms (v${round.version})`
                        : round.type === 'agree'
                        ? 'Offered Terms Agreed'
                        : round.type === 'accept'
                        ? 'Terms Accepted'
                        : 'Terms Declined'}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-[#9E9DA0]/50 uppercase">
                    By {round.senderName}
                  </span>
                </div>

                {/* Values Matrix */}
                {round.type !== 'decline' && (
                  <div className="grid grid-cols-3 gap-2 py-1 font-mono text-center">
                    <div className="bg-[#0d0a0b]/40 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[8px] uppercase tracking-wider text-[#9E9DA0]/50 font-bold mb-0.5">Price Basis</p>
                      <p className="text-sm font-semibold text-white tracking-tight">{fmtCents(round.priceBasis)}</p>
                    </div>
                    <div className="bg-[#0d0a0b]/40 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[8px] uppercase tracking-wider text-[#9E9DA0]/50 font-bold mb-0.5">Contribution</p>
                      <p className="text-sm font-semibold text-white tracking-tight">{fmtCents(round.contribution)}</p>
                    </div>
                    <div className="bg-[#0d0a0b]/40 p-2.5 rounded-xl border border-white/5">
                      <p className="text-[8px] uppercase tracking-wider text-[#9E9DA0]/50 font-bold mb-0.5">Equity Share</p>
                      <p className="text-sm font-semibold text-[var(--color-primary)] tracking-tight">
                        {round.equityPercentage != null ? `${round.equityPercentage}%` : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Note */}
                {round.note && (
                  <p className="text-xs text-[#9E9DA0] italic bg-[#0d0a0b]/20 p-3 rounded-xl border border-white/5 leading-relaxed">
                    "{round.note}"
                  </p>
                )}

                {/* Non-binding clause reminder */}
                <p className="text-[9px] text-[#9E9DA0]/40 text-center uppercase tracking-wide">
                  Non-Binding Interest Expression
                </p>
              </div>
            </div>
          );
        })}

        {/* Double-Confirmed Terms Confirmation Record Panel */}
        {negotiation.termsConfirmationRecord && (
          <div className="flex justify-center">
            <div className="w-full max-w-md rounded-2xl border bg-[#00DD94]/10 border-[#00DD94]/30 p-5 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[var(--color-primary)] pb-3 border-b border-[#00DD94]/20">
                <span className="material-symbols-outlined text-lg">verified</span>
                <span className="text-xs font-bold uppercase tracking-wider">Terms Confirmation Record</span>
              </div>
              <div className="space-y-2 text-xs text-[#9E9DA0] font-mono leading-snug">
                <div className="flex justify-between">
                  <span>INVESTOR:</span>
                  <span className="text-white font-medium">{negotiation.termsConfirmationRecord.investorName}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEAL SPONSOR:</span>
                  <span className="text-white font-medium">{negotiation.termsConfirmationRecord.leadName}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span>PRICE BASIS:</span>
                  <span className="text-white font-medium">{fmtCents(negotiation.termsConfirmationRecord.priceBasis)}</span>
                </div>
                <div className="flex justify-between">
                  <span>CONTRIBUTION:</span>
                  <span className="text-white font-medium">{fmtCents(negotiation.termsConfirmationRecord.contribution)}</span>
                </div>
                <div className="flex justify-between">
                  <span>EQUITY SHARE:</span>
                  <span className="text-[var(--color-primary)] font-bold">{negotiation.termsConfirmationRecord.equityPercentage}%</span>
                </div>
              </div>
              <p className="text-[10px] text-[#9E9DA0]/70 border-t border-[#00DD94]/20 pt-2 text-center leading-normal italic">
                "{negotiation.termsConfirmationRecord.nonBindingAcknowledgeText}"
              </p>
            </div>
          </div>
        )}

        {/* Double-Confirmed Transaction Confirmation Record Panel */}
        {negotiation.transactionConfirmationRecord && (
          <div className="flex justify-center">
            <div className="w-full max-w-md rounded-2xl border bg-[var(--color-positive)]/10 border-[var(--color-positive)]/30 p-5 space-y-4 shadow-xl relative overflow-hidden">
              {/* Confirmed Stamp watermark */}
              <div className="absolute right-4 bottom-4 text-[var(--color-positive)]/15 border-4 border-[var(--color-positive)]/15 rounded-xl uppercase tracking-widest font-black text-xl px-3 py-1 rotate-12 pointer-events-none select-none font-mono">
                Locked V{negotiation.transactionConfirmationRecord.version}
              </div>

              <div className="flex items-center gap-2 text-[var(--color-positive)] pb-3 border-b border-[var(--color-positive)]/20">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="text-xs font-bold uppercase tracking-wider">Transaction Confirmation Record</span>
              </div>
              <div className="space-y-2 text-xs text-[#9E9DA0] font-mono leading-snug">
                <div className="flex justify-between">
                  <span>RECORD VERSION:</span>
                  <span className="text-white font-medium">V{negotiation.transactionConfirmationRecord.version}</span>
                </div>
                {negotiation.transactionConfirmationRecord.supersededById && (
                  <div className="flex justify-between text-[#F06543]">
                    <span>SUPERSEDES:</span>
                    <span className="font-bold uppercase tracking-wider">Prior Version Locked</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span>FINAL PRICE BASIS:</span>
                  <span className="text-white font-medium">{fmtCents(negotiation.transactionConfirmationRecord.priceBasis)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FINAL CONTRIBUTION:</span>
                  <span className="text-white font-medium">{fmtCents(negotiation.transactionConfirmationRecord.contribution)}</span>
                </div>
                <div className="flex justify-between">
                  <span>FINAL EQUITY SHARE:</span>
                  <span className="text-[var(--color-positive)] font-bold">{negotiation.transactionConfirmationRecord.equityPercentage}%</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span>CONFIRMED AT:</span>
                  <span className="text-white font-medium">{new Date(negotiation.transactionConfirmationRecord.confirmedAt).toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[9px] text-[#9E9DA0]/40 text-center uppercase tracking-wider border-t border-[var(--color-positive)]/20 pt-2 font-semibold">
                Authorized & Locked Cap Table Ingestion
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ── Interactive Confirmations Action Callouts ── */}
      <AnimatePresence>
        {(hasPendingCounter || pendingFinalTermsConfirmation || pendingTransactionConfirmation) && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="mx-6 mb-4 p-4 rounded-xl border border-white/10 bg-[#161318]/90 backdrop-blur-xl shadow-2xl space-y-4"
          >
            {/* 1. Counter Actions */}
            {hasPendingCounter && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Counter terms proposed by counter-party
                  </h4>
                  <p className="text-[11px] text-[#9E9DA0] mt-0.5">
                    Proposals: Price basis {fmtCents(negotiation.currentTerms.priceBasis)} · Contribution {fmtCents(negotiation.currentTerms.contribution)} · Equity {negotiation.currentTerms.equityPercentage}%.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAcceptTerms}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[var(--color-primary)] text-[#0d0a0b] font-bold rounded-lg text-xs hover:brightness-110 transition-all"
                  >
                    Accept Offered
                  </button>
                  <button
                    onClick={() => {
                      setCounterAmt((negotiation.currentTerms.contribution / 100).toString());
                      setCounterEquity(negotiation.currentTerms.equityPercentage.toString());
                      setShowCounterModal(true);
                    }}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#454955]/15 border border-[#454955]/30 text-white rounded-lg text-xs hover:bg-[#454955]/30 transition-all"
                  >
                    Counter Back
                  </button>
                  <button
                    onClick={handleDeclineTerms}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#F06543]/15 border border-[#F06543]/30 text-[#F06543] rounded-lg text-xs hover:bg-[#F06543]/30 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* 2. Final Terms Confirmation Form */}
            {pendingFinalTermsConfirmation && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[var(--color-primary)]" />
                    Action Required: Review and Confirm Final Terms
                  </h4>
                  <p className="text-[11px] text-[#9E9DA0] mt-0.5">
                    Sponsor proposed Final Terms: price basis {fmtCents(negotiation.confirmations.finalTermsLead?.priceBasis)} · contribution {fmtCents(negotiation.confirmations.finalTermsLead?.contribution)} · equity {negotiation.confirmations.finalTermsLead?.equityPercentage}%.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="agree-final-check"
                      checked={nonBindingCheck}
                      onChange={(e) => setNonBindingCheck(e.target.checked)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-final-check" className="text-[10px] leading-tight text-[#9E9DA0] select-none">
                      I confirm these final terms are correct. I acknowledge this records the terms both parties intend to execute, and that actual legal execution occurs entirely off-platform.
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setCounterAmt(((negotiation.confirmations.finalTermsLead?.contribution ?? 0) / 100).toString());
                        setCounterEquity((negotiation.confirmations.finalTermsLead?.equityPercentage ?? 0).toString());
                        setShowCounterModal(true);
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#454955]/15 border border-[#454955]/30 text-white rounded-lg text-xs"
                    >
                      Counter Terms
                    </button>
                    <button
                      onClick={handleConfirmFinalTerms}
                      disabled={actionLoading || !nonBindingCheck}
                      className="px-4 py-2 bg-[var(--color-primary)] text-[#0d0a0b] font-bold rounded-lg text-xs disabled:opacity-50"
                    >
                      Confirm Final Terms
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Transaction Confirmation Form */}
            {pendingTransactionConfirmation && (
              <div className="space-y-3.5">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[var(--color-primary)]" />
                    Action Required: Verify Investment Execution Numbers
                  </h4>
                  <p className="text-[11px] text-[#9E9DA0] mt-0.5">
                    Lead Investor recorded that off-platform transaction has occurred. Verify final figures: Price basis {fmtCents(negotiation.confirmations.transactionLead?.priceBasis)} · Contribution {fmtCents(negotiation.confirmations.transactionLead?.contribution)} · Equity {negotiation.confirmations.transactionLead?.equityPercentage}%.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      id="agree-txn-check"
                      checked={nonBindingCheck}
                      onChange={(e) => setNonBindingCheck(e.target.checked)}
                      className="mt-0.5"
                    />
                    <label htmlFor="agree-txn-check" className="text-[10px] leading-tight text-[#9E9DA0] select-none">
                      I verify these numbers match the executed investment documents. Once confirmed, this record will lock permanently and update the deal cap table.
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleConfirmTxnNumbers}
                      disabled={actionLoading || !nonBindingCheck}
                      className="px-4 py-2 bg-[var(--color-primary)] text-[#0d0a0b] font-bold rounded-lg text-xs disabled:opacity-50"
                    >
                      Verify & permanent Lock
                    </button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lead Options Bar (Always render context menus when not locked) ── */}
      {isLead && !isLocked && !hasPendingCounter && (
        <div className="mx-6 mb-4 flex items-center justify-between p-3.5 bg-[#161318]/50 border border-white/5 rounded-xl text-xs gap-3">
          <span className="text-[#9E9DA0]/80">Negotiation Status: <strong>{negotiation.status.toUpperCase()}</strong></span>
          <div className="flex gap-2">
            {negotiation.status === 'active' || negotiation.status === 'accepted' ? (
              <button
                onClick={() => {
                  setFinalPriceBasis((negotiation.currentTerms.priceBasis / 100).toString());
                  setFinalContribution((negotiation.currentTerms.contribution / 100).toString());
                  setFinalEquity(negotiation.currentTerms.equityPercentage.toString());
                  setShowFinalTermsModal(true);
                }}
                className="px-3.5 py-1.5 bg-[#00DD94]/15 border border-[#00DD94]/20 text-[#00DD94] rounded-lg font-bold hover:bg-[#00DD94]/25 transition-all"
              >
                Issue Final Terms
              </button>
            ) : negotiation.status === 'terms_confirmed' || negotiation.status === 'transaction_pending' ? (
              <button
                onClick={() => {
                  const basis = negotiation.termsConfirmationRecord?.priceBasis ?? negotiation.currentTerms.priceBasis;
                  const contribution = negotiation.termsConfirmationRecord?.contribution ?? negotiation.currentTerms.contribution;
                  const equity = negotiation.termsConfirmationRecord?.equityPercentage ?? negotiation.currentTerms.equityPercentage;
                  setTxnPriceBasis((basis / 100).toString());
                  setTxnContribution((contribution / 100).toString());
                  setTxnEquity(equity.toString());
                  setShowTxnModal(true);
                }}
                className="px-3.5 py-1.5 bg-[var(--color-positive)]/15 border border-[var(--color-positive)]/20 text-[var(--color-positive)] rounded-lg font-bold hover:bg-[var(--color-positive)]/25 transition-all"
              >
                Mark Transaction Completed
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Lead Correction Bar (Allowed only on Locked Record) ── */}
      {isLead && isLocked && (
        <div className="mx-6 mb-4 flex items-center justify-between p-3.5 bg-[#161318]/50 border border-white/5 rounded-xl text-xs gap-3">
          <span className="text-[#9E9DA0]/60">This transaction is permanetly locked. Incorrect record?</span>
          <button
            onClick={() => {
              setTxnPriceBasis(((negotiation.transactionConfirmationRecord?.priceBasis ?? 0) / 100).toString());
              setTxnContribution(((negotiation.transactionConfirmationRecord?.contribution ?? 0) / 100).toString());
              setTxnEquity((negotiation.transactionConfirmationRecord?.equityPercentage ?? 0).toString());
              setShowTxnModal(true);
            }}
            className="px-3.5 py-1.5 bg-[#F06543]/15 border border-[#F06543]/20 text-[#F06543] rounded-lg font-bold hover:bg-[#F06543]/25 transition-all"
          >
            Correct Record
          </button>
        </div>
      )}

      {/* ── Chat/Note Reply Input Box ── */}
      <form onSubmit={handleSendChatMessage} className="p-4 border-t border-white/10 bg-[#161318]/20 flex gap-3 shrink-0 items-center">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type a message note or reply to terms..."
          className="flex-1 bg-[#0d0a0b] border border-white/5 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]/50 transition-all text-[#9E9DA0]"
          disabled={sending || actionLoading}
        />
        <button
          type="submit"
          disabled={sending || actionLoading || !replyText.trim()}
          className="p-2.5 bg-[#00DD94] text-[#0d0a0b] rounded-xl hover:brightness-110 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* ── Modals Layer ── */}
      
      {/* 1. Counter Propose Modal */}
      {showCounterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCounterModal(false)} />
          <div className="relative glass-card rounded-2xl border border-pw-border p-6 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Propose Counter Offer</h3>
            <div className="space-y-3.5 mb-6 text-left">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Contribution ($)</label>
                <input
                  type="number"
                  value={counterAmt}
                  onChange={(e) => setCounterAmt(e.target.value)}
                  placeholder="e.g. 50000"
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Proposed Equity (%)</label>
                <input
                  type="number"
                  value={counterEquity}
                  onChange={(e) => setCounterEquity(e.target.value)}
                  placeholder="e.g. 12.5"
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Proposing Note</label>
                <textarea
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                  rows={2}
                  placeholder="Brief context for proposal..."
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCounterModal(false)}
                className="flex-1 py-2 rounded-lg border border-white/5 text-xs text-[#9E9DA0]"
              >
                Cancel
              </button>
              <button
                onClick={handleCounterTerms}
                className="flex-1 py-2 rounded-lg bg-[var(--color-primary)] text-[#0d0a0b] font-bold text-xs"
              >
                Propose
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Issue Final Terms Modal */}
      {showFinalTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowFinalTermsModal(false)} />
          <div className="relative glass-card rounded-2xl border border-pw-border p-6 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Issue Final Terms Sheet</h3>
            <div className="space-y-3.5 mb-6 text-left">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Price Basis ($)</label>
                <input
                  type="number"
                  value={finalPriceBasis}
                  onChange={(e) => setFinalPriceBasis(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Contribution ($)</label>
                <input
                  type="number"
                  value={finalContribution}
                  onChange={(e) => setFinalContribution(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Equity Percentage (%)</label>
                <input
                  type="number"
                  value={finalEquity}
                  onChange={(e) => setFinalEquity(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Est. Closing Date</label>
                <input
                  type="date"
                  value={finalClosingDate}
                  onChange={(e) => setFinalClosingDate(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFinalTermsModal(false)}
                className="flex-1 py-2 rounded-lg border border-white/5 text-xs text-[#9E9DA0]"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueFinalTerms}
                className="flex-1 py-2 rounded-lg bg-[#00DD94] text-[#0d0a0b] font-bold text-xs"
              >
                Issue Sheets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Transaction Completed (or Correction) Modal */}
      {showTxnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTxnModal(false)} />
          <div className="relative glass-card rounded-2xl border border-pw-border p-6 w-full max-w-sm mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              {isLocked ? 'Propose Record Correction' : 'Mark Transaction Completed'}
            </h3>
            <p className="text-[10px] text-[#9E9DA0] mb-4 text-left">
              {isLocked 
                ? 'Enter corrected figures. This will supersede the permanently locked record and require new double-confirmation from both parties.' 
                : 'Confirm final transaction values executed off-platform. Investor must verify numbers to permanently lock the record and update the Cap Table.'}
            </p>
            <div className="space-y-3.5 mb-6 text-left">
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Executed Price Basis ($)</label>
                <input
                  type="number"
                  value={txnPriceBasis}
                  onChange={(e) => setTxnPriceBasis(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Final Contribution ($)</label>
                <input
                  type="number"
                  value={txnContribution}
                  onChange={(e) => setTxnContribution(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#9E9DA0] uppercase mb-1">Final Equity Share (%)</label>
                <input
                  type="number"
                  value={txnEquity}
                  onChange={(e) => setTxnEquity(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTxnModal(false)}
                className="flex-1 py-2 rounded-lg border border-white/5 text-xs text-[#9E9DA0]"
              >
                Cancel
              </button>
              <button
                onClick={isLocked ? handleCorrectTxnRecord : handleMarkTxnCompleted}
                className="flex-1 py-2 rounded-lg bg-[var(--color-positive)] text-[#0d0a0b] font-bold text-xs"
              >
                {isLocked ? 'Correct Record' : 'Record Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
