'use client';

import React from 'react';

interface PricingCardsProps {
  onSelectPlan: (plan: string) => void;
  cardsRef?: React.RefObject<HTMLDivElement | null>;
}

interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  annualPrice: number;
  ctaLabel: string;
  ctaMicrocopy: string;
  isAnchored: boolean;
  anchorBadge?: string;
  features: string[];
}

const tiers: PlanTier[] = [
  {
    id: 'individual',
    name: 'Investor',
    tagline: 'Full pipeline visibility without a team subscription.',
    annualPrice: 499,
    ctaLabel: 'Start Investor Trial',
    ctaMicrocopy: '14-day trial · No charge until day 15',
    isAnchored: false,
    features: [
      'Four-phase REIL project management',
      'All 33 KPI visualizations, per deal and portfolio-wide',
      'Deal Analyzer with live property data: cap rate, IRR, cash-on-cash',
      'Ledger, expense logging, budgets, and Holding Cost Clock',
      'Document vault and deal uploads',
      'Tax-ready reports and CPA-ready P&L export',
      'Deal Marketplace access',
      'Solo plan: one user account',
    ],
  },
  {
    id: 'team',
    name: 'Investment Team',
    tagline: 'Role-based access, with a clean line between what each person can see and what they can do.',
    annualPrice: 999,
    ctaLabel: 'Start Team Trial',
    ctaMicrocopy: '14-day trial · No charge until day 15',
    isAnchored: true,
    anchorBadge: 'MOST POPULAR',
    features: [
      'Everything in Investor',
      'Up to 10 accounts on one team',
      'Lead Investor task assignment and phase control',
      'Role permissions: Admins, Editors, Viewers — invite your CPA or private lenders as read-only',
      'Represent your team or company in the marketplace',
      'Google Drive provisioning',
    ],
  },
  {
    id: 'vendor',
    name: 'Vendor',
    tagline: 'Qualified leads from active investor projects in your service area.',
    annualPrice: 390,
    ctaLabel: 'Join the Marketplace',
    ctaMicrocopy: '14-day trial · No charge until day 15',
    isAnchored: false,
    features: [
      'Vendor Marketplace listing by trade and geography',
      'Access to assigned project work: pipelines, ledger entries, budgets for your scope',
      'Standard financial reports',
    ],
  },
];

export default function PricingCards({ onSelectPlan, cardsRef }: PricingCardsProps) {
  return (
    <div ref={cardsRef} className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`glass-panel rounded-2xl p-6 flex flex-col relative transition-all duration-300 border ${
              tier.isAnchored
                ? 'border-primary/40 shadow-[0_0_50px_-12px_rgba(69,73,85,0.3)] bg-surface-container-low/40'
                : 'border-white/10 bg-surface-container-low/20'
            }`}
          >
            {tier.anchorBadge && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-on-primary px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap shadow-lg type-caption">
                {tier.anchorBadge}
              </div>
            )}

            <div className={`pb-5 border-b border-white/8 ${tier.anchorBadge ? 'mt-2' : ''}`}>
              <h3 className={`text-2xl font-bold tracking-tight mb-2 ${tier.isAnchored ? 'text-primary' : 'text-on-surface'} type-h3`}>
                {tier.name}
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed type-body">
                {tier.tagline}
              </p>
            </div>

            <div className="py-5 border-b border-white/8">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-on-surface tracking-tight type-metric">
                  ${tier.annualPrice}
                </span>
                <span className="text-base text-on-surface-variant font-medium type-body">
                  /year
                </span>
              </div>
              <p className="text-xs text-on-surface-variant/70 mt-1 type-caption font-semibold">
                billed annually.
              </p>
            </div>

            <div className="py-5">
              <button
                type="button"
                onClick={() => onSelectPlan(`${tier.name} Annual`)}
                className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer type-cta ${
                  tier.isAnchored
                    ? 'luminous-button'
                    : 'border border-primary/40 text-primary hover:bg-primary/10'
                }`}
              >
                {tier.ctaLabel}
              </button>
              <p className="text-[10px] text-on-surface-variant/50 text-center mt-2 type-caption font-jetbrains">
                {tier.ctaMicrocopy}
              </p>
            </div>

            <div className="pt-2 flex-grow">
              <ul className="space-y-3">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-on-surface-variant type-small">
                    <span
                      className={`material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5 ${
                        tier.isAnchored ? 'text-primary' : 'text-primary/70'
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
