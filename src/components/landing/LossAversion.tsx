import React from 'react';
import { X, Check } from 'lucide-react';

/**
 * LossAversion
 *
 * "What You're Losing" comparison section. Shows time/money leakage
 * in manual processes vs. PaperWorking. Uses a clean table layout.
 * Strict PaperWorking palette.
 */

const comparisons = [
  {
    category: 'Document Processing',
    manual: { label: '4.5 hrs / deal', detail: 'Manual data entry, scanning, filing' },
    pw: { label: '12 min / deal', detail: 'AI extraction, auto-routing, digital filing' },
  },
  {
    category: 'Financial Reconciliation',
    manual: { label: '6 hrs / week', detail: 'Spreadsheet matching, bank statement cross-checks' },
    pw: { label: 'Real-time', detail: 'Engine Room auto-reconciles every transaction' },
  },
  {
    category: 'Team Communication',
    manual: { label: '23 emails / deal', detail: 'Status updates, document requests, approvals' },
    pw: { label: '0 emails', detail: 'In-app notifications, auto-assignments, audit trail' },
  },
  {
    category: 'Compliance Errors',
    manual: { label: '1 in 8 closings', detail: 'Missing fields, mismatched data, late filings' },
    pw: { label: 'Near zero', detail: 'Pre-close validation catches issues before signing' },
  },
  {
    category: 'Onboarding New Hires',
    manual: { label: '2 weeks', detail: 'Shadow training, tribal knowledge transfer' },
    pw: { label: '1 day', detail: 'Role-based views, guided workflows, self-serve' },
  },
];

export default function LossAversion() {
  return (
    <section className="py-24 bg-white border-b border-phase-1">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-phase-2 mb-4">
            The Cost of Doing Nothing
          </p>
          <h2 className="text-3xl font-medium tracking-tight text-black sm:text-4xl text-balance">
            What you&apos;re losing every week.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-phase-3 leading-relaxed">
            Every manual process is a silent tax on your operation. Here&apos;s where the hours and dollars go.
          </p>
        </div>

        {/* Comparison Table */}
        <div className="border border-phase-1 bg-dashboard overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-phase-1">
            <div className="p-4 sm:p-5 bg-dashboard">
              <span className="text-[10px] font-bold uppercase tracking-widest text-phase-2">Category</span>
            </div>
            <div className="p-4 sm:p-5 bg-dashboard border-l border-phase-1">
              <div className="flex items-center space-x-2">
                <X className="w-3.5 h-3.5 text-phase-3" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-phase-3">Manual Process</span>
              </div>
            </div>
            <div className="p-4 sm:p-5 bg-black border-l border-phase-4">
              <div className="flex items-center space-x-2">
                <Check className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">PaperWorking</span>
              </div>
            </div>
          </div>

          {/* Rows */}
          {comparisons.map((row, i) => (
            <div key={row.category} className={`grid grid-cols-3 ${i < comparisons.length - 1 ? 'border-b border-phase-1' : ''}`}>
              {/* Category */}
              <div className="p-4 sm:p-5 bg-white">
                <span className="text-xs font-bold text-black">{row.category}</span>
              </div>

              {/* Manual — pain */}
              <div className="p-4 sm:p-5 bg-white border-l border-phase-1">
                <span className="text-sm font-medium text-phase-3">{row.manual.label}</span>
                <p className="text-[10px] text-phase-2 mt-1 hidden sm:block">{row.manual.detail}</p>
              </div>

              {/* PaperWorking — gain */}
              <div className="p-4 sm:p-5 bg-dashboard border-l border-phase-1">
                <span className="text-sm font-bold text-black">{row.pw.label}</span>
                <p className="text-[10px] text-phase-3 mt-1 hidden sm:block">{row.pw.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom stat */}
        <div className="mt-8 text-center">
          <p className="text-sm text-phase-3">
            Teams using PaperWorking report an average of{' '}
            <span className="font-bold text-black">$57,600 saved annually</span>{' '}
            in operational costs.
          </p>
        </div>
      </div>
    </section>
  );
}
