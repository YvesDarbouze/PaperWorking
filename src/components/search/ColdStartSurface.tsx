'use client';

/* ═══════════════════════════════════════════════════════
   ColdStartSurface — DM-7 / DM-D10 / DM-9

   The zero-result state acting as a premium conversion surface.
   Renders when a search returns no Deal for the queried address.
   Treats zero results as a signup/start-deal opportunity, not an error.
   ═══════════════════════════════════════════════════════ */

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, ArrowRight, Building2, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import type { ResolvedAddress } from '@/types/listing';
import { recordConversionTelemetry } from '@/actions/telemetry';

interface ColdStartSurfaceProps {
  address: string;
  resolvedAddress?: ResolvedAddress;
  className?: string;
}

export default function ColdStartSurface({
  address,
  resolvedAddress,
  className = '',
}: ColdStartSurfaceProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSubscribed } = useBilling();

  // ── Action handlers ───────────────────────────────────────
  const handleAction = useCallback(() => {
    if (!resolvedAddress) return;

    // Cache the resolved address so it can be rehydrated upon entering wizard
    sessionStorage.setItem('pw_pending_project_address', JSON.stringify(resolvedAddress));

    if (user) {
      if (isSubscribed) {
        // Logged-in active subscriber → start deal creation
        recordConversionTelemetry({
          eventType: 'deal_create',
          details: { address: resolvedAddress.formattedAddress, source: 'cold_start' },
        }).catch(console.error);
        router.push('/dashboard/projects/new');
      } else {
        // Logged-in but not subscribed → pricing checkout route
        recordConversionTelemetry({
          eventType: 'subscribe',
          details: { address: resolvedAddress.formattedAddress, source: 'cold_start_unsubscribed' },
        }).catch(console.error);
        router.push('/pricing');
      }
    } else {
      // Anonymous user → registration funnel
      recordConversionTelemetry({
        eventType: 'subscribe',
        details: { address: resolvedAddress.formattedAddress, source: 'cold_start_anonymous' },
      }).catch(console.error);
      router.push(`/register?ref=search&address=${encodeURIComponent(resolvedAddress.formattedAddress)}`);
    }
  }, [resolvedAddress, user, isSubscribed, router]);

  const showSubscribeFunnel = !user || !isSubscribed;

  return (
    <div className={`relative ${className}`}>
      {/* Glass card */}
      <div className="glass-card rounded-2xl border border-pw-border overflow-hidden">
        {/* Radial ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center">
          {/* Icon */}
          <div className="w-16 h-16 mb-6 rounded-2xl bg-surface-container-high/60 border border-pw-border flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary/75" strokeWidth={1.5} />
          </div>

          {/* Headline (Constraint: Never render the words "no results" or "empty list") */}
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight text-center mb-2">
            Opportunity Available
          </h2>

          {/* Target Address */}
          {address && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low/40 border border-pw-border text-xs sm:text-sm text-on-surface-variant/75 mb-8">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary/50" />
              <span className="truncate max-w-[280px] sm:max-w-[400px]">{address}</span>
            </div>
          )}

          {/* Subscribe Funnel Checklist (DM-9 spec: "stating plainly what subscribing unlocks") */}
          {showSubscribeFunnel ? (
            <div className="w-full max-w-sm bg-surface-container-low/40 border border-pw-border/50 rounded-2xl p-5 mb-8 text-left">
              <h3 className="text-xs font-bold text-primary tracking-widest uppercase mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                Subscribing Unlocks:
              </h3>
              <ul className="space-y-3">
                <UnlockItem text="Run unlimited premium Deal Analysis" />
                <UnlockItem text="Draft and customize capital stacks & equity terms" />
                <UnlockItem text="Invite investors and syndicate deal crowdfunds" />
                <UnlockItem text="Secure your proprietary acquisition pipeline" />
                <UnlockItem text="Unlock live submarket and rental statistics" />
              </ul>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant/70 max-w-md text-center mb-8 leading-relaxed">
              No active marketplace deals match this property, but as a subscriber, you can create a private project and run deal modeling immediately.
            </p>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-none">
            {resolvedAddress ? (
              <button
                type="button"
                onClick={handleAction}
                className="group flex items-center justify-center gap-2.5 px-6 h-12 w-full sm:w-auto rounded-xl bg-primary text-on-primary font-bold text-sm transition-all duration-200 hover:bg-primary/95 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
              >
                {showSubscribeFunnel ? 'Subscribe to Start a Deal' : 'Start a Deal here'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-error/80 bg-error/5 border border-error/15 px-4 py-2.5 rounded-xl">
                <ShieldAlert className="w-4 h-4" />
                Unable to resolve address coordinates.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnlockItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] text-on-surface/90 leading-normal">
      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </li>
  );
}
