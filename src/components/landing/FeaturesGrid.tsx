import React from 'react';

/**
 * FeaturesGrid
 *
 * 3-column feature section with custom SVG icons, bold H3 titles,
 * and benefit-driven copy using "in-context guidance" language.
 * Strict PaperWorking palette.
 */

const features = [
  {
    title: 'Deal Pipeline Tracker',
    copy: 'Every property lives inside a unified pipeline board—visible from your Dashboard sidebar. Drag projects across phases, flag bottlenecks, and never lose track of where capital sits.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
        <rect x="2" y="6" width="8" height="20" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="12" y="10" width="8" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="22" y="3" width="8" height="23" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <line x1="6" y1="11" x2="6" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
        <line x1="16" y1="15" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
        <line x1="26" y1="8" x2="26" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    title: 'Engine Room Ledger',
    copy: 'Your financial nerve center lives one click below the pipeline. Every draw request, receipt, and escrow disbursement flows through a tamper-evident audit trail in real time.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
        <rect x="4" y="4" width="24" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.5" />
        <line x1="4" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.5" />
        <line x1="16" y1="12" x2="16" y2="28" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="16" r="1.5" fill="currentColor" />
        <circle cx="22" cy="24" r="1.5" fill="currentColor" />
        <path d="M9 24l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Role-Based Access',
    copy: 'Invite contractors, lawyers, and investors without worrying who sees what. Permissions are enforced at every screen—set once from Team Settings, enforced everywhere automatically.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
        <circle cx="16" cy="10" r="5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 28c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="20" y="18" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <path d="M22 22h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M24 20v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function FeaturesGrid() {
  return (
    <section className="py-24 bg-dashboard border-b border-phase-1">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            Core Capabilities
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance">
            Everything lives where you expect it.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-phase-1 bg-white">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`p-8 lg:p-10 group hover:bg-dashboard transition-colors ${
                i < features.length - 1 ? 'md:border-r border-b md:border-b-0 border-phase-1' : ''
              }`}
            >
              {/* Icon */}
              <div className="w-12 h-12 bg-dashboard group-hover:bg-white border border-phase-1 flex items-center justify-center text-phase-4 mb-6 transition-colors">
                {feature.icon}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-black mb-3 tracking-tight">
                {feature.title}
              </h3>

              {/* Copy */}
              <p className="text-sm text-phase-3 leading-relaxed">
                {feature.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
