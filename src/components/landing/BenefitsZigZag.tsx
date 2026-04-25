import React from 'react';
import { Clock, ShieldCheck, TrendingDown } from 'lucide-react';

/**
 * BenefitsZigZag
 *
 * Alternating left-text/right-visual + right-text/left-visual layout.
 * Each row highlights one Core Outcome: Time Saved, Error Reduction, Security.
 * Strict PaperWorking palette.
 */

const benefits = [
  {
    outcome: 'Time Saved',
    headline: 'Close projects 3× faster with automated document workflows.',
    body: 'Every closing disclosure, title insurance form, and wiring instruction auto-routes to the right team member the moment it\'s uploaded. No more chasing signatures across email threads — the system handles sequencing so your team stays focused on deal-making.',
    stat: '72%',
    statLabel: 'less time spent on admin',
    icon: Clock,
    visual: (
      <div className="bg-bg-surface border border-phase-1 p-6 space-y-3 w-full">
        <div className="flex items-center justify-between pb-3 border-b border-dashboard">
          <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Document Queue</span>
          <span className="text-xs font-bold text-phase-4">3 auto-routed</span>
        </div>
        {['Title Insurance → Lawyer Review', 'Closing Disclosure → Lead Investor', 'Wiring Instructions → Escrow Agent'].map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-dashboard last:border-0">
            <div className="flex items-center space-x-3">
              <div className={`w-1.5 h-1.5 ${i === 0 ? 'bg-phase-4' : 'bg-phase-2'}`} />
              <span className="text-xs text-phase-4">{item}</span>
            </div>
            <span className={`text-xs font-bold uppercase tracking-widest ${i === 0 ? 'text-phase-4' : 'text-phase-2'}`}>
              {i === 0 ? 'In Review' : i === 1 ? 'Pending' : 'Queued'}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    outcome: 'Error Reduction',
    headline: 'Eliminate duplicate entries and catch missing fields before closings.',
    body: 'The Engine Room validates every data point against the deal record. If a purchase price doesn\'t match across documents, if a field is blank that should be filled — you\'ll see a flag before it becomes a $50,000 mistake at the closing table.',
    stat: '94%',
    statLabel: 'fewer data entry errors',
    icon: TrendingDown,
    visual: (
      <div className="bg-bg-surface border border-phase-1 p-6 w-full">
        <div className="flex items-center justify-between pb-3 border-b border-dashboard mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Validation Report</span>
          <span className="text-xs font-bold text-phase-4">2 flags</span>
        </div>
        <div className="space-y-3">
          <div className="p-3 bg-dashboard border border-phase-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-1.5 h-1.5 bg-phase-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-phase-4">Mismatch Detected</span>
            </div>
            <p className="text-xs text-phase-3">Purchase price on HUD-1 ($420,000) differs from contract ($425,000)</p>
          </div>
          <div className="p-3 bg-dashboard border border-phase-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="w-1.5 h-1.5 bg-phase-2" />
              <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Missing Field</span>
            </div>
            <p className="text-xs text-phase-3">Seller entity EIN not provided on closing disclosure</p>
          </div>
          <div className="p-3 border border-phase-1 opacity-60">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-phase-1" />
              <span className="text-xs font-bold uppercase tracking-widest text-phase-2">12 fields passed</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    outcome: 'Security',
    headline: 'Every role sees only what they need. Nothing more.',
    body: 'Contractors see the Triage Queue but never the capital stack. Lawyers access the Closing Room but can\'t view renovation budgets. Lead Investors see everything — and the system logs every access event to an immutable audit trail.',
    stat: '5',
    statLabel: 'distinct permission tiers',
    icon: ShieldCheck,
    visual: (
      <div className="bg-bg-surface border border-phase-1 p-6 w-full">
        <div className="pb-3 border-b border-dashboard mb-4">
          <span className="text-xs font-bold uppercase tracking-widest text-phase-2">Access Matrix</span>
        </div>
        <div className="space-y-2">
          {[
            { role: 'Lead Investor', access: ['Pipeline', 'Engine Room', 'Closing Room', 'Triage'], level: 'Full' },
            { role: 'Accountant', access: ['Engine Room', 'Reports'], level: 'Finance' },
            { role: 'Lawyer', access: ['Closing Room'], level: 'Legal' },
            { role: 'Contractor', access: ['Triage Queue'], level: 'Tasks' },
            { role: 'Agent', access: ['Pipeline', 'Listings'], level: 'Sales' },
          ].map((row) => (
            <div key={row.role} className="flex items-center justify-between py-2 border-b border-dashboard last:border-0">
              <span className="text-xs font-medium text-phase-4">{row.role}</span>
              <div className="flex items-center space-x-3">
                <span className="text-xs text-phase-2">{row.access.join(' · ')}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-phase-4 bg-dashboard px-2 py-0.5">
                  {row.level}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function BenefitsZigZag() {
  return (
    <section className="py-24 bg-bg-surface border-b border-phase-1">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-20">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            Core Outcomes
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-text-primary sm:text-4xl text-balance">
            Measurable impact from day one.
          </h2>
        </div>

        <div className="space-y-20">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            const isReversed = i % 2 !== 0;

            return (
              <div
                key={benefit.outcome}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center ${
                  isReversed ? 'lg:direction-rtl' : ''
                }`}
              >
                {/* Text side */}
                <div className={`${isReversed ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <Icon className="w-4 h-4 text-phase-3" />
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-phase-2">
                      {benefit.outcome}
                    </span>
                  </div>
                  <h3 className="text-2xl font-medium tracking-tight text-text-primary mb-4 leading-tight text-balance">
                    {benefit.headline}
                  </h3>
                  <p className="text-sm text-phase-3 leading-relaxed mb-6">
                    {benefit.body}
                  </p>
                  {/* Stat callout */}
                  <div className="inline-flex items-center space-x-3 border border-phase-1 px-4 py-3">
                    <span className="text-3xl font-medium text-text-primary tabular-nums">{benefit.stat}</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-phase-2 max-w-[100px] leading-tight">
                      {benefit.statLabel}
                    </span>
                  </div>
                </div>

                {/* Visual side */}
                <div className={`${isReversed ? 'lg:order-1' : 'lg:order-2'}`}>
                  {benefit.visual}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
