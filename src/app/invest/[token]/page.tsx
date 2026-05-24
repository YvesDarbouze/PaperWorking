'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Shield, FileText, Home, Pen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MetricChart } from '@/components/metrics/MetricChart';
import { isSubscriptionActive } from '@/lib/stripe/subscription';

/* ═══════════════════════════════════════════════════════
   Guest Portal — External Investor View

   Isolated public route. No dashboard chrome.
   Renders: Deal Summary, Pre-filled LOI, Signature Canvas,
   Accept / Decline CTAs, and PaperWorking branding.
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
}

export default function GuestPortalPage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  
  const { user, profile, loading: authLoading } = useAuth();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dealData, setDealData] = useState<DealTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invest/${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.deal) {
          setDealData(data.deal as DealTokenData);
        } else {
          setTokenInvalid(true);
        }
      })
      .catch(() => setTokenInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  // Redirect unauthenticated guests to /login?redirectTo=/invest/[token]
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

  // ── Canvas Signature Logic ────────────────────────────
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
      // Prevent scrolling on touch devices
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
      // Prevent scrolling on touch devices
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0d0d0d'; // Strictly near-black grayscale
    ctx.lineWidth = 2;
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

  const handleSign = async () => {
    if (!isEligible || !hasSigned || !canvasRef.current || !user) return;
    
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
        body: JSON.stringify({ idToken, dataURL })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSubmitted(true);
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

  const handleDecline = () => {
    setDeclined(true);
  };

  // ── Loading state (including when profile is still fetching) ──────────────────────────────────────────
  if (authLoading || loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pw-black" />
      </div>
    );
  }

  // ── Redirect in progress/unauthenticated ──
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pw-black" />
      </div>
    );
  }

  // ── Invalid / Expired Token ──────────────────────────
  if (tokenInvalid || !dealData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm p-6 bg-bg-surface border border-pw-black rounded-none">
          <div className="w-16 h-16 bg-bg-primary border border-pw-border rounded-none flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-text-secondary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Invalid or Expired Link</h1>
          <p className="text-sm text-text-secondary">
            This investment portal link is no longer valid. Please contact the deal sponsor for a new invitation.
          </p>
        </div>
      </div>
    );
  }

  // ── Declined State ──────────────────────────────────
  if (declined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm p-6 bg-bg-surface border border-pw-black rounded-none">
          <div className="w-16 h-16 bg-bg-primary border border-pw-border rounded-none flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-text-secondary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Offer Declined</h1>
          <p className="text-sm text-text-secondary">
            You have declined this investment opportunity. The deal sponsor has been notified.
          </p>
        </div>
      </div>
    );
  }

  // ── Submitted State ──────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
        <div className="text-center max-w-sm p-6 bg-bg-surface border border-pw-black rounded-none">
          <div className="w-16 h-16 bg-bg-primary border border-pw-black rounded-none flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-text-primary" />
          </div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Commitment Confirmed!</h1>
          <p className="text-sm text-text-secondary mb-4">
            Your digital signature has been recorded. The deal sponsor will follow up with the formal subscription agreement.
          </p>
          <div className="bg-bg-primary border border-pw-border p-4 text-left rounded-none">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Investment:</span>
                <span className="font-semibold text-text-primary">${dealData.investmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Equity:</span>
                <span className="font-semibold text-text-primary">{dealData.equitySplit}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Status:</span>
                <span className="font-semibold text-text-primary">Signed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Portal View ──────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Minimal Header */}
      <header className="bg-bg-surface border-b border-pw-border px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pw-black rounded-none flex items-center justify-center">
              <span className="text-pw-white text-xs font-bold">PW</span>
            </div>
            <span className="text-sm font-semibold text-text-primary tracking-tight">PaperWorking</span>
          </div>
          <span className="text-xs text-text-secondary">Secure Investor Portal</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <p className="text-sm text-text-secondary mb-1">Hello, {dealData.investorName}</p>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Investment Opportunity</h1>
        </div>

        {/* Custom Eligibility Warning Card if not eligible */}
        {!isEligible && (
          <div className="p-4 border border-pw-black bg-bg-surface text-text-primary rounded-none flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-text-primary" />
              <p className="font-semibold text-sm">Account Ineligible</p>
            </div>
            {isVendor ? (
              <>
                <p className="text-xs text-text-secondary">
                  As a Vendor, you cannot invest. Upgrade your account to Standard (Individual) for $59/mo to commit funds.
                </p>
                <a
                  href="/pricing"
                  className="pw-btn pw-btn--primary w-full flex items-center justify-center gap-2 text-center"
                >
                  Upgrade to Standard
                </a>
              </>
            ) : profile && !hasActiveSub && ['Individual', 'Team'].includes(profile.subscriptionPlan || '') ? (
              <>
                <p className="text-xs text-text-secondary">
                  Your subscription is currently inactive or expired. Please update your billing info or upgrade to Standard (Individual) for $59/mo to sign this Letter of Intent.
                </p>
                <a
                  href="/pricing"
                  className="pw-btn pw-btn--primary w-full flex items-center justify-center gap-2 text-center"
                >
                  Reactivate Subscription
                </a>
              </>
            ) : (
              <>
                <p className="text-xs text-text-secondary">
                  Investment requires a Standard (Individual) plan or higher. Upgrade now to sign this Letter of Intent.
                </p>
                <a
                  href="/pricing"
                  className="pw-btn pw-btn--primary w-full flex items-center justify-center gap-2 text-center"
                >
                  Upgrade Now
                </a>
              </>
            )}
          </div>
        )}

        {/* Deal Summary Card */}
        <div className="bg-bg-surface rounded-none border border-pw-black overflow-hidden">
          <div className="h-28 bg-bg-primary border-b border-pw-black flex items-center justify-center">
            <Home className="w-10 h-10 text-text-secondary" />
          </div>
          <div className="p-5">
            <h2 className="text-lg font-semibold text-text-primary">{dealData.dealName}</h2>
            <p className="text-sm text-text-secondary mb-4">{dealData.propertyAddress}</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-bg-primary border border-pw-border rounded-none px-3 py-2.5 text-center">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-0.5">Target Price</p>
                <p className="text-sm font-bold text-text-primary">${dealData.purchasePrice.toLocaleString()}</p>
              </div>
              <div className="bg-bg-primary border border-pw-border rounded-none px-3 py-2.5 text-center">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-0.5">ARV</p>
                <p className="text-sm font-bold text-text-primary">${dealData.estimatedARV.toLocaleString()}</p>
              </div>
              <div className="bg-bg-surface border border-pw-black rounded-none px-3 py-2.5 text-center">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-0.5">Expected ROI</p>
                <p className="text-sm font-bold text-text-primary">{dealData.expectedROI}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metric Charts (4 components) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-bg-surface border border-pw-black p-4 rounded-none">
            <MetricChart
              title="Net Operating Income"
              unit="currency"
              scope="project"
              timeWindow="monthly"
              series={dealData.noiHistory}
            />
          </div>
          <div className="bg-bg-surface border border-pw-black p-4 rounded-none">
            <MetricChart
              title="Cap Rate"
              unit="%"
              scope="project"
              timeWindow="monthly"
              series={dealData.capRateHistory}
            />
          </div>
          <div className="bg-bg-surface border border-pw-black p-4 rounded-none">
            <MetricChart
              title="Cash Flow"
              unit="currency"
              scope="project"
              timeWindow="monthly"
              series={dealData.cashFlowHistory}
            />
          </div>
          <div className="bg-bg-surface border border-pw-black p-4 rounded-none">
            <MetricChart
              title="Daily Burn Rate"
              unit="currency"
              scope="project"
              timeWindow="monthly"
              series={dealData.burnRateHistory}
            />
          </div>
        </div>

        {/* LOI Preview */}
        <div className="bg-bg-surface rounded-none border border-pw-black p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Letter of Intent — Terms</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Legal Entity', value: dealData.legalEntity },
              { label: 'Investment Amount', value: `$${dealData.investmentAmount.toLocaleString()}` },
              { label: 'Equity Split', value: `${dealData.equitySplit}%` },
              { label: 'Interest Rate', value: `${dealData.interestRate}% per annum` },
              { label: 'Term Length', value: `${dealData.termMonths} months` },
            ].map((item) => (
              <div key={item.label} className="flex justify-between py-2 border-b border-pw-border last:border-b-0">
                <span className="text-sm text-text-secondary">{item.label}</span>
                <span className="text-sm font-semibold text-text-primary">{item.value}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-text-secondary mt-4 leading-relaxed">
            This Letter of Intent is non-binding and subject to the execution of a definitive subscription agreement.
            By signing below, you indicate your intent to proceed under the terms outlined above.
          </p>
        </div>

        {/* Signature Canvas */}
        <div className="bg-bg-surface rounded-none border border-pw-black p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Pen className="w-4 h-4 text-text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Digital Signature</h3>
            </div>
            {hasSigned && isEligible && (
              <button
                onClick={clearSignature}
                className="text-xs text-text-secondary hover:text-text-primary transition"
              >
                Clear
              </button>
            )}
          </div>

          <div className={`relative border border-dashed border-pw-border rounded-none overflow-hidden bg-bg-primary/50 ${!isEligible ? 'opacity-50' : ''}`}>
            <canvas
              ref={canvasRef}
              width={600}
              height={150}
              className={`w-full cursor-crosshair ${!isEligible ? 'pointer-events-none' : ''}`}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            {!hasSigned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm text-text-secondary opacity-50">Sign here</p>
              </div>
            )}
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-3">
          {submitError && (
            <div className="p-4 border border-pw-black bg-bg-surface text-text-primary rounded-none flex items-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-text-primary" />
              <span className="text-xs">{submitError}</span>
            </div>
          )}
          
          <button
            onClick={handleSign}
            disabled={!isEligible || !hasSigned || submitting}
            className="pw-btn pw-btn--primary w-full flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Submitting Signature...' : 'Digitally Sign & Commit Funds'}
          </button>
          
          <button
            onClick={handleDecline}
            className="pw-btn pw-btn--secondary w-full"
          >
            Decline Offer
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-pw-border bg-bg-surface mt-12 py-6 px-4 text-center">
        <p className="text-xs text-text-secondary">
          Powered by <strong className="text-text-secondary">PaperWorking</strong> · Secure Investment Portal
        </p>
      </footer>
    </div>
  );
}
