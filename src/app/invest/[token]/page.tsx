'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Shield, FileText, Home, Pen, Mail, Send, Clock, Lock, TrendingUp, Coins, HelpCircle, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MetricChart } from '@/components/metrics/MetricChart';
import toast from 'react-hot-toast';
import FollowInvestorButton from '@/components/listings/FollowInvestorButton';
import { SoftCommitWidget } from '@/components/project/SoftCommitWidget';
import { recordConversionTelemetry } from '@/actions/telemetry';

/* ═══════════════════════════════════════════════════════
   Guest Portal — External Investor View (Luminous Glass)

   Route: /invest/[token]

   token = an `invitations` collection token (see
   /api/invitations/[token], /respond, /ask, /updates).

   Renders the opportunity summary, bento metrics, terms,
   financial charts, and lets an investor record their
   intention to invest (accept/decline). PaperWorking never
   moves money here — accepting creates a `pledged` commitment
   that the deal leadInvestor later confirms manually via
   CrowdfundingTracker once funds actually arrive off-platform.
   ═══════════════════════════════════════════════════════ */

interface DealTokenData {
  investorName: string;
  investorEmail: string;
  dealName: string;
  propertyAddress: string;
  purchasePrice: number;
  estimatedARV: number;
  expectedROI: number;
  investmentAmount: number;
  equitySplit: number;
  termMonths: number;
  interestRate: number;
  legalEntity: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'interested';
  noiHistory: { date: string; value: number }[];
  capRateHistory: { date: string; value: number }[];
  cashFlowHistory: { date: string; value: number }[];
  burnRateHistory: { date: string; value: number }[];

  raiseTarget?: number;
  raiseRaised?: number;
  raisePercentage?: number;
  daysLeft?: number;
  hoursLeft?: number;
  strategy?: string;
  assetClass?: string;
  opportunitySummary?: string;
  commitmentStatus?: string;
  commitmentId?: string | null;
  projectId?: string;
  subscriptionAgreementTemplate?: { name: string; url: string; uploadedAt: string } | null;
  cardExchangeStatus?: 'pending' | 'accepted' | 'declined' | 'none';
  inviteeBusinessCard?: { name: string; email: string; phone: string; company: string } | null;
  leadInvestorBusinessCard?: { name: string; email: string; phone: string; company: string; uid?: string } | null;
  inquiries?: any[];
}

interface DealUpdate {
  id: string;
  title: string | null;
  body: string;
  authorName: string;
  createdAt: string | null;
}

export default function GuestPortalPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processedUrlAction, setProcessedUrlAction] = useState(false);

  const { user, loading: authLoading } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureSectionRef = useRef<HTMLDivElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dealData, setDealData] = useState<DealTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [legacyLink, setLegacyLink] = useState(false);

  // Deal updates (leadInvestor-authored progress feed, read-only for guests)
  const [dealUpdates, setDealUpdates] = useState<DealUpdate[]>([]);

  // Subscribe Gate States
  const [isSubscribedInSession, setIsSubscribedInSession] = useState(false);
  const [subscribeForm, setSubscribeForm] = useState({ name: '', email: '' });
  const [submittingSubscribe, setSubmittingSubscribe] = useState(false);

  // Modals state
  const [showInsights, setShowInsights] = useState(false);
  const [showAskLeadInvestor, setShowAskLeadInvestor] = useState(false);
  const [leadInvestorMessage, setLeadInvestorMessage] = useState('');
  const [sendingLeadInvestorMsg, setSendingLeadInvestorMsg] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);
  const [followUpMsg, setFollowUpMsg] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);

  // Subscription execution details
  const [activeSubManualSign, setActiveSubManualSign] = useState(false);
  const [subManualEvidence, setSubManualEvidence] = useState('');
  const [showDeclineReason, setShowDeclineReason] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  // Business Card Exchange States
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardEmail, setCardEmail] = useState('');
  const [cardPhone, setCardPhone] = useState('');
  const [cardCompany, setCardCompany] = useState('');

  // The investment amount is set by the leadInvestor at invite time
  // (invitation.proposedAmount) — the investor cannot edit it; the
  // backend (`/api/invitations/respond`) ignores any client-supplied amount.
  const investmentAmount = dealData?.investmentAmount ?? 0;

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSubscribe(true);
    try {
      // Stash name/email and target action
      sessionStorage.setItem(`pw_pending_deal_action_${token}`, JSON.stringify({
        action: 'view_deal',
        name: subscribeForm.name,
        email: subscribeForm.email,
      }));
      toast('Redirecting to registration to create your account...');
      router.push(`/register?invite=${token}&name=${encodeURIComponent(subscribeForm.name)}&email=${encodeURIComponent(subscribeForm.email)}`);
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during subscription.');
    } finally {
      setSubmittingSubscribe(false);
    }
  };

  // Load deal details from the real invitations pipeline. A 404/410 there
  // falls back to the legacy `investmentTokens` route only to distinguish
  // "never existed" from "this is an old, now-retired link type."
  const fetchDealData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/invitations/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setDealData(data as DealTokenData);
          setCardName(data.investorName || '');
          setCardEmail(data.investorEmail || '');
          setSubscribeForm({
            name: data.investorName || '',
            email: data.investorEmail || '',
          });
          
          recordConversionTelemetry({
            eventType: 'deal_invite',
            listingId: data.listingId || undefined,
            details: { projectId: data.projectId },
            sessionToken: token,
          }).catch(() => {});

          return;
        }
        const legacyRes = await fetch(`/api/invest/${token}`);
        const legacyData = await legacyRes.json().catch(() => ({}));
        if (legacyData?.legacy) {
          setLegacyLink(true);
        } else {
          setTokenInvalid(true);
        }
      })
      .catch(() => setTokenInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchDealData();
  }, [fetchDealData]);

  // Handle URL one-tap actions
  useEffect(() => {
    if (!dealData || processedUrlAction) return;

    const action = searchParams.get('action');
    if (!action) return;

    setProcessedUrlAction(true);

    if (action === 'decline') {
      const declineOneTap = async () => {
        try {
          const res = await fetch('/api/invitations/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'decline', declineReason: '' }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            toast.success('Invitation declined successfully.');
            setShowDeclineReason(true); // Open optional reason dialog
            fetchDealData();
          } else {
            toast.error(data.error || 'Failed to decline invitation.');
          }
        } catch (err) {
          console.error('Decline error:', err);
          toast.error('Failed to decline invitation.');
        }
      };
      declineOneTap();
    } else if (action === 'interested') {
      setShowCardModal(true);
    } else if (action === 'ask') {
      setShowAskLeadInvestor(true);
    }
  }, [dealData, searchParams, processedUrlAction, token, fetchDealData]);

  // Restore stashed signup context
  useEffect(() => {
    if (!user || !dealData) return;

    const pendingActionKey = `pw_pending_deal_action_${token}`;
    const stored = sessionStorage.getItem(pendingActionKey);
    if (stored) {
      sessionStorage.removeItem(pendingActionKey);
      try {
        const parsed = JSON.parse(stored);
        if (parsed.action === 'insights') {
          setShowInsights(true);
          toast.success('Insights unlocked successfully!');
        } else if (parsed.action === 'commit') {
          if (parsed.subManualEvidence) {
            setSubManualEvidence(parsed.subManualEvidence);
          }
          setTimeout(() => {
            signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            toast('Draw your signature to execute commitment.', { icon: '✍️' });
          }, 300);
        } else if (parsed.action === 'view_deal') {
          toast.success('Deal details unlocked successfully!');
        }
      } catch (e) {
        console.warn('Failed to parse pending deal action:', e);
      }
    }
  }, [user, dealData, token]);

  // Read-only guest updates feed — plain fetch, not a client Firestore
  // subscription, so no public security rules are needed on the subcollection.
  useEffect(() => {
    if (!token || !dealData) return;
    fetch(`/api/invitations/${token}/updates`)
      .then((res) => res.json())
      .then((data) => setDealUpdates(data.updates || []))
      .catch(() => setDealUpdates([]));
  }, [token, dealData]);

  const alreadyResponded = false;

  // Canvas drawing handlers
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!user) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }, [user]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!user || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0d0a0b'; // dark green accent stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing, user]);

  const stopDraw = useCallback((e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && 'touches' in e) {
      e.preventDefault();
    }
    setIsDrawing(false);
  }, []);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Accept — records intention to invest (a `pledged` commitment). No money
  // moves here; the leadInvestor confirms later once funds actually arrive.
  const handleSign = async () => {
    if (!hasSigned || !canvasRef.current || !user) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      const dataURL = canvasRef.current.toDataURL('image/png');

      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'accept', signatureDataUrl: dataURL }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setDealData((prev) => (prev ? { ...prev, status: 'accepted' } : prev));
        toast.success('Your commitment has been recorded.');
      } else {
        setSubmitError(data.error || 'Failed to record signature.');
      }
    } catch (err) {
      console.error('Signature submission failed:', err);
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignSubscription = async (actionType: 'esign' | 'manual') => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const body = {
        action: actionType,
        evidence: actionType === 'manual' ? subManualEvidence : 'E-Signed via digital canvas signature in Guest Portal'
      };

      const res = await fetch(`/api/invitations/${token}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Subscription Agreement executed successfully!');
        setActiveSubManualSign(false);
        setSubManualEvidence('');
        clearSignature();
        fetchDealData();
      } else {
        setSubmitError(data.error || 'Failed to execute subscription.');
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  // Commit CTA in sidebar (scrolls to signature if not yet signed)
  const handleCommitCTA = () => {
    if (!user) {
      sessionStorage.setItem(`pw_pending_deal_action_${token}`, JSON.stringify({
        action: 'commit',
        commitmentStatus: dealData?.commitmentStatus,
        subManualEvidence,
      }));
      toast('Redirecting to registration to execute commitment...');
      router.push(`/register?invite=${token}&name=${encodeURIComponent(subscribeForm.name)}&email=${encodeURIComponent(subscribeForm.email)}`);
      return;
    }

    if (dealData?.commitmentStatus === 'docs-out') {
      if (!hasSigned) {
        signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        toast('Draw your signature below to execute the subscription agreement.', { icon: '✍️' });
        return;
      }
      handleSignSubscription('esign');
      return;
    }

    if (!hasSigned) {
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast('Draw your signature below to record your commitment.', { icon: '✍️' });
      return;
    }
    handleSign();
  };

  // Decline — real, persisted response. The leadInvestor is notified server-side
  // (real email via /api/invitations/respond), not by a client-side toast.
  const handleDecline = async (reason?: string) => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'decline', declineReason: reason }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealData((prev) => (prev ? { ...prev, status: 'declined' } : prev));
        setShowDeclineReason(false);
        setDeclineReason('');
        toast.success('You have declined this opportunity.');
      } else {
        toast.error(data.error || 'Failed to record your response.');
      }
    } catch (err) {
      console.error('Decline submission failed:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInterested = async (disclosedCard?: any) => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const card = disclosedCard || {
        name: cardName,
        email: cardEmail,
        phone: cardPhone,
        company: cardCompany,
        uid: user?.uid || null,
      };
      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'interested',
          disclosedCard: card,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealData((prev) => (prev ? {
          ...prev,
          status: 'interested',
          cardExchangeStatus: 'pending',
          inviteeBusinessCard: card,
        } : prev));
        toast.success("Thank you! You signaled interest and shared your business card. The leadInvestor has been notified.");
        setShowCardModal(false);
      } else {
        toast.error(data.error || 'Failed to record your response.');
      }
    } catch (err) {
      console.error('Interested submission failed:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'reopen' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealData((prev) => (prev ? { ...prev, status: 'pending' } : prev));
        toast.success('Response reset. You can choose a new response.');
      } else {
        toast.error(data.error || 'Failed to reset response.');
      }
    } catch (err) {
      console.error('Reopen failed:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Ask LeadInvestor — real, persisted question + real email to the leadInvestor.
  const handleSendLeadInvestorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadInvestorMessage.trim()) return;
    setSendingLeadInvestorMsg(true);
    setAskError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: leadInvestorMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLeadInvestorMessage('');
        setShowAskLeadInvestor(false);
        toast.success('Your question was sent to the leadInvestor.');
        fetchDealData();
      } else {
        setAskError(data.error || 'Failed to send your question.');
      }
    } catch (err) {
      console.error('Ask leadInvestor failed:', err);
      setAskError('An unexpected error occurred. Please try again.');
    } finally {
      setSendingLeadInvestorMsg(false);
    }
  };

  // Ask LeadInvestor follow-up
  const handleSendFollowUpMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpMsg.trim() || sendingFollowUp) return;
    setSendingFollowUp(true);
    try {
      const res = await fetch(`/api/invitations/${token}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: followUpMsg.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFollowUpMsg('');
        toast.success('Your question has been sent to the leadInvestor.');
        fetchDealData();
      } else {
        toast.error(data.error || 'Failed to send your message.');
      }
    } catch (err) {
      console.error('Follow-up message failed:', err);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSendingFollowUp(false);
    }
  };

  // Loading Screen
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[#454955] text-4xl animate-spin">progress_activity</span>
          <p className="text-xs uppercase tracking-widest text-[#454955]/70 font-mono">Verifying Vault Link...</p>
        </div>
      </div>
    );
  }

  // Legacy Link Screen — an old investmentTokens-based link, no longer supported
  if (legacyLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-sm p-8 glass-card rounded-2xl border border-white/10 shadow-xl">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#454955]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Link No Longer Supported</h1>
          <p className="text-xs text-[#8a9b9b] leading-relaxed">
            This invitation link type is no longer supported. Please contact your leadInvestor for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // Invalid Token Screen
  if (tokenInvalid || !dealData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-sm p-8 glass-card rounded-2xl border border-white/10 shadow-xl">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#454955]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Invalid or Expired Link</h1>
          <p className="text-xs text-[#8a9b9b] leading-relaxed">
            This secure investment link has expired, been revoked, or is no longer valid. Please contact the leadInvestor to request a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // Already Responded Screen — regardless of auth state, an invitation can only be answered once
  if (alreadyResponded) {
    const isAccepted = dealData.status === 'accepted';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a0b] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-md p-8 glass-card rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${isAccepted ? 'bg-[#454955]/10 border border-[#454955]/30 text-[#454955] shadow-[0_0_20px_rgba(69,73,85,0.2)]' : 'bg-red-950/20 border border-red-500/20 text-red-400'}`}>
            {isAccepted ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-light text-white uppercase tracking-wider">
              {isAccepted ? 'Commitment Recorded' : 'Offer Declined'}
            </h1>
            <p className="text-xs text-[#8a9b9b] leading-relaxed">
              {isAccepted
                ? 'Your intention to invest has been recorded and the leadInvestor has been notified. They will confirm once funds are received and follow up with formal subscription papers.'
                : 'You have declined this investment opportunity. The deal leadInvestor has been notified.'}
            </p>
          </div>
          {isAccepted && (
            <div className="bg-black/30 border border-white/15 p-5 rounded-2xl text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#8a9b9b]">INVESTOR:</span>
                <span className="font-bold text-white">{dealData.investorName}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#8a9b9b]">ALLOCATION:</span>
                <span className="font-bold text-[#454955]">${investmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-[#8a9b9b]">EQUITY SHARE:</span>
                <span className="font-bold text-white">{dealData.equitySplit}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8a9b9b]">STATUS:</span>
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  PLEDGED — AWAITING LEAD_INVESTOR CONFIRMATION
                </span>
              </div>
            </div>
          )}
          {user && (
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
              Go to Workspace
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0a0b] text-[#9E9DA0] font-sans antialiased pb-24 relative overflow-hidden"
         style={{ backgroundImage: "radial-gradient(rgba(69, 73, 85, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      {/* Top AppBar */}
      <header className="bg-surface/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 md:px-12 h-16 w-full fixed top-0 z-[60]">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors select-none">
            close
          </Link>
          <h1 className="font-headline-md text-base font-bold tracking-tighter text-[#454955] uppercase">PaperWorking</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 font-mono text-[10px] uppercase tracking-wider">
            <span className="text-[#454955]">Deal Review</span>
            <Link href="/dashboard/projects" className="text-on-surface-variant hover:text-[#454955] transition-colors">Portfolio</Link>
            <Link href="/dashboard/inbox" className="text-on-surface-variant hover:text-[#454955] transition-colors">Activity</Link>
          </nav>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-[#454955] transition-colors select-none">help</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-24 pb-32 px-6 md:px-12 max-w-6xl mx-auto relative">
        
        {/* Anonymous Viewer Banner — sign in or register to respond */}
        {!user && isSubscribedInSession && (
          <div className="mb-8 p-4 border-2 border-dashed border-[#454955]/30 bg-[#454955]/5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#454955] select-none">verified_user</span>
              <p className="text-xs text-white">
                Sign in or create a free account to accept or decline this invitation.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/login?redirectTo=${encodeURIComponent('/invest/' + token)}`}
                className="px-5 py-2 rounded-lg font-mono text-[10px] uppercase font-bold transition-all border border-white/10 text-white hover:bg-white/5"
              >
                Log In
              </Link>
              <button
                id="btn-create-account"
                onClick={() => router.push(`/register?invite=${token}`)}
                className="bg-[#454955]/10 hover:bg-[#454955]/20 text-[#454955] px-5 py-2 rounded-lg font-mono text-[10px] uppercase font-bold transition-all border border-[#454955]/20"
              >
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* ── Subscribe Gate Overlay ── */}
        {!user && !isSubscribedInSession && (
          <div className="absolute inset-0 bg-[#0d0a0b]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 min-h-[500px]">
            <div className="w-full max-w-md bg-pw-night-bg/98 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6" id="subscribe-gate">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#454955]/10 border border-[#454955]/20 flex items-center justify-center mx-auto text-[#454955]">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Subscribe to View Deal</h3>
                <p className="text-xs text-[#9E9DA0] leading-relaxed">
                  This is a private investment opportunity. Enter your information to subscribe and unlock the full deal details, metrics, and projections.
                </p>
              </div>

              <form onSubmit={handleSubscribeSubmit} className="space-y-4">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Your Name"
                    value={subscribeForm.name}
                    onChange={(e) => setSubscribeForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#454955]/60 text-sm"
                    id="subscribe-name"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[#9E9DA0]">Email Address</label>
                  <input
                    required
                    type="email"
                    disabled
                    placeholder="your.email@example.com"
                    value={subscribeForm.email}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-[#9E9DA0] focus:outline-none text-sm cursor-not-allowed opacity-80"
                    id="subscribe-email"
                  />
                </div>

                <div className="flex items-start gap-2.5 pt-2 text-left">
                  <input
                    required
                    type="checkbox"
                    defaultChecked
                    disabled
                    className="mt-1 cursor-not-allowed accent-[#454955]"
                    id="subscribe-consent"
                  />
                  <label className="text-[11px] text-[#9E9DA0]/80 leading-relaxed cursor-not-allowed">
                    I consent to receive emails, project notifications, and co-investment updates for this project.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submittingSubscribe}
                  id="btn-subscribe-unlock"
                  className="w-full py-3 bg-[#454955] text-[#0d0a0b] font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-97 transition-all flex items-center justify-center gap-2"
                >
                  {submittingSubscribe && <Loader2 className="w-4.5 h-4.5 animate-spin" />}
                  Subscribe & Unlock Deal
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 12-Column Grid Layout */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${!user && !isSubscribedInSession ? "filter blur-[8px] select-none pointer-events-none transition-all duration-300" : "transition-all duration-300"}`}>
          
          {/* Left Column: Details & Underwriting */}
          <div className="lg:col-span-8 space-y-8">

            {/* Locked Non-Binding Disclosure Notice (FD-15) */}
            {(!dealData.commitmentStatus || ['pending', 'pledged', 'soft-committed', 'docs-out'].includes(dealData.commitmentStatus)) && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3 text-amber-400 text-xs animate-in fade-in duration-300">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white uppercase tracking-wider text-[10px] block mb-1">Non-Binding Disclosure Notice</span>
                  All initial commitments, LOIs, and pledges made on this portal are strictly non-binding expressions of interest. Capital contributions are subject to the execution of definitive subscription agreements and off-platform confirmation of funds.
                </div>
              </div>
            )}
            
            {/* Property Header Card */}
            <section className="relative h-[340px] w-full rounded-2xl overflow-hidden border border-white/10 glass-card group">
              <img 
                alt={dealData.dealName} 
                className="w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdpxYpTQpSZyS-bVT9se97E8jC8KG1ACRvvabKdZRreVTGe9TbCA-EyNcXiMwIF5fgr4wLBcGYVP8O6G0VzI4ezRc0owWBpdoJWPXwYXXK3lffjKue6yhxtQBHnTcjaPM5LsL4wVa8DvSHkPIvuaJLffFLLIfHrLJa4rnpzWsQCXacjzaGlw76yObkHrheB2ANDh-FaARWXtQMy7sX_z3mOdlFqEur5hIQvT5LBSuOd1u3BUUujG52UVGv1hjlRImgSKFETY9UQcIR"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a0b] via-[#0d0a0b]/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-[#454955]/20 backdrop-blur-md text-[#454955] border border-[#454955]/30 px-3 py-0.5 rounded-full font-mono text-[9px] uppercase">
                    {dealData.raisePercentage ?? 0}% Raised
                  </span>
                  <h2 className="text-2xl font-light text-white tracking-tight uppercase">{dealData.dealName}</h2>
                  <p className="text-on-surface-variant flex items-center gap-1.5 text-xs">
                    <span className="material-symbols-outlined text-sm select-none">location_on</span>
                    {dealData.propertyAddress}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      if (!user) {
                        sessionStorage.setItem(`pw_pending_deal_action_${token}`, JSON.stringify({
                          action: 'insights',
                        }));
                        toast('Redirecting to registration to unlock insights...');
                        router.push(`/register?invite=${token}&name=${encodeURIComponent(subscribeForm.name)}&email=${encodeURIComponent(subscribeForm.email)}`);
                        return;
                      }
                      setShowInsights(true);
                    }}
                    className="bg-surface/60 backdrop-blur-md border border-white/10 hover:bg-surface/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all group font-mono text-[10px] uppercase"
                  >
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#454955]">folder_open</span>
                    Insights
                  </button>
                  <button 
                    onClick={() => setShowAskLeadInvestor(true)}
                    className="bg-surface/60 backdrop-blur-md border border-white/10 hover:bg-surface/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all group font-mono text-[10px] uppercase"
                  >
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#454955]">mail</span>
                    Ask LeadInvestor
                  </button>
                </div>
              </div>
            </section>

            {/* Opportunity Thesis Summary */}
            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-3">
              <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Investment Thesis</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {dealData.opportunitySummary || 'The leadInvestor has not yet published an investment thesis for this deal.'}
              </p>
            </section>

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Projected IRR</span>
                <span className="text-[#454955] text-xl font-bold text-glow">{dealData.expectedROI}%</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Target Multiple</span>
                <span className="text-[#454955] text-xl font-bold text-glow">1.8x</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Min. Commit</span>
                <span className="text-[#454955] text-xl font-bold text-glow">$25,000</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Hold Period</span>
                <span className="text-[#454955] text-xl font-bold text-glow">
                  {dealData.termMonths ? Math.round(dealData.termMonths / 12 * 10) / 10 + ' Yrs' : '3-5 Yrs'}
                </span>
              </div>
            </div>

            {/* Collapsible Underwriting Charts Block */}
            <section className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Financial Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#0d0a0b]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Net Operating Income"
                    unit="currency"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.noiHistory}
                  />
                </div>
                <div className="bg-[#0d0a0b]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Cap Rate"
                    unit="%"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.capRateHistory}
                  />
                </div>
                <div className="bg-[#0d0a0b]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Cash Flow"
                    unit="currency"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.cashFlowHistory}
                  />
                </div>
                <div className="bg-[#0d0a0b]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Daily Burn Rate"
                    unit="currency"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.burnRateHistory}
                  />
                </div>
              </div>
            </section>

            {/* Investment Terms List */}
            <section className="glass-card rounded-2xl overflow-hidden border border-white/10">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Investment Structure</h3>
              </div>
              <div className="divide-y divide-white/5">
                <div className="px-6 py-3.5 flex justify-between text-xs">
                  <span className="text-[#8a9b9b]">Asset Type</span>
                  <span className="text-white font-semibold">{dealData.assetClass || 'Multi-Family'}</span>
                </div>
                <div className="px-6 py-3.5 flex justify-between text-xs">
                  <span className="text-[#8a9b9b]">Strategy</span>
                  <span className="text-white font-semibold">{dealData.strategy || 'Value-Add'}</span>
                </div>
                <div className="px-6 py-3.5 flex justify-between text-xs">
                  <span className="text-[#8a9b9b]">Distributions</span>
                  <span className="text-white font-semibold">Quarterly</span>
                </div>
                <div className="px-6 py-3.5 flex justify-between text-xs">
                  <span className="text-[#8a9b9b]">Tax Reporting</span>
                  <span className="text-white font-semibold">K-1 (Standard)</span>
                </div>
              </div>
            </section>

            {/* Deal Updates — leadInvestor-authored progress feed (read-only for guests) */}
            <section className="glass-card rounded-2xl overflow-hidden border border-white/10">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#454955]" />
                <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Deal Updates</h3>
              </div>
              {dealUpdates.length > 0 ? (
                <div className="divide-y divide-white/5 max-h-[280px] overflow-y-auto no-scrollbar">
                  {dealUpdates.map((u) => (
                    <div key={u.id} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-white">{u.authorName}</span>
                        {u.createdAt && (
                          <span className="text-[9px] text-[#8a9b9b] font-mono">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {u.title && <p className="text-xs font-semibold text-white mb-1">{u.title}</p>}
                      <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{u.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-8 text-center">
                  <p className="text-xs text-[#8a9b9b] font-mono">No updates posted yet.</p>
                </div>
              )}
            </section>

            {/* Discussion & Q&A Board */}
            <section className="glass-card rounded-2xl overflow-hidden border border-white/10 space-y-4">
              <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-[#454955]" />
                  <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Discussion & Q&A</h3>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* 1. Own Private Question Thread */}
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8a9b9b] mb-3">Your Conversation with LeadInvestor</h4>
                  {(() => {
                    const ownInquiry = (dealData?.inquiries || []).find((i: any) => i.isOwn);
                    if (!ownInquiry) {
                      return (
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
                          <p className="text-xs text-[#8a9b9b] mb-3">Have questions about the underwriting model, exit details, or capital structure?</p>
                          <button
                            id="btn-ask-leadInvestor-qa"
                            onClick={() => setShowAskLeadInvestor(true)}
                            className="px-4 py-2 bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
                          >
                            Ask LeadInvestor a Question
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="bg-[#0d0a0b]/40 border border-white/5 rounded-xl p-4 max-h-[250px] overflow-y-auto space-y-3">
                          {ownInquiry.messages && ownInquiry.messages.length > 0 ? (
                            ownInquiry.messages.map((msg: any) => {
                              const isLeadInvestor = msg.sender === 'leadInvestor';
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col gap-1 p-3 rounded-xl max-w-[85%] text-left ${
                                    isLeadInvestor
                                      ? 'ml-auto bg-black/60 border border-[#454955]/30'
                                      : 'bg-white/5 border border-white/10'
                                  }`}
                                >
                                  <span className={`text-[9px] font-mono font-bold uppercase ${isLeadInvestor ? 'text-[#8a9b9b]' : 'text-primary'}`}>
                                    {isLeadInvestor ? 'LeadInvestor' : 'You'}
                                  </span>
                                  <p className="text-xs text-white/90 whitespace-pre-wrap">{msg.text}</p>
                                  <span className="text-[8px] text-[#8a9b9b] self-end mt-1 font-mono">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="flex flex-col gap-1 p-3 bg-white/5 border border-white/10 rounded-xl max-w-[85%] text-left">
                              <span className="text-[9px] font-bold text-primary font-mono uppercase">You</span>
                              <p className="text-xs text-white/90 whitespace-pre-wrap">{ownInquiry.message}</p>
                            </div>
                          )}
                        </div>

                        {/* Follow-up input form */}
                        <form onSubmit={handleSendFollowUpMessage} className="flex gap-2">
                          <input
                            type="text"
                            value={followUpMsg}
                            onChange={(e) => setFollowUpMsg(e.target.value)}
                            placeholder="Type a follow-up question..."
                            maxLength={2000}
                            required
                            className="flex-1 px-4 py-2.5 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                          />
                          <button
                            type="submit"
                            disabled={sendingFollowUp || !followUpMsg.trim()}
                            className="px-4 py-2.5 bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] disabled:opacity-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            {sendingFollowUp ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Send
                          </button>
                        </form>
                      </div>
                    );
                  })()}
                </div>

                {/* 2. Shared Community Questions */}
                <div className="border-t border-white/5 pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8a9b9b] mb-3">Public Q&A (Anonymized)</h4>
                  {(() => {
                    const sharedInquiries = (dealData?.inquiries || []).filter((i: any) => i.isShared && !i.isOwn);
                    if (sharedInquiries.length === 0) {
                      return (
                        <p className="text-xs text-[#8a9b9b] font-mono italic">No shared public Q&As available for this deal yet.</p>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {sharedInquiries.map((inq: any) => {
                          const question = inq.message || (inq.messages?.[0]?.text) || '';
                          const replies = inq.messages || [];

                          return (
                            <div key={inq.id} className="p-3 bg-white/5 border border-white/5 rounded-xl space-y-2 text-left">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-mono font-bold text-primary uppercase">Investor Question (Anonymous)</span>
                                <p className="text-xs text-white/90 font-mono italic font-sans">"{question}"</p>
                              </div>
                              {replies.filter((m: any) => m.sender === 'leadInvestor').map((msg: any) => (
                                <div key={msg.id} className="pl-3 border-l-2 border-[#454955]/50 mt-2">
                                  <span className="text-[8px] font-mono font-bold text-[#8a9b9b] uppercase">LeadInvestor Response</span>
                                  <p className="text-xs text-white/80 whitespace-pre-wrap mt-0.5">{msg.text}</p>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* LOI/Subscription Response & Execution Box */}
            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-6">
              {/* Current Response State Banners */}
              {dealData.status === 'declined' && (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-950/20 text-red-400 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">Opportunity Declined</span>
                  </div>
                  <p className="text-xs text-[#8a9b9b]">
                    You have declined this invitation. You can change your response at any time using the button below.
                  </p>
                  <button
                    onClick={handleReopen}
                    disabled={submitting}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold font-mono border border-white/10 transition"
                  >
                    Change Response
                  </button>
                </div>
              )}

              {dealData.status === 'interested' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-400 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.05)]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="font-semibold text-sm">Interest Logged // Double Opt-In Active</span>
                    </div>
                    <p className="text-xs text-[#8a9b9b] leading-relaxed">
                      You indicated you are interested.
                      {dealData.cardExchangeStatus === 'accepted'
                        ? ' The Lead Investor has accepted the business card exchange. Contact details are now unlocked below.'
                        : ' The business card exchange is pending leadInvestor acceptance. Your contact details are hidden until they opt-in and release their card.'}
                    </p>
                    <button
                      onClick={handleReopen}
                      disabled={submitting}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold font-mono border border-white/10 transition"
                    >
                      Change Response
                    </button>
                  </div>

                  {/* Render Business Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Invitee Card (Always visible to invitee) */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between h-48 group hover:border-white/20 transition-all duration-300">
                      <div className="absolute top-0 right-0 bg-[#454955]/10 border-l border-b border-white/15 px-3 py-1 rounded-bl-xl text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider font-mono">
                        Your Shared Card
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono mt-2">
                          {dealData.inviteeBusinessCard?.name || dealData.investorName}
                        </h4>
                        <p className="text-[10px] text-[#8a9b9b]">
                          {dealData.inviteeBusinessCard?.company || 'Co-Investor'}
                        </p>
                      </div>
                      <div className="space-y-1 text-xs text-[#8a9b9b] mt-4 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-[#454955]">mail</span>
                          <span>{dealData.inviteeBusinessCard?.email || dealData.investorEmail}</span>
                        </div>
                        {dealData.inviteeBusinessCard?.phone && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#454955]">call</span>
                            <span>{dealData.inviteeBusinessCard.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* LeadInvestor Card (Conditional on Accept) */}
                    {dealData.cardExchangeStatus === 'accepted' && dealData.leadInvestorBusinessCard ? (
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.01] p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between h-48 group hover:border-white/20 transition-all duration-300">
                        <div className="absolute top-0 right-0 bg-emerald-500/10 border-l border-b border-emerald-500/20 px-3 py-1 rounded-bl-xl text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">
                          LeadInvestor Card Unlocked
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono mt-2">
                            {dealData.leadInvestorBusinessCard.name}
                          </h4>
                          <p className="text-[10px] text-[#8a9b9b]">
                            {dealData.leadInvestorBusinessCard.company || 'Lead Investor'}
                          </p>
                        </div>
                        <div className="space-y-1 text-xs text-[#8a9b9b] mt-2 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-emerald-400">mail</span>
                            <span>{dealData.leadInvestorBusinessCard.email}</span>
                          </div>
                          {dealData.leadInvestorBusinessCard.phone && (
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-emerald-400">call</span>
                              <span>{dealData.leadInvestorBusinessCard.phone}</span>
                            </div>
                          )}
                        </div>
                        {dealData.leadInvestorBusinessCard.uid && (
                          <div className="mt-3">
                            <FollowInvestorButton
                              investorUid={dealData.leadInvestorBusinessCard.uid}
                              investorName={dealData.leadInvestorBusinessCard.name}
                              isFollowing={false}
                              className="w-full justify-center !py-1.5 !px-3 text-[10px] font-mono uppercase tracking-wider"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-6 flex flex-col items-center justify-center text-center h-48">
                        <span className="material-symbols-outlined text-3xl text-white/20 animate-pulse mb-3">lock</span>
                        <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">Exchange Pending</h4>
                        <p className="text-[10px] text-[#8a9b9b] mt-1 max-w-[200px] leading-relaxed">
                          LeadInvestor details are locked. They will release upon mutual acceptance.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dealData.status === 'accepted' && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/5 text-white space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-semibold text-sm">Commitment Pledged</span>
                  </div>
                  <p className="text-xs text-[#8a9b9b]">
                    Your LOI/Subscription commitment is recorded. The leadInvestor will verify details and reach out.
                  </p>
                  {!['signed', 'funds-confirmed', 'cleared'].includes(dealData.commitmentStatus || '') && (
                    <button
                      onClick={handleReopen}
                      disabled={submitting}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-semibold font-mono border border-white/10 transition"
                    >
                      Change Response
                    </button>
                  )}
                </div>
              )}

              {/* Three-Button Response Primitive (only if pending) */}
              {(dealData.status === 'pending') && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-[#8a9b9b] uppercase tracking-wider font-mono">Select Response</h4>
                  {showDeclineReason ? (
                    <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                      <label className="block text-[10px] font-bold text-white uppercase tracking-wider">Decline Reason (Optional)</label>
                      <textarea
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Tell us why you are declining (optional)..."
                        className="w-full text-xs p-3 rounded bg-black border border-white/10 text-white font-mono min-h-[80px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setShowDeclineReason(false);
                            setDeclineReason('');
                          }}
                          className="px-3 py-1.5 rounded border border-white/10 text-xs font-semibold text-[#8a9b9b] hover:text-white transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDecline(declineReason)}
                          disabled={submitting}
                          className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition"
                        >
                          Confirm Decline
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                        <button
                          id="btn-interested"
                          onClick={() => setShowCardModal(true)}
                          disabled={submitting}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(69,73,85,0.2)]"
                        >
                          <span className="material-symbols-outlined text-sm">favorite</span>
                          I'm Interested
                        </button>
                        <button
                          id="btn-ask-question"
                          onClick={() => setShowAskLeadInvestor(true)}
                          className="flex-1 py-3 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">help</span>
                          Ask Question
                        </button>
                      </div>
                      <button
                        id="btn-decline-offer"
                        onClick={() => setShowDeclineReason(true)}
                        disabled={submitting}
                        className="w-full py-3 px-4 rounded-xl border border-red-500/20 hover:bg-red-500/5 text-red-400 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Decline Invitation
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Signature section — only visible if pending or interested or accepted (to proceed with formal commitment) */}
              {(dealData.status === 'pending' || dealData.status === 'interested' || dealData.status === 'accepted') && (
                <div className="border-t border-white/5 pt-6 space-y-6">
                  {['signed', 'funds-confirmed', 'cleared'].includes(dealData.commitmentStatus || '') ? (
                    <div className="flex flex-col items-center justify-center text-center py-4 space-y-3">
                      <CheckCircle2 className="w-12 h-12 text-[#454955] animate-pulse" />
                      <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Subscription Executed</h3>
                      <p className="text-xs text-[#8a9b9b] max-w-sm leading-relaxed">
                        Your definitive subscription agreement has been signed. 
                        {dealData.commitmentStatus === 'signed' 
                          ? " We are awaiting leadInvestor verification of your capital deposit."
                          : " Your funding is confirmed and active in the capital stack!"}
                      </p>
                    </div>
                  ) : (dealData.commitmentStatus === 'soft-committed' || dealData.commitmentStatus === 'pledged') && dealData.status === 'accepted' ? (
                    <div className="flex flex-col items-center justify-center text-center py-4 space-y-3">
                      <Clock className="w-12 h-12 text-[#8a9b9b] animate-bounce" />
                      <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">LOI Signed & Registered</h3>
                      <p className="text-xs text-[#8a9b9b] max-w-md leading-relaxed">
                        Thank you! Your preliminary soft-commitment is recorded. The leadInvestor is preparing your definitive Subscription Agreement. You will receive an email once it is ready for execution.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                        <FileText className="w-4 h-4 text-[#454955]" />
                        <h3 className="font-mono text-[10px] font-bold text-white uppercase tracking-[0.2em]">
                          {dealData.commitmentStatus === 'docs-out' ? 'Subscription Agreement — Execution' : 'Letter of Intent — Execution'}
                        </h3>
                      </div>

                      <div className="space-y-3 font-mono text-xs max-w-lg">
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-[#8a9b9b]">Legal Entity</span>
                          <span className="text-white font-semibold">{dealData.legalEntity || 'PaperWorking Holdings LLC'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-[#8a9b9b]">Commitment Amount</span>
                          <span className="text-[#454955] font-bold">${investmentAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-[#8a9b9b]">Equity Split</span>
                          <span className="text-white font-semibold">{dealData.equitySplit}%</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                          <span className="text-[#8a9b9b]">Interest Rate</span>
                          <span className="text-white font-semibold">{dealData.interestRate}% per annum</span>
                        </div>
                        <div className="flex justify-between py-1.5">
                          <span className="text-[#8a9b9b]">Term Length</span>
                          <span className="text-white font-semibold">{dealData.termMonths} months</span>
                        </div>
                      </div>

                      {dealData.commitmentStatus === 'docs-out' && dealData.subscriptionAgreementTemplate ? (
                        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between text-xs text-[#8a9b9b]">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#7A9EAA]" />
                            <span>Definitive Document: <strong>{dealData.subscriptionAgreementTemplate.name}</strong></span>
                          </div>
                          <a
                            href={dealData.subscriptionAgreementTemplate.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-white font-bold text-[10px] uppercase tracking-wider hover:text-white/80 transition"
                          >
                            Download PDF
                          </a>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#8a9b9b] leading-relaxed">
                          This Letter of Intent represents your commitment to proceed under the terms outlined above, and is subject to the final execution of a definitive subscription agreement.
                        </p>
                      )}

                      {/* Canvas Signature Pad */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Draw Digital Signature</label>
                          {hasSigned && (
                            <button
                              onClick={clearSignature}
                              className="text-[9px] text-[#8a9b9b] hover:text-white transition uppercase font-mono border-b border-dashed border-[#8a9b9b]"
                            >
                              Clear Signature
                            </button>
                          )}
                        </div>

                        <div className="relative border border-dashed border-white/20 rounded-xl overflow-hidden bg-white">
                          <canvas
                            id="loi-signature-canvas"
                            ref={canvasRef}
                            width={600}
                            height={120}
                            className="w-full cursor-crosshair h-[120px]"
                            onMouseDown={startDraw}
                            onMouseMove={draw}
                            onMouseUp={stopDraw}
                            onMouseLeave={stopDraw}
                            onTouchStart={startDraw}
                            onTouchMove={draw}
                            onTouchEnd={stopDraw}
                          />
                          {!hasSigned && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                              <p className="text-xs text-[#9E9DA0] font-mono">DRAW SIGNATURE HERE</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {submitError && (
                        <div className="p-4 border border-red-500/20 bg-red-950/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm select-none">error</span>
                          <span>{submitError}</span>
                        </div>
                      )}

                      <div className="flex flex-col gap-3 pt-2">
                        <button
                          id="btn-commit-capital"
                          onClick={handleCommitCTA}
                          disabled={!hasSigned || submitting}
                          className="w-full py-4 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.3)] active:scale-98"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#0d0a0b]" />
                          ) : (
                            <span className="material-symbols-outlined text-sm select-none">payments</span>
                          )}
                          {submitting 
                            ? 'Executing...' 
                            : dealData.commitmentStatus === 'docs-out' 
                            ? 'Execute Subscription' 
                            : 'Digitally Sign & Commit'}
                        </button>

                        {dealData.commitmentStatus === 'docs-out' && (
                          <div className="border-t border-white/5 pt-4">
                            {activeSubManualSign ? (
                              <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                <span className="font-bold text-white uppercase tracking-wider text-[10px] block">Upload Manual Signed Copy</span>
                                <input
                                  type="text"
                                  placeholder="e.g. Countersigned subscription doc uploaded to Project Files"
                                  value={subManualEvidence}
                                  onChange={(e) => setSubManualEvidence(e.target.value)}
                                  className="w-full text-xs p-3 rounded bg-black border border-white/10 text-white font-mono"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => {
                                      setActiveSubManualSign(false);
                                      setSubManualEvidence('');
                                    }}
                                    className="px-3 py-1.5 rounded border border-white/10 text-xs font-semibold text-[#8a9b9b] hover:text-white transition"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSignSubscription('manual')}
                                    disabled={!subManualEvidence.trim() || submitting}
                                    className="px-3 py-1.5 rounded bg-[#454955] text-black text-xs font-bold transition disabled:opacity-50"
                                  >
                                    Confirm Signed
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setActiveSubManualSign(true)}
                                className="w-full py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-[#8a9b9b] hover:text-white font-bold text-[10px] uppercase tracking-wider transition font-mono"
                              >
                                Or Upload Manually Signed Copy
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>

          </div>

          {/* Right Column: Sticky Raise Widget */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 space-y-6">
              
              {/* Capital Progress Widget */}
              <div className="glass-card p-6 md:p-8 rounded-2xl border border-white/10 space-y-6 shadow-2xl">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Co-Investment Status</span>
                      <h4 className="text-2xl font-bold text-white tracking-tight mt-1">
                        ${(dealData.raiseRaised ?? 0).toLocaleString()}
                      </h4>
                    </div>
                    <span className="text-xs text-[#8a9b9b]">of ${(dealData.raiseTarget ?? 0).toLocaleString()}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#454955] rounded-full transition-all duration-1000 shadow-[0_0_8px_#454955]"
                        style={{ width: `${dealData.raisePercentage ?? 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#454955] font-bold">{dealData.raisePercentage ?? 0}% Allocated</span>
                    <span className="text-[#8a9b9b]">
                      ${Math.max(0, (dealData.raiseTarget ?? 0) - (dealData.raiseRaised ?? 0)).toLocaleString()} Remaining
                    </span>
                  </div>
                </div>

                {/* Investment Amount — set by the leadInvestor at invite time, not editable here */}
                <div className="space-y-2 border-t border-white/5 pt-5">
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Your Proposed Allocation</label>
                  <div className="w-full px-4 py-3.5 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-white font-mono text-sm">
                    ${investmentAmount.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-[#8a9b9b] font-mono">Set by the leadInvestor for this invitation.</p>
                </div>

                {/* Submit Commit CTA */}
                <button
                  onClick={handleCommitCTA}
                  disabled={submitting || ['signed', 'funds-confirmed', 'cleared'].includes(dealData.commitmentStatus || '')}
                  className="w-full py-4 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.2)] active:scale-98 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm select-none">payments</span>
                  {dealData.commitmentStatus === 'docs-out'
                    ? 'EXECUTE SUBSCRIPTION'
                    : ['signed', 'funds-confirmed', 'cleared'].includes(dealData.commitmentStatus || '')
                    ? 'SUBSCRIPTION EXECUTED'
                    : dealData.commitmentStatus === 'soft-committed'
                    ? 'COMMITMENT REGISTERED'
                    : user
                    ? 'RECORD COMMITMENT'
                    : 'SIGN IN TO RESPOND'}
                </button>

                {/* Timer Countdown */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-[#8a9b9b] font-mono">
                  <Clock className="w-4 h-4 text-[#454955]" />
                  <span>
                    Deal closing in: <strong className="text-white font-bold">{dealData.daysLeft ?? 0}d {dealData.hoursLeft ?? 0}h</strong>
                  </span>
                </div>

                {/* Soft Commit / Indication of Interest Widget */}
                <SoftCommitWidget
                  token={token}
                  initialIndication={(dealData as any).indication}
                  onUpdate={(updatedIndication) => {
                    setDealData(prev => prev ? { ...prev, indication: updatedIndication } as any : null);
                  }}
                />

              </div>

              {/* Encryption & Security Info */}
              <div className="px-2 flex items-start gap-3 text-xs text-[#8a9b9b] leading-normal">
                <Lock className="w-4 h-4 text-[#454955] shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-white">Encrypted Digital Vault</h5>
                  <p className="text-[10px] mt-0.5">All transmissions, credentials, and digital signatures are encrypted using bank-grade AES-256 protocols.</p>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* Floating Bottom Nav Bar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 w-full z-[70] flex justify-between items-center px-6 py-4 bg-surface/90 backdrop-blur-2xl border-t border-white/10 md:hidden">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-primary transition-all font-mono text-[9px] uppercase font-bold"
        >
          <span className="material-symbols-outlined text-xl select-none">arrow_back</span>
          Back
        </button>
        <button
          onClick={() => {
            signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-[#454955] text-[#0d0a0b] rounded-xl px-5 py-2.5 shadow-[0_0_15px_rgba(69,73,85,0.2)] active:scale-95 transition-all font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm select-none">handshake</span>
          Respond
        </button>
      </nav>

      {/* Modal: Insights */}
      {showInsights && (
        <div id="insights-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0d0a0b]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Secure Insights Vault</h3>
                <p className="text-[10px] text-[#8a9b9b] mt-0.5">Project: {dealData.dealName}</p>
              </div>
              <button
                onClick={() => setShowInsights(false)}
                className="material-symbols-outlined text-[#8a9b9b] hover:text-white select-none"
              >
                close
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[360px] overflow-y-auto no-scrollbar">
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FileText className="w-8 h-8 text-[#454955]/40" />
                <p className="text-xs text-[#8a9b9b] font-mono">
                  The leadInvestor hasn&apos;t shared any documents with investors yet.
                </p>
              </div>
            </div>

            <div className="p-5 border-t border-white/5 bg-[#0d0a0b]/50 flex justify-end">
              <button 
                onClick={() => setShowInsights(false)}
                className="px-5 py-2 rounded-lg bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] text-[10px] font-bold uppercase tracking-wider transition-colors"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ask LeadInvestor */}
      {showAskLeadInvestor && (
        <div id="ask-leadInvestor-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0d0a0b]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Inquire LeadInvestor</h3>
                <p className="text-[10px] text-[#8a9b9b] mt-0.5">Direct Channel // {dealData.dealName}</p>
              </div>
              <button 
                onClick={() => setShowAskLeadInvestor(false)}
                className="material-symbols-outlined text-[#8a9b9b] hover:text-white select-none"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSendLeadInvestorMessage} className="p-6 space-y-4">
              {askError && (
                <div className="p-3 border border-red-500/20 bg-red-950/20 text-red-400 rounded-xl text-xs">
                  {askError}
                </div>
              )}
              <div>
                <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-2">Your Inquiry</label>
                <textarea
                  id="ask-leadInvestor-textarea"
                  value={leadInvestorMessage}
                  onChange={(e) => setLeadInvestorMessage(e.target.value)}
                  placeholder="Ask a question about the capital stack, construction timelines, zoning approvals, or underwriting models..."
                  rows={4}
                  maxLength={2000}
                  required
                  className="w-full p-4 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAskLeadInvestor(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  id="ask-leadInvestor-submit-btn"
                  type="submit"
                  disabled={sendingLeadInvestorMsg}
                  className="flex-1 py-3 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.2)]"
                >
                  {sendingLeadInvestorMsg ? (
                    <span className="material-symbols-outlined text-sm animate-spin select-none">progress_activity</span>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sendingLeadInvestorMsg ? 'Transmitting...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Business Card Confirmation */}
      {showCardModal && (
        <div id="card-exchange-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0d0a0b]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Business Card Exchange</h3>
                <p className="text-[10px] text-[#8a9b9b] mt-0.5">Opt-in // Double disclosure contract</p>
              </div>
              <button 
                onClick={() => setShowCardModal(false)}
                className="material-symbols-outlined text-[#8a9b9b] hover:text-white select-none"
              >
                close
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-[#8a9b9b] leading-relaxed">
                Provide the contact details you wish to disclose to the Lead Investor. Your details are only released if the Lead Investor accepts the exchange and releases theirs.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    required
                    className="w-full p-3 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    value={cardEmail}
                    onChange={(e) => setCardEmail(e.target.value)}
                    required
                    className="w-full p-3 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={cardPhone}
                    onChange={(e) => setCardPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 019-2834"
                    className="w-full p-3 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-1">Company / Organization (Optional)</label>
                  <input
                    type="text"
                    value={cardCompany}
                    onChange={(e) => setCardCompany(e.target.value)}
                    placeholder="e.g. Apex Holdings"
                    className="w-full p-3 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#454955] transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCardModal(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleInterested()}
                  disabled={submitting || !cardName || !cardEmail}
                  className="flex-1 py-3 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.2)]"
                >
                  {submitting ? (
                    <span className="material-symbols-outlined text-sm animate-spin select-none">progress_activity</span>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {submitting ? 'Sharing...' : 'Confirm Interest'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Link helper component for navigation */}
      <style jsx global>{`
        Link {
          cursor: pointer;
        }
      `}</style>

    </div>
  );
}

function Link({ href, children, className, title, id }: { href: string; children: React.ReactNode; className?: string; title?: string; id?: string }) {
  const router = useRouter();
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(href);
  };
  return (
    <a href={href} onClick={handleClick} className={className} title={title} id={id}>
      {children}
    </a>
  );
}
