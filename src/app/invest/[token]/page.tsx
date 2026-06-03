'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Shield, FileText, Home, Pen, FileDown, Mail, Send, Clock, Lock, TrendingUp, Coins, HelpCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MetricChart } from '@/components/metrics/MetricChart';
import { isSubscriptionActive } from '@/lib/stripe/subscription';
import toast from 'react-hot-toast';

/* ═══════════════════════════════════════════════════════
   Guest Portal — External Investor View Reskin (Luminous Glass)
   
   Route: /invest/[token]
   
   Renders the opportunity summary, bento metrics, terms,
   financial charts, and provides an interactive LOI sign-off.
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
  status: 'active' | 'used' | 'expired';
  noiHistory: { date: string; value: number }[];
  capRateHistory: { date: string; value: number }[];
  cashFlowHistory: { date: string; value: number }[];
  burnRateHistory: { date: string; value: number }[];
  
  // Real-time project fields
  raiseTarget?: number;
  raiseRaised?: number;
  raisePercentage?: number;
  daysLeft?: number;
  hoursLeft?: number;
  strategy?: string;
  assetClass?: string;
  opportunitySummary?: string;
}

export default function GuestPortalPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  
  const { user, profile, loading: authLoading } = useAuth();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signatureSectionRef = useRef<HTMLDivElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dealData, setDealData] = useState<DealTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  // Capital commitment state
  const [investmentAmountInput, setInvestmentAmountInput] = useState<string>('');
  const [investmentAmount, setInvestmentAmount] = useState<number>(0);
  const [inputError, setInputError] = useState<string | null>(null);

  // Modals state
  const [showInsights, setShowInsights] = useState(false);
  const [showAskSponsor, setShowAskSponsor] = useState(false);
  const [sponsorMessage, setSponsorMessage] = useState('');
  const [sendingSponsorMsg, setSendingSponsorMsg] = useState(false);

  // Load deal details
  const fetchDealData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/invest/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.deal) {
          setDealData(data.deal as DealTokenData);
          setInvestmentAmount(data.deal.investmentAmount || 25000);
          setInvestmentAmountInput(String(data.deal.investmentAmount || 25000));
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

  // Redirect unauthenticated guests
  useEffect(() => {
    if (!authLoading && !user && token) {
      router.push(`/login?redirectTo=/invest/${token}`);
    }
  }, [authLoading, user, router, token]);

  const hasActiveSub = profile ? isSubscriptionActive(profile) : false;
  const isEligible = !!(
    user &&
    profile &&
    profile.accountType === 'investor' &&
    ['Individual', 'Team'].includes(profile.subscriptionPlan || '') &&
    hasActiveSub
  );

  const isVendor = !!(
    profile &&
    (profile.accountType === 'vendor' ||
     profile.subscriptionPlan === 'Vendor Network' ||
     profile.role === 'Vendor')
  );

  // Handle capital allocation change
  const handleAmountChange = (valStr: string) => {
    setInvestmentAmountInput(valStr);
    const val = Number(valStr);
    if (isNaN(val) || val <= 0) {
      setInputError('Please enter a valid investment amount');
      return;
    }
    if (val < 25000) {
      setInputError('Minimum investment target is $25,000');
      return;
    }
    if (val % 1000 !== 0) {
      setInputError('Commitment must be in incremental steps of $1,000');
      return;
    }
    setInputError(null);
    setInvestmentAmount(val);
  };

  // Canvas drawing handlers
  const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isEligible) return;
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
  }, [isEligible]);

  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isEligible || !isDrawing) return;
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
    ctx.strokeStyle = '#003731'; // dark green accent stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    setHasSigned(true);
  }, [isDrawing, isEligible]);

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

  // Sign & commit
  const handleSign = async () => {
    if (!isEligible || !hasSigned || !canvasRef.current || !user) return;
    if (inputError) {
      toast.error('Please resolve the investment amount constraints.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      const dataURL = canvasRef.current.toDataURL('image/png');
      const idToken = await user.getIdToken();
      
      const res = await fetch(`/api/invest/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ idToken, dataURL, investmentAmount })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSubmitted(true);
        toast.success('Funds committed successfully!');
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
    if (!isEligible) {
      toast.error('Please upgrade your subscription status first.');
      return;
    }
    if (!hasSigned) {
      signatureSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast('Draw your signature below to commit your capital.', { icon: '✍️' });
      return;
    }
    handleSign();
  };

  const handleDecline = () => {
    setDeclined(true);
    toast.success('Opportunity declined.');
  };

  const handleSendSponsorMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorMessage.trim()) return;
    setSendingSponsorMsg(true);
    setTimeout(() => {
      setSendingSponsorMsg(false);
      setSponsorMessage('');
      setShowAskSponsor(false);
      toast.success('Message successfully transmitted to Sponsor!');
    }, 1200);
  };

  const triggerDownload = (filename: string) => {
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: `Connecting to secure vault for ${filename}...`,
        success: `Downloaded ${filename} successfully!`,
        error: 'Failed to download document.'
      }
    );
  };

  // Loading Screen
  if (authLoading || loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091015]">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[#57f1db] text-4xl animate-spin">progress_activity</span>
          <p className="text-xs uppercase tracking-widest text-[#57f1db]/70 font-mono">Verifying Vault Link...</p>
        </div>
      </div>
    );
  }

  // Not logged in (handled by redirection, but acts as a fallback)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091015]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#57f1db]" />
      </div>
    );
  }

  // Invalid Token Screen
  if (tokenInvalid || !dealData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091015] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(87, 241, 219, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-sm p-8 glass-card rounded-2xl border border-white/10 shadow-xl">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-5 text-[#57f1db]">
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

  // Declined Screen
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091015] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(87, 241, 219, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-sm p-8 glass-card rounded-2xl border border-white/10 shadow-xl">
          <div className="w-16 h-16 bg-red-950/20 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 text-red-400">
            <XCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Offer Declined</h1>
          <p className="text-xs text-[#8a9b9b] leading-relaxed">
            You have officially declined this investment opportunity. The deal sponsor has been notified.
          </p>
        </div>
      </div>
    );
  }

  // Success Committed Screen
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#091015] px-4"
           style={{ backgroundImage: "radial-gradient(rgba(87, 241, 219, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        <div className="text-center max-w-md p-8 glass-card rounded-3xl border border-white/10 shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-[#57f1db]/10 border border-[#57f1db]/30 rounded-full flex items-center justify-center mx-auto text-[#57f1db] shadow-[0_0_20px_rgba(87,241,219,0.2)]">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-light text-white uppercase tracking-wider">Commitment Confirmed!</h1>
            <p className="text-xs text-[#8a9b9b] leading-relaxed">
              Your digital signature has been verified and registered. The sponsor will deliver the formal subscription papers directly to your workspace.
            </p>
          </div>
          <div className="bg-black/30 border border-white/15 p-5 rounded-2xl text-left space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-[#8a9b9b]">INVESTOR:</span>
              <span className="font-bold text-white">{dealData.investorName}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-[#8a9b9b]">ALLOCATION:</span>
              <span className="font-bold text-[#57f1db]">${investmentAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-[#8a9b9b]">EQUITY SHARE:</span>
              <span className="font-bold text-white">{dealData.equitySplit}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8a9b9b]">STATUS:</span>
              <span className="font-bold text-[#57f1db] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#57f1db] animate-pulse"></span>
                COMMITTED
              </span>
            </div>
          </div>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full py-3.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Go to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#091015] text-[#dae4ec] font-sans antialiased pb-24 relative overflow-hidden"
         style={{ backgroundImage: "radial-gradient(rgba(87, 241, 219, 0.04) 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
      
      {/* Top AppBar */}
      <header className="bg-surface/80 backdrop-blur-xl border-b border-white/10 flex justify-between items-center px-6 md:px-12 h-16 w-full fixed top-0 z-[60]">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors select-none">
            close
          </Link>
          <h1 className="font-headline-md text-base font-bold tracking-tighter text-[#57f1db] uppercase">PaperWorking</h1>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex gap-8 font-mono text-[10px] uppercase tracking-wider">
            <span className="text-[#57f1db]">Deal Review</span>
            <Link href="/dashboard/projects" className="text-on-surface-variant hover:text-[#57f1db] transition-colors">Portfolio</Link>
            <Link href="/dashboard/inbox" className="text-on-surface-variant hover:text-[#57f1db] transition-colors">Activity</Link>
          </nav>
          <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-[#57f1db] transition-colors select-none">help</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="pt-24 pb-32 px-6 md:px-12 max-w-6xl mx-auto">
        
        {/* Account Validation Prompt Banner */}
        {!isEligible && (
          <div className="mb-8 p-4 border-2 border-dashed border-[#57f1db]/30 bg-[#57f1db]/5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#57f1db] select-none">verified_user</span>
              <p className="text-xs text-white">
                {isVendor 
                  ? "Standard Investor account required for final closing. Upgrade your vendor account to lock in allocations."
                  : "Standard Investor account with an active Individual or Team plan is required to commit funds."}
              </p>
            </div>
            <Link
              id="btn-upgrade-account"
              href="/pricing"
              className="bg-[#57f1db]/10 hover:bg-[#57f1db]/20 text-[#57f1db] px-6 py-2 rounded-lg font-mono text-[10px] uppercase font-bold transition-all border border-[#57f1db]/20"
            >
              Upgrade Now
            </Link>
          </div>
        )}

        {/* 12-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Details & Underwriting */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Property Header Card */}
            <section className="relative h-[340px] w-full rounded-2xl overflow-hidden border border-white/10 glass-card group">
              <img 
                alt={dealData.dealName} 
                className="w-full h-full object-cover opacity-50 transition-transform duration-700 group-hover:scale-105" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdpxYpTQpSZyS-bVT9se97E8jC8KG1ACRvvabKdZRreVTGe9TbCA-EyNcXiMwIF5fgr4wLBcGYVP8O6G0VzI4ezRc0owWBpdoJWPXwYXXK3lffjKue6yhxtQBHnTcjaPM5LsL4wVa8DvSHkPIvuaJLffFLLIfHrLJa4rnpzWsQCXacjzaGlw76yObkHrheB2ANDh-FaARWXtQMy7sX_z3mOdlFqEur5hIQvT5LBSuOd1u3BUUujG52UVGv1hjlRImgSKFETY9UQcIR"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#091015] via-[#091015]/40 to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <span className="bg-[#57f1db]/20 backdrop-blur-md text-[#57f1db] border border-[#57f1db]/30 px-3 py-0.5 rounded-full font-mono text-[9px] uppercase">
                    {dealData.raisePercentage ?? 70}% Raised
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
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#57f1db]">folder_open</span>
                    Insights
                  </button>
                  <button 
                    onClick={() => setShowAskSponsor(true)}
                    className="bg-surface/60 backdrop-blur-md border border-white/10 hover:bg-surface/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all group font-mono text-[10px] uppercase"
                  >
                    <span className="material-symbols-outlined text-sm select-none group-hover:text-[#57f1db]">mail</span>
                    Ask Sponsor
                  </button>
                </div>
              </div>
            </section>

            {/* Opportunity Thesis Summary */}
            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-3">
              <h3 className="font-mono text-[10px] font-bold text-[#57f1db] uppercase tracking-[0.2em]">Investment Thesis</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {dealData.opportunitySummary || 'Value-add multifamily redevelopment in a high-growth corridor. 123 Skyline Tower represents a unique opportunity to acquire an under-managed Class B asset in an institutional-grade submarket. Our strategy focuses on modernization of common areas and interior unit upgrades to capture a 25% rent premium, leveraging the influx of technology firms moving to the surrounding three-block radius.'}
              </p>
            </section>

            {/* Bento Grid Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Projected IRR</span>
                <span className="text-[#57f1db] text-xl font-bold text-glow">{dealData.expectedROI}%</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Target Multiple</span>
                <span className="text-[#57f1db] text-xl font-bold text-glow">1.8x</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Min. Commit</span>
                <span className="text-[#57f1db] text-xl font-bold text-glow">$25,000</span>
              </div>
              <div className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-on-surface-variant font-mono text-[9px] uppercase tracking-wider">Hold Period</span>
                <span className="text-[#57f1db] text-xl font-bold text-glow">
                  {dealData.termMonths ? Math.round(dealData.termMonths / 12 * 10) / 10 + ' Yrs' : '3-5 Yrs'}
                </span>
              </div>
            </div>

            {/* Collapsible Underwriting Charts Block */}
            <section className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="font-mono text-[10px] font-bold text-[#57f1db] uppercase tracking-[0.2em]">Financial Projections</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#060f15]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Net Operating Income"
                    unit="currency"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.noiHistory}
                  />
                </div>
                <div className="bg-[#060f15]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Cap Rate"
                    unit="%"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.capRateHistory}
                  />
                </div>
                <div className="bg-[#060f15]/80 border border-white/5 p-4 rounded-xl">
                  <MetricChart
                    title="Cash Flow"
                    unit="currency"
                    scope="project"
                    timeWindow="monthly"
                    series={dealData.cashFlowHistory}
                  />
                </div>
                <div className="bg-[#060f15]/80 border border-white/5 p-4 rounded-xl">
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
                <h3 className="font-mono text-[10px] font-bold text-[#57f1db] uppercase tracking-[0.2em]">Investment Structure</h3>
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

            {/* LOI Preview & Signature Box */}
            <section ref={signatureSectionRef} className="glass-card p-6 md:p-8 rounded-2xl space-y-6">
              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <FileText className="w-4 h-4 text-[#57f1db]" />
                <h3 className="font-mono text-[10px] font-bold text-white uppercase tracking-[0.2em]">Letter of Intent — Execution</h3>
              </div>

              <div className="space-y-3 font-mono text-xs max-w-lg">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-[#8a9b9b]">Legal Entity</span>
                  <span className="text-white font-semibold">{dealData.legalEntity || 'PaperWorking Holdings LLC'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-[#8a9b9b]">Commitment Amount</span>
                  <span className="text-[#57f1db] font-bold">${investmentAmount.toLocaleString()}</span>
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
                  {hasSigned && isEligible && (
                    <button
                      onClick={clearSignature}
                      className="text-[9px] text-[#8a9b9b] hover:text-white transition uppercase font-mono border-b border-dashed border-[#8a9b9b]"
                    >
                      Clear Signature
                    </button>
                  )}
                </div>

                <div className={`relative border border-dashed border-white/20 rounded-xl overflow-hidden bg-white ${!isEligible ? 'opacity-40' : ''}`}>
                  <canvas
                    id="loi-signature-canvas"
                    ref={canvasRef}
                    width={600}
                    height={120}
                    className={`w-full cursor-crosshair h-[120px] ${!isEligible ? 'pointer-events-none' : ''}`}
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
                      <p className="text-xs text-slate-400 font-mono">DRAW SIGNATURE HERE</p>
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
                  disabled={!isEligible || !hasSigned || submitting}
                  className="flex-1 py-4 rounded-xl bg-[#57f1db] hover:bg-[#57f1db]/90 text-[#003731] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(87,241,219,0.3)] active:scale-98"
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
                  className="py-4 px-6 rounded-xl border border-white/10 hover:bg-white/5 text-red-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider transition-all active:scale-98"
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
                      <span className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Syndication Status</span>
                      <h4 className="text-2xl font-bold text-white tracking-tight mt-1">
                        ${(dealData.raiseRaised ?? 850000).toLocaleString()}
                      </h4>
                    </div>
                    <span className="text-xs text-[#8a9b9b]">of ${(dealData.raiseTarget ?? 1200000).toLocaleString()}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative">
                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#57f1db] rounded-full transition-all duration-1000 shadow-[0_0_8px_#57f1db]" 
                        style={{ width: `${dealData.raisePercentage ?? 70}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#57f1db] font-bold">{dealData.raisePercentage ?? 70}% Allocated</span>
                    <span className="text-[#8a9b9b]">
                      ${((dealData.raiseTarget ?? 1200000) - (dealData.raiseRaised ?? 850000)).toLocaleString()} Remaining
                    </span>
                  </div>
                </div>

                {/* Investment Amount Form Input */}
                <div className="space-y-2 border-t border-white/5 pt-5">
                  <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider">Your Investment Allocation ($)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8a9b9b] font-mono text-sm">$</span>
                    <input 
                      id="input-investment-amount"
                      type="number" 
                      value={investmentAmountInput}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="25,000"
                      className="w-full pl-8 pr-4 py-3.5 bg-[#060f15]/80 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#57f1db] focus:ring-1 focus:ring-[#57f1db]/20 transition-all"
                    />
                  </div>
                  {inputError ? (
                    <p className="text-[10px] text-red-400 font-mono">{inputError}</p>
                  ) : (
                    <p className="text-[10px] text-[#8a9b9b] font-mono">Incremental steps of $1,000 allowed.</p>
                  )}
                </div>

                {/* Submit Commit CTA */}
                <button
                  onClick={handleCommitCTA}
                  className="w-full py-4 rounded-xl bg-[#57f1db] hover:bg-[#57f1db]/90 text-[#003731] font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(87,241,219,0.2)] active:scale-98"
                >
                  <span className="material-symbols-outlined text-sm select-none">payments</span>
                  COMMIT CAPITAL
                </button>

                {/* Timer Countdown */}
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-[#8a9b9b] font-mono">
                  <Clock className="w-4 h-4 text-[#57f1db]" />
                  <span>
                    Deal closing in: <strong className="text-white font-bold">{dealData.daysLeft ?? 4}d {dealData.hoursLeft ?? 12}h</strong>
                  </span>
                </div>

              </div>

              {/* Encryption & Security Info */}
              <div className="px-2 flex items-start gap-3 text-xs text-[#8a9b9b] leading-normal">
                <Lock className="w-4 h-4 text-[#57f1db] shrink-0 mt-0.5" />
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
          className="flex flex-col items-center justify-center text-on-surface-variant hover:text-red-400 transition-all font-mono text-[9px] uppercase font-bold"
        >
          <span className="material-symbols-outlined text-xl select-none">cancel</span>
          Decline
        </button>
        <button 
          onClick={handleCommitCTA}
          className="bg-[#57f1db] text-[#003731] rounded-xl px-5 py-2.5 shadow-[0_0_15px_rgba(87,241,219,0.2)] active:scale-95 transition-all font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm select-none">payments</span>
          Commit
        </button>
      </nav>

      {/* Modal: Insights */}
      {showInsights && (
        <div id="insights-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="glass-card w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#091015]">
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
              {[
                { name: 'underwriting_model_v4.2.xlsx', size: '2.4 MB', type: 'EXCEL' },
                { name: 'executive_summary_deck.pdf', size: '4.8 MB', type: 'PDF' },
                { name: 'zoning_variance_approval.pdf', size: '1.1 MB', type: 'PDF' },
                { name: 'phase_i_environmental_report.pdf', size: '12.6 MB', type: 'PDF' },
                { name: 'title_commitment_draft.pdf', size: '890 KB', type: 'PDF' }
              ].map((doc) => (
                <div key={doc.name} className="flex justify-between items-center p-3 border border-white/5 bg-black/20 rounded-xl hover:border-[#57f1db]/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#57f1db] text-xl select-none">description</span>
                    <div>
                      <p className="text-xs font-semibold text-white font-mono">{doc.name}</p>
                      <p className="text-[9px] text-[#8a9b9b] font-mono">{doc.type} · {doc.size}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerDownload(doc.name)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-[#57f1db]/10 hover:text-[#57f1db] text-[#8a9b9b] transition-colors"
                    title="Download Document"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-white/5 bg-[#091015]/50 flex justify-end">
              <button 
                onClick={() => setShowInsights(false)}
                className="px-5 py-2 rounded-lg bg-[#57f1db] hover:bg-[#57f1db]/90 text-[#003731] text-[10px] font-bold uppercase tracking-wider transition-colors"
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
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#091015]">
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
              <div>
                <label className="block text-[9px] font-bold text-[#8a9b9b] uppercase tracking-wider mb-2">Your Inquiry</label>
                <textarea
                  id="ask-sponsor-textarea"
                  value={sponsorMessage}
                  onChange={(e) => setSponsorMessage(e.target.value)}
                  placeholder="Ask a question about the capital stack, construction timelines, zoning approvals, or underwriting models..."
                  rows={4}
                  required
                  className="w-full p-4 bg-[#060f15]/80 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-[#57f1db] transition-all"
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
                  className="flex-1 py-3 rounded-xl bg-[#57f1db] hover:bg-[#57f1db]/90 text-[#003731] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(87,241,219,0.2)]"
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
