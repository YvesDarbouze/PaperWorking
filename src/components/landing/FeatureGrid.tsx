'use client';

import React from 'react';

/* ═══════════════════════════════════════════════════════════════
   FeatureGrid — 2x2 Scannable Feature Blocks
   
   Custom minimalist SVG icons, pw-* design tokens,
   subtle hover lift + border accent.
   ═══════════════════════════════════════════════════════════════ */

/** 70% Rule Calculator — percentage gauge icon */
function Icon70Rule() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Outer circle */}
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="2" />
      {/* Progress arc — ~70% of circle */}
      <path
        d="M20 3 A17 17 0 1 1 6.15 30.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Center text "70" */}
      <text x="20" y="23" textAnchor="middle" fill="currentColor" fontSize="11" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">70</text>
    </svg>
  );
}

/** Digital Ledger — open book / ledger icon */
function IconLedger() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Left page */}
      <path d="M20 8 L6 11 V33 L20 30 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* Right page */}
      <path d="M20 8 L34 11 V33 L20 30 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
      {/* Spine */}
      <line x1="20" y1="8" x2="20" y2="30" stroke="currentColor" strokeWidth="2" />
      {/* Left page lines */}
      <line x1="10" y1="16" x2="17" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="10" y1="21" x2="17" y2="19.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Right page lines */}
      <line x1="23" y1="14.5" x2="30" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="23" y1="19.5" x2="30" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

/** Engine Room — gear/cog icon */
function IconEngine() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Outer gear teeth */}
      <path
        d="M20 4 L22.5 4 L23.5 7.5 L26.5 8.5 L29.5 6.5 L31.5 8.5 L29.5 11.5 L30.5 14.5 L34 15.5 L34 18 L30.5 19 L29.5 22 L31.5 25 L29.5 27 L26.5 25 L23.5 26 L22.5 29.5 L20 29.5 L19 26 L16 25 L13 27 L11 25 L13 22 L12 19 L8.5 18 L8.5 15.5 L12 14.5 L13 11.5 L11 8.5 L13 6.5 L16 8.5 L19 7.5 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner circle */}
      <circle cx="21" cy="17" r="5" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Center dot */}
      <circle cx="21" cy="17" r="1.5" fill="currentColor" />
      {/* Bottom platform — the "room" */}
      <rect x="10" y="32" width="22" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
      <rect x="14" y="29.5" width="2" height="3" fill="currentColor" opacity="0.3" />
      <rect x="26" y="29.5" width="2" height="3" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/** Automated Tax Exports — document with arrow icon */
function IconTaxExport() {
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Document outline */}
      <rect x="8" y="4" width="18" height="26" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      {/* Document lines */}
      <line x1="13" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="13" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="13" y1="21" x2="18" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* Export arrow (bottom-right) */}
      <path d="M26 22 L34 22 L30 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 22 L30 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dollar sign hint */}
      <text x="17" y="28" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="600" fontFamily="Inter, system-ui, sans-serif" opacity="0.4">$</text>
    </svg>
  );
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Icon70Rule />,
    title: 'The 70% Rule Calculator',
    description:
      'Instantly validate acquisition profitability. Input ARV, repair costs, and purchase price — get a go/no-go decision backed by institutional-grade underwriting logic.',
  },
  {
    icon: <IconLedger />,
    title: 'The Digital Ledger',
    description:
      'Every dollar tracked, every receipt attached. Maintain a single source of truth for project finances with automated categorization and audit-ready exports.',
  },
  {
    icon: <IconEngine />,
    title: 'The Engine Room',
    description:
      'Your operational command center. Assign tasks, track milestones, manage contractors — all in one dashboard that keeps every stakeholder aligned.',
  },
  {
    icon: <IconTaxExport />,
    title: 'Automated Tax Exports',
    description:
      'One-click Schedule E and 1099 generation. PaperWorking auto-maps your ledger entries to IRS categories so tax season becomes a non-event.',
  },
];

export default function FeatureGrid() {
  return (
    <section className="py-20 sm:py-28" id="features">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {features.map((f) => (
            <div
              key={f.title}
              className="group relative bg-pw-surface border border-pw-border p-8 sm:p-10
                         transition-all duration-300 ease-out
                         hover:-translate-y-1 hover:shadow-lg hover:border-pw-fg/20"
            >
              {/* Icon */}
              <div className="text-pw-fg mb-5 transition-transform duration-300 group-hover:scale-110">
                {f.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-pw-fg tracking-tight mb-2">
                {f.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-pw-muted leading-relaxed">
                {f.description}
              </p>

              {/* Subtle top-accent on hover */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-pw-fg scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
