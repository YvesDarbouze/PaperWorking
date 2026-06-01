'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Check, X, Star } from 'lucide-react';

interface PricingCardsProps {
  isAnnual: boolean;
  onToggleAnnual: (val: boolean) => void;
  onSelectPlan: (plan: string) => void;
  cardsRef?: React.RefObject<HTMLDivElement | null>;
}

interface FeatureItem {
  label: string;
  included: boolean;
  /** Loss-aversion copy shown when feature is NOT included */
  lossAversion?: string;
}

interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  ctaLabel: string;
  ctaMicrocopy: string;
  isAnchored: boolean;
  anchorBadge?: string;
  /** Micro-testimonial or social proof line shown below the price */
  socialProof?: { quote: string; author: string };
  features: FeatureItem[];
}

const tiers: PlanTier[] = [
  {
    id: 'vendor',
    name: 'Vendor',
    tagline: 'For professionals who want qualified investor leads in their service area.',
    monthlyPrice: 39,
    annualPrice: 390,
    ctaLabel: 'Join the Marketplace',
    ctaMicrocopy: 'Cancel anytime during trial',
    isAnchored: false,
    features: [
      { label: 'Up to 5 active project pipelines', included: true },
      { label: 'Full 4-Phase Lifecycle Kanban', included: true },
      { label: 'Engine Room Ledger', included: true },
      { label: 'Standard Financial Reports', included: true },
      { label: 'Holding Cost Clock', included: true },
      {
        label: 'Team Invites & RBAC',
        included: false,
        lossAversion: 'Role-based access and audit logs are Team-only. Your contractors will see your financials.',
      },
      {
        label: 'Google Drive Provisioning',
        included: false,
        lossAversion: 'Auto-created deal folders in Google Drive require the Team plan.',
      },
    ],
  },
  {
    id: 'individual',
    name: 'Investor',
    tagline: 'Built for solo investors who want full pipeline visibility without a team subscription.',
    monthlyPrice: 59,
    annualPrice: 499,
    ctaLabel: 'Start Investor Trial',
    ctaMicrocopy: 'Cancel anytime during trial',
    isAnchored: true,
    anchorBadge: 'Most Popular',
    socialProof: {
      quote: '"I used to underwrite on spreadsheets that broke on every new column. This gets the math right in seconds."',
      author: '— R. Miller, Solo Operator',
    },
    features: [
      { label: 'Unlimited active project pipelines', included: true },
      { label: 'Full 4-Phase Lifecycle Kanban', included: true },
      { label: 'Engine Room Ledger & reports', included: true },
      { label: 'CPA-Ready CSV & P&L exports', included: true },
      { label: 'Document OCR Upload (Confirm & Harden)', included: true },
      { label: '1 partner seat (Read-only)', included: true },
      {
        label: 'Team Invites & RBAC',
        included: false,
        lossAversion: 'Role-based access and audit logs are Team-only. Your contractors will see your financials.',
      },
    ],
  },
  {
    id: 'team',
    name: 'Investment Team',
    tagline: 'For investor teams who need role-based access, shared workflows, and complete financial separation.',
    monthlyPrice: 99,
    annualPrice: 999,
    ctaLabel: 'Start Team Trial',
    ctaMicrocopy: 'Cancel anytime during trial',
    isAnchored: false,
    features: [
      { label: 'Everything in Investor', included: true },
      { label: 'Team Member Invites (Agents, GCs)', included: true },
      { label: 'Granular Role-Based Data Isolation', included: true },
      { label: 'Advanced Vendor Management', included: true },
      { label: 'Google Drive Provisioning', included: true },
      { label: 'Advanced Financial Reports', included: true },
      { label: 'Escrow Integration & API Access', included: true },
    ],
  },
];

/* ─── Animated Price Counter ─── */
function AnimatedPrice({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setAnimating(true);
      const timeout = setTimeout(() => {
        setDisplay(value);
        setAnimating(false);
        prevValue.current = value;
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={`inline-block transition-all duration-200 ease-out ${
        animating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      ${display.toLocaleString()}
    </span>
  );
}

/* ─── Savings Badge (strict palette) ─── */
function SavingsPill({
  monthlyPrice,
  annualPrice,
  visible,
}: {
  monthlyPrice: number;
  annualPrice: number;
  visible: boolean;
}) {
  const yearlySavings = monthlyPrice * 12 - annualPrice;

  return (
    <span
      className={`inline-flex items-center text-xs uppercase tracking-wider font-bold bg-phase-4 text-white px-2.5 py-1 transition-all duration-300 ease-out ${
        visible
          ? 'opacity-100 translate-x-0 scale-100'
          : 'opacity-0 -translate-x-2 scale-95 pointer-events-none'
      }`}
    >
      Save ${yearlySavings}
    </span>
  );
}

/* ─── Main Component ─── */
export default function PricingCards({
  isAnnual,
  onToggleAnnual,
  onSelectPlan,
  cardsRef,
}: PricingCardsProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-8">
      {/* ── Billing Toggle ── */}
      <div className="flex justify-center mb-8">
        <div className="flex items-center p-1 bg-phase-1">
          <button
            onClick={() => onToggleAnnual(false)}
            className={`px-6 py-2.5 text-sm font-medium transition-all ${
              !isAnnual
                ? 'bg-white shadow-sm text-phase-4'
                : 'text-phase-3 hover:text-phase-4'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onToggleAnnual(true)}
            className={`flex items-center px-6 py-2.5 text-sm font-medium transition-all ${
              isAnnual
                ? 'bg-white shadow-sm text-phase-4'
                : 'text-phase-3 hover:text-phase-4'
            }`}
          >
            Annual
            <span className="ml-2 text-xs uppercase tracking-wider text-phase-4 font-bold bg-dashboard border border-phase-1 px-2 py-0.5">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* ── 3-Column Cards Grid ── */}
      <div
        ref={cardsRef}
        className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-phase-1 bg-white shadow-sm"
      >
        {tiers.map((tier, tierIdx) => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const period = isAnnual ? '/yr' : '/mo';
          const planLabel = `${tier.name} ${isAnnual ? 'Annual' : 'Monthly'}`;
          const isLast = tierIdx === tiers.length - 1;

          return (
            <div
              key={tier.id}
              className={`
                p-8 flex flex-col transition-all duration-300
                ${!isLast ? 'border-r border-phase-1 md:border-r' : ''}
                ${tier.isAnchored ? 'bg-dashboard relative' : 'bg-white'}
                border-b md:border-b-0 border-phase-1
              `}
            >
              {/* ── Anchor Badge ── */}
              {tier.isAnchored && tier.anchorBadge && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white text-xs font-bold uppercase tracking-widest px-5 py-1.5 whitespace-nowrap">
                  {tier.anchorBadge}
                </div>
              )}

              {/* ── Plan Name ── */}
              <h3 className="text-xl font-bold text-black tracking-tight">
                {tier.name}
              </h3>

              {/* ── Benefit Line ── */}
              <p className="text-sm text-phase-3 mt-1.5 leading-relaxed min-h-[40px]">
                {tier.tagline}
              </p>

              {/* ── Price ── */}
              <div className="mt-8 mb-1">
                <span className="text-5xl font-medium text-black tracking-tight tabular-nums">
                  <AnimatedPrice value={price} />
                </span>
                <span className="text-sm font-medium text-phase-2 ml-1">
                  {period}
                </span>
              </div>

              {/* ── Savings Badge ── */}
              <div className="h-6 mb-3 flex items-center">
                 <SavingsPill
                  monthlyPrice={tier.monthlyPrice}
                  annualPrice={tier.annualPrice}
                  visible={isAnnual}
                />
              </div>

              {/* ── Targeted Social Proof ── */}
              {tier.socialProof ? (
                <div className="mb-6 px-3 py-3 bg-white border border-phase-1">
                  <div className="flex items-center gap-0.5 mb-1.5">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-3 h-3 fill-phase-4 text-phase-4"
                      />
                    ))}
                  </div>
                  <p className="text-xs text-phase-3 italic leading-relaxed">
                    {tier.socialProof.quote}
                  </p>
                  <p className="text-xs text-phase-2 font-medium mt-1">
                    {tier.socialProof.author}
                  </p>
                </div>
              ) : (
                <div className="mb-6" />
              )}

              {/* ── Primary CTA ── */}
              <button
                onClick={() => onSelectPlan(planLabel)}
                className={`
                  w-full font-medium py-3.5 text-sm transition-all active:scale-[0.97]
                  ${
                    tier.isAnchored
                      ? 'bg-black text-white hover:bg-phase-4 shadow-sm'
                      : 'bg-dashboard text-phase-4 hover:bg-phase-1 border border-phase-1'
                  }
                `}
              >
                {tier.ctaLabel}
              </button>

              {/* ── CTA Microcopy ── */}
              <p className="text-center text-xs text-phase-2 font-medium uppercase tracking-widest mt-2.5">
                {tier.ctaMicrocopy}
              </p>

              {/* ── Feature List ── */}
              <div className="mt-8 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-phase-2 mb-5">
                  {tier.id === 'team'
                    ? 'Everything in Investor, plus:'
                    : tier.id === 'individual'
                    ? 'Everything in Solo, plus:'
                    : 'Includes'}
                </p>
                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx}>
                      <div
                        className={`flex items-start text-sm ${
                          feature.included
                            ? 'text-phase-4 font-medium'
                            : 'text-phase-2'
                        }`}
                      >
                        {feature.included ? (
                          <Check className="w-4 h-4 text-phase-4 mr-3 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-phase-1 mr-3 mt-0.5 flex-shrink-0" />
                        )}
                        <span>{feature.label}</span>
                      </div>

                      {/* ── Loss Aversion Microcopy ── */}
                      {!feature.included && feature.lossAversion && (
                        <p className="text-sm text-phase-2 italic mt-1 ml-7 leading-snug">
                          {feature.lossAversion}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Export tiers data for use in StickyMobileCTA */
export { tiers };
