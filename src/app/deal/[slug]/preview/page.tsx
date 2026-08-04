'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';
import { Building2, MapPin, Lock, ShieldAlert, ArrowRight, Mail } from 'lucide-react';
import { sanitizePublicTeaser, validateInvitationToken, DealInvitation } from '@/lib/deals/engagementUtils';
import { formatCurrencyAmount } from '@/lib/deals/fundingUtils';

export default function PublicDealTeaserPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slugParam = (params?.slug as string) || '';
  const tokenParam = searchParams?.get('invite') || searchParams?.get('token') || '';

  const [tokenError, setTokenError] = useState<string | null>(null);

  // Mock deal data
  const rawDeal = {
    displayAddress: slugParam
      ? slugParam.replace(/([0-9]+)([a-zA-Z]+)/, '$1 $2').replace(/([a-z])([A-Z])/g, '$1 $2')
      : '123 Main St, Austin, TX 78701',
    city: 'Austin',
    state: 'TX',
    assetClass: 'Multi-Family',
    fundingTarget: 200000,
    committedAmount: 130000,
    status: 'LISTED',
  };

  const sanitized = sanitizePublicTeaser(rawDeal);

  useEffect(() => {
    document.title = `PaperWorking — Deal Teaser Preview (${slugParam})`;

    // Validate token if provided
    if (tokenParam) {
      if (tokenParam === 'expired') {
        setTokenError('This invitation link has expired (links are valid for 30 days).');
      } else if (tokenParam === 'revoked') {
        setTokenError('This invitation link has been revoked by the deal owner.');
      }
    }
  }, [slugParam, tokenParam]);

  const handleUnlockPaywall = () => {
    const targetUrl = `/dashboard/deals/${slugParam}${tokenParam ? `?invite=${tokenParam}` : ''}`;
    router.push(`/dashboard/settings/billing?paywall=deals&redirectTo=${encodeURIComponent(targetUrl)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col justify-between">
      <LandingHeader />

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8 flex-1">
        {/* Token Error Banner */}
        {tokenError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-bold flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>{tokenError}</span>
          </div>
        )}

        {/* Public Teaser Hero Card */}
        <div className="glass-card rounded-2xl border border-pw-border p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-pw-border pb-4">
            <span className="px-3 py-1 rounded-md text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Public Teaser View
            </span>
            <span className="text-xs font-mono text-slate-400">Read-Only</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-emerald-400" />
              <span>{sanitized.displayAddress}</span>
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>{sanitized.location} · {sanitized.assetClass}</span>
            </p>
          </div>

          {/* High-Level Funding Summary */}
          <div className="space-y-2 p-4 rounded-xl bg-white/[0.03] border border-pw-border">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">Funding Progress</span>
              <span className="text-emerald-400 font-mono">{sanitized.percentFunded}% Committed</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden border border-pw-border">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                style={{ width: `${sanitized.percentFunded}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>Committed: {formatCurrencyAmount(sanitized.committedAmount)}</span>
              <span>Target: {formatCurrencyAmount(sanitized.fundingTarget)}</span>
            </div>
          </div>

          {/* Locked Features Banner */}
          <div className="p-5 rounded-xl bg-slate-900 border border-pw-border space-y-3">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Subscriber-Only Deal Data Locked</span>
            </div>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              <li>Full financial underwriting & Deal Analyzer metrics</li>
              <li>Other committed investor names & syndicate list</li>
              <li>Deal owner business card & direct contact controls</li>
              <li>Investment intent registration (% or currency amount)</li>
            </ul>
          </div>

          {/* Action Conversion CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleUnlockPaywall}
              className="w-full sm:flex-1 h-12 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs uppercase hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg min-h-[44px]"
            >
              <Lock className="w-4 h-4" />
              <span>Unlock Full Deal & Analyzer Data</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href={`mailto:owner@paperworking.co?subject=Inquiry regarding ${sanitized.displayAddress}`}
              className="w-full sm:w-auto px-5 h-12 rounded-xl border border-pw-border bg-white/5 text-slate-200 font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>Reply via Email Only</span>
            </a>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
