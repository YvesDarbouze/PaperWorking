'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Shield, FileText, Home, Pen, Mail, Send, Clock, Lock, TrendingUp, Coins, HelpCircle, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MetricChart } from '@/components/metrics/MetricChart';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Guest Portal — External Investor View (Luminous Glass)

   Route: /invest/[token]

   token = an `invitations` collection token (see
   /api/invitations/[token], /respond, /ask, /updates).

   Renders the opportunity summary, bento metrics, terms,
   financial charts, and lets an investor record their
   intention to invest (accept/decline). PaperWorking never
   moves money here — accepting creates a `pledged` commitment
   that the deal sponsor later confirms manually via
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
  status: 'pending' | 'accepted' | 'declined' | 'expired';
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

  // Deal updates (sponsor-authored progress feed, read-only for guests)
  const [dealUpdates, setDealUpdates] = useState<DealUpdate[]>([]);

  // Subscribe Gate States
  const [isSubscribedInSession, setIsSubscribedInSession] = useState(false);
  const [subscribeForm, setSubscribeForm] = useState({ name: '', email: '' });
  const [submittingSubscribe, setSubmittingSubscribe] = useState(false);

  // Modals state
  const [showInsights, setShowInsights] = useState(false);
  const [showAskSponsor, setShowAskSponsor] = useState(false);
  const [sponsorMessage, setSponsorMessage] = useState('');
  const [sendingSponsorMsg, setSendingSponsorMsg] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  // The investment amount is set by the sponsor at invite time
  // (invitation.proposedAmount) — the investor cannot edit it; the
  // backend (`/api/invitations/respond`) ignores any client-supplied amount.
  const investmentAmount = dealData?.investmentAmount ?? 0;

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSubscribe(true);
    try {
      const res = await fetch(`/api/invitations/${token}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subscribeForm.name,
          email: subscribeForm.email,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubscribedInSession(true);
        toast.success('Subscription confirmed! Deal details unlocked.');
      } else {
        toast.error(data.error || 'Failed to confirm subscription.');
      }
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
          setSubscribeForm({
            name: data.investorName || '',
            email: data.investorEmail || '',
          });
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

  // Read-only guest updates feed — plain fetch, not a client Firestore
  // subscription, so no public security rules are needed on the subcollection.
  useEffect(() => {
    if (!token || !dealData) return;
    fetch(`/api/invitations/${token}/updates`)
      .then((res) => res.json())
      .then((data) => setDealUpdates(data.updates || []))
      .catch(() => setDealUpdates([]));
  }, [token, dealData]);

  const alreadyResponded = dealData?.status === 'accepted' || dealData?.status === 'declined';

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
  // moves here; the sponsor confirms later once funds actually arrive.
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

  // Commit CTA in sidebar (scrolls to signature if not yet signed)
  const handleCommitCTA = () => {
    if (!user) {
      router.push(`/login?redirectTo=${encodeURIComponent('/invest/' + token)}`);
      return;
    }
    if (!hasSigned) {
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast('Draw your signature below to record your commitment.', { icon: '✍️' });
      return;
    }
    handleSign();
  };

  // Decline — real, persisted response. The sponsor is notified server-side
  // (real email via /api/invitations/respond), not by a client-side toast.
  const handleDecline = async () => {
    try {
      setSubmitting(true);
      setSubmitError(null);
      const res = await fetch('/api/invitations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'decline' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealData((prev) => (prev ? { ...prev, status: 'declined' } : prev));
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

  // Ask Sponsor — real, persisted question + real email to the sponsor.
  const handleSendSponsorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorMessage.trim()) return;
    setSendingSponsorMsg(true);
    setAskError(null);
    try {
      const res = await fetch(`/api/invitations/${token}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sponsorMessage.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSponsorMessage('');
        setShowAskSponsor(false);
        toast.success('Your question was sent to the sponsor.');
      } else {
        setAskError(data.error || 'Failed to send your question.');
      }
    } catch (err) {
      console.error('Ask sponsor failed:', err);
      setAskError('An unexpected error occurred. Please try again.');
    } finally {
      setSendingSponsorMsg(false);
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
            This invitation link type is no longer supported. Please contact your sponsor for a new invitation.
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
            This secure investment link has expired, been revoked, or is no longer valid. Please contact the sponsor to request a new invitation.
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
                ? 'Your intention to invest has been recorded and the sponsor has been notified. They will confirm once funds are received and follow up with formal subscription papers.'
                : 'You have declined this investment opportunity. The deal sponsor has been notified.'}
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
                  PLEDGED — AWAITING SPONSOR CONFIRMATION
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
                    onClick={() => setShowInsights(true)}
                    className="bg-surface/60 backdrop-blur-md border border-white/10 hover:bg-surface/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all group font-mono text-[10px] uppercase"
                  >
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#454955]">folder_open</span>
                    Insights
                  </button>
                  <button 
                    onClick={() => setShowAskSponsor(true)}
                    className="bg-surface/60 backdrop-blur-md border border-white/10 hover:bg-surface/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all group font-mono text-[10px] uppercase"
                  >
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#454955]">mail</span>
                    Ask Sponsor
                  </button>
                </div>
              </div>
            </section>

            {/* Opportunity Thesis Summary */}
            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-3">
              <h3 className="font-mono text-[10px] font-bold text-[#454955] uppercase tracking-[0.2em]">Investment Thesis</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {dealData.opportunitySummary || 'The sponsor has not yet published an investment thesis for this deal.'}
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

            {/* Deal Updates — sponsor-authored progress feed (read-only for guests) */}
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

            {/* LOI Preview & Signature Box */}
            <section ref={signatureSectionRef} className="glass-card p-6 md:p-8 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="w-4 h-4 text-[#454955]" />
                <h3 className="font-mono text-[10px] font-bold text-white uppercase tracking-[0.2em]">Letter of Intent — Execution</h3>
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

              <p className="text-[11px] text-[#8a9b9b] leading-relaxed">
                This Letter of Intent represents your commitment to proceed under the terms outlined above, and is subject to the final execution of a definitive subscription agreement.
              </p>

              {/* Canvas Signature Pad */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Draw Digital Signature</label>
                  {hasSigned && user && (
                    <button
                      onClick={clearSignature}
                      className="text-[9px] text-[#8a9b9b] hover:text-white transition uppercase font-mono border-b border-dashed border-[#8a9b9b]"
                    >
                      Clear Signature
                    </button>
                  )}
                </div>

                <div className={`relative border border-dashed border-white/20 rounded-xl overflow-hidden bg-white ${!user ? 'opacity-40' : ''}`}>
                  <canvas
                    id="loi-signature-canvas"
                    ref={canvasRef}
                    width={600}
                    height={120}
                    className={`w-full cursor-crosshair h-[120px] ${!user ? 'pointer-events-none' : ''}`}
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

              {/* Submit Error */}
              {submitError && (
                <div className="p-4 border border-red-500/20 bg-red-950/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm select-none">error</span>
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  id="btn-commit-capital"
                  onClick={handleSign}
                  disabled={!user || !hasSigned || submitting}
                  className="flex-1 py-4 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.3)] active:scale-98"
                >
                  {submitting ? (
                    <span className="material-symbols-outlined text-sm animate-spin select-none">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm select-none">payments</span>
                  )}
                  {submitting ? 'Recording Signature...' : 'Digitally Sign & Commit'}
                </button>
                <button
                  id="btn-decline-offer"
                  onClick={handleDecline}
                  disabled={!user || submitting}
                  className="py-4 px-6 rounded-xl border border-white/10 hover:bg-white/5 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider transition-all active:scale-98 disabled:opacity-50"
                >
                  Decline Offer
                </button>
              </div>
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

                {/* Investment Amount — set by the sponsor at invite time, not editable here */}
                <div className="space-y-2 border-t border-white/5 pt-5">
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Your Proposed Allocation</label>
                  <div className="w-full px-4 py-3.5 bg-[#0d0a0b]/80 border border-white/10 rounded-xl text-white font-mono text-sm">
                    ${investmentAmount.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-[#8a9b9b] font-mono">Set by the sponsor for this invitation.</p>
                </div>

                {/* Submit Commit CTA */}
                <button
                  onClick={handleCommitCTA}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.2)] active:scale-98 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm select-none">payments</span>
                  {user ? 'RECORD COMMITMENT' : 'SIGN IN TO RESPOND'}
                </button>

                {/* Timer Countdown */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-[#8a9b9b] font-mono">
                  <Clock className="w-4 h-4 text-[#454955]" />
                  <span>
                    Deal closing in: <strong className="text-white font-bold">{dealData.daysLeft ?? 0}d {dealData.hoursLeft ?? 0}h</strong>
                  </span>
                </div>

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
          onClick={handleDecline}
          disabled={!user || submitting}
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-red-400 transition-all font-mono text-[9px] uppercase font-bold disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-xl select-none">cancel</span>
          Decline
        </button>
        <button
          onClick={handleCommitCTA}
          disabled={submitting}
          className="bg-[#454955] text-[#0d0a0b] rounded-xl px-5 py-2.5 shadow-[0_0_15px_rgba(69,73,85,0.2)] active:scale-95 transition-all font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-sm select-none">payments</span>
          Commit
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
                  The sponsor hasn&apos;t shared any documents with investors yet.
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

      {/* Modal: Ask Sponsor */}
      {showAskSponsor && (
        <div id="ask-sponsor-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#0d0a0b]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Inquire Sponsor</h3>
                <p className="text-[10px] text-[#8a9b9b] mt-0.5">Direct Channel // {dealData.dealName}</p>
              </div>
              <button 
                onClick={() => setShowAskSponsor(false)}
                className="material-symbols-outlined text-[#8a9b9b] hover:text-white select-none"
              >
                close
              </button>
            </div>

            <form onSubmit={handleSendSponsorMessage} className="p-6 space-y-4">
              {askError && (
                <div className="p-3 border border-red-500/20 bg-red-950/20 text-red-400 rounded-xl text-xs">
                  {askError}
                </div>
              )}
              <div>
                <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-2">Your Inquiry</label>
                <textarea
                  id="ask-sponsor-textarea"
                  value={sponsorMessage}
                  onChange={(e) => setSponsorMessage(e.target.value)}
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
                  onClick={() => setShowAskSponsor(false)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  id="ask-sponsor-submit-btn"
                  type="submit"
                  disabled={sendingSponsorMsg}
                  className="flex-1 py-3 rounded-xl bg-[#454955] hover:bg-[#454955]/90 text-[#0d0a0b] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(69,73,85,0.2)]"
                >
                  {sendingSponsorMsg ? (
                    <span className="material-symbols-outlined text-sm animate-spin select-none">progress_activity</span>
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  {sendingSponsorMsg ? 'Transmitting...' : 'Send Message'}
                </button>
              </div>
            </form>
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
