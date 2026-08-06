'use client';

import Link from 'next/link';
import HowItWorksLifecycleGraphic from './HowItWorksLifecycleGraphic';

/* ═══════════════════════════════════════════════════════
   HowItWorks — The REIL System
   Marketing page /how-it-works
   ═══════════════════════════════════════════════════════ */

export default function HowItWorks() {
  const showDemoCta = process.env.NEXT_PUBLIC_ENABLE_DEMO_CTA === 'true';

  return (
    <div className="bg-background text-on-background">

      {/* ════════════ 1. HERO ════════════ */}
      <section className="relative flex items-center justify-center pt-16 pb-12 md:pt-20 md:pb-16 overflow-hidden border-b border-white/5">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary uppercase tracking-widest mb-8 type-eyebrow">
            <span className="material-symbols-rounded text-sm">hub</span>
            SOMETHING_DIFFERENT_BAD
          </div>

          {/* Headline */}
          <h1 className="font-semibold tracking-[-0.025em] leading-[1.05] mb-8 text-on-surface type-display">
            How PaperWorking Works
          </h1>

          {/* Body — Cleaned Copy */}
          <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] max-w-3xl mx-auto type-body-lg">
            Real estate investments move through a unique four-phase lifecycle: &quot;Acquisition&quot;, &quot;Fund&quot;, &quot;Hold&quot;, &quot;Exit.&quot; PaperWorking organizes investments and investment teams to give real estate investors the tools to make their investment process more organized and informed.
          </p>
        </div>
      </section>

      {/* ════════════ 2. WHAT A PROJECT IS ════════════ */}
      <section className="py-12 md:py-16 lg:py-20 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-6 leading-tight type-h2">
              What a Project is
            </h2>
            <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] mb-4 type-body">
              A Project is the home base for one investment. It holds the Deal (the property and its numbers), the phase it&apos;s in, the tasks and deadlines ahead, the documents, the budget, and the ledger of every dollar in and out. You work in the Project; PaperWorking calculates your metrics from it.
            </p>
            <p className="text-base sm:text-lg font-semibold text-on-surface leading-relaxed type-body">
              The work you already do becomes the numbers you need.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ 3. PHASES 1–4 ════════════ */}
      <section className="py-12 md:py-16 lg:py-20 border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 space-y-12">

          {/* Phase 1 — Acquisition */}
          <div className="glass-card rounded-[24px] p-8 sm:p-10 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary font-medium mb-3 block type-caption">
              PHASE 01
            </span>
            <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
              Phase 1 — Acquisition
            </h2>
            <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
              <p>
                Acquisition: Decide if the deal works before you buy. The Deal Analyzer pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.
              </p>
              <p>
                What you log here (purchase price, projected rents, rehab estimate) becomes the baseline your actuals are measured against later.
              </p>
              <p>
                Raising money from partners? List the deal on the Deal Marketplace to track interest from other real estate investors in your network and pledges from investors in the PaperWorking community. Interest and pledges are tracked here; every closing happens between the parties, off-platform. No money moves through PaperWorking.
              </p>
            </div>
          </div>

          {/* Phase 2 — Fund */}
          <div className="glass-card rounded-[24px] p-8 sm:p-10 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-secondary font-medium mb-3 block type-caption">
              PHASE 02
            </span>
            <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
              Phase 2 — Fund
            </h2>
            <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
              <p>
                Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.
              </p>
            </div>
          </div>

          {/* Phase 3 — Hold */}
          <div className="glass-card rounded-[24px] p-8 sm:p-10 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-tertiary font-medium mb-3 block type-caption">
              PHASE 03
            </span>
            <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
              Phase 3 — Hold
            </h2>
            <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
              <p>
                Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.
              </p>
              <p>
                The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney when the project needs them.
              </p>
            </div>
          </div>

          {/* Phase 4 — Exit */}
          <div className="glass-card rounded-[24px] p-8 sm:p-10 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-outline font-medium mb-3 block type-caption">
              PHASE 04
            </span>
            <h2 className="font-semibold tracking-[-0.02em] text-on-surface mb-4 leading-tight type-h2">
              Phase 4 — Exit
            </h2>
            <div className="space-y-4 text-base text-on-surface-variant leading-[1.65] type-body">
              <p>
                Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════ 4. LIFECYCLE BODY COPY ════════════ */}
      <section className="py-14 md:py-20 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-on-surface mb-6 leading-tight type-h2">
              The Real Estate Investment Lifecycle
            </h2>
            <div className="space-y-5 text-base sm:text-lg text-on-surface-variant leading-[1.65] type-body">
              <p>
                Real Estate investments move through a unique lifecycle that is different from most traditional project management workflows. PaperWorking structures every deal around four core phases: Acquisition, Fund, Hold, and Exit. Each phase has its own specific inputs, milestones, compliance gates, and financial calculations.
              </p>
              <p>
                By organizing your work around these four phases, PaperWorking ensures that no critical deadline is missed, expenses are tracked from day one, and investment metrics are calculated automatically from your actual project data — per deal and across your entire portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 5. ONE DEAL, ALL THE WAY THROUGH ════════════ */}
      <section className="py-14 md:py-20 border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-on-surface mb-8 leading-tight type-h2">
              One deal, all the way through
            </h2>
            <div className="space-y-6 text-base sm:text-lg text-on-surface-variant leading-[1.65] type-body">
              <p>
                Take one deal. You find a duplex and run the address through the Deal Analyzer; the projected cap rate and cash-on-cash clear your bar, so you save it to the pipeline. Those projections become your baseline.
              </p>
              <p>
                You go under contract, and the Project moves to Fund. The inspection deadline, the appraisal contingency, and the earnest money date get tracked with alerts. Contracts and title work go into the vault.
              </p>
              <p>
                At Hold, you build the rehab budget line by line and link each milestone to it. Every contractor draw and invoice gets logged against a line item. Rent comes in through your connected accounts. You never open a spreadsheet, but cost basis, holding costs, and cash-on-cash stay current, because the ledger is the work.
              </p>
              <p>
                When you sell or refinance, the Exit report reads from that same ledger: actual NOI, DSCR, equity multiple. Your CPA gets the P&amp;L export. The Project closes, the history stays, and your portfolio numbers update the day it happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ 6. LEAD INVESTOR AND TEAM ROLES ════════════ */}
      <section className="py-14 md:py-20 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em] text-on-surface mb-6 leading-tight type-h2">
              Lead Investor and Team roles
            </h2>
            <p className="text-base sm:text-lg text-on-surface-variant leading-[1.65] mb-6 type-body">
              An Investor account runs solo. An Investment Team account has a Lead Investor, the person running the team, who invites members, assigns tasks and phases, and controls what each can view or edit.
            </p>
            <ul className="space-y-3 mb-6 pl-5 list-disc text-base sm:text-lg text-on-surface-variant type-body">
              <li>Partners work the phases they&apos;re assigned.</li>
              <li>Your CPA reads the books without being able to touch them.</li>
              <li>Contractors and vendors see only the work they&apos;re assigned.</li>
            </ul>
            <p className="text-base sm:text-lg font-semibold text-on-surface leading-relaxed mb-4 type-body">
              Two investors can also team up on a single Project without merging accounts.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ 7. DEMO CTA ════════════ */}
      <section className="py-14 md:py-20 lg:py-24 relative overflow-hidden bg-surface-container-low/30 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-base sm:text-lg text-on-surface mb-8 font-medium type-body-lg">
            Want to see it first? Walk through a live demo deal: pipeline, budgets, deadlines, and metrics included.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-[15px] font-semibold tracking-wide cursor-pointer type-cta"
            >
              Start Free 14-Day Trial
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>

            {showDemoCta && (
              <Link
                href="/demo"
                className="px-7 py-4 rounded-full border border-white/15 text-on-surface text-[15px] font-semibold hover:border-primary/40 hover:text-primary transition-all inline-flex items-center gap-2 type-cta"
              >
                Explore the demo
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ════════════ 8. FINAL CONTENT SECTION — GRAPHIC COMPONENT (2C) ════════════ */}
      <HowItWorksLifecycleGraphic />

    </div>
  );
}
