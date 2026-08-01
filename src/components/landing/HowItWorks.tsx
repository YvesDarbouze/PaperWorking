'use client';

import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════
   HowItWorks — The REIL System
   Marketing page /how-it-works — verbatim approved copy.
   ═══════════════════════════════════════════════════════════════ */

export default function HowItWorks() {
  const showDemoCta = process.env.NEXT_PUBLIC_ENABLE_DEMO_CTA === 'true';

  return (
    <div className="bg-background text-on-background">

      {/* ════════════ 1. HERO ════════════ */}
      <section className="relative flex items-center justify-center pt-28 pb-20 md:py-32 overflow-hidden border-b border-white/5">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          {/* Eyebrow — verbatim */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest mb-8 type-eyebrow">
            <span className="material-symbols-rounded text-sm">hub</span>
            The REIL: the Real Estate Investment Lifecycle
          </div>

          {/* Headline — verbatim */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight leading-[1.1] mb-8 text-on-surface type-display">
            Four phases. One record. Thirty-three numbers.
          </h1>

          {/* Body — verbatim */}
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed max-w-3xl mx-auto type-body-lg">
            Every investment property moves through the same lifecycle: Acquisition, Fund, Hold, Exit. We call it the Real Estate Investment Lifecycle, and PaperWorking is built on it — not adapted from generic project software. Here&apos;s what happens at each phase.
          </p>
        </div>
      </section>

      {/* ════════════ 2. WHAT A PROJECT IS ════════════ */}
      <section className="py-16 md:py-24 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            What a Project is
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            A Project is the home base for one investment. It holds the Deal (the property and its numbers), its phase, tasks and deadlines, documents, budget, and the ledger of every dollar in and out. The work you already do becomes the numbers you need.
          </p>
        </div>
      </section>

      {/* ════════════ 3–6. PHASES 1–4 ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 md:px-10 space-y-12">

          {/* Phase 1 — Acquisition */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-primary font-bold mb-3 block type-caption">
              PHASE 01
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Phase 1: Acquisition
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Search properties, run comps, analyze cash flow, and test deal scenarios before making an offer.
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant/90 pl-5 list-disc">
              <li>Property search: address lookup and tax records.</li>
              <li>Deal Analyzer: cap rate, cash-on-cash, and IRR projections.</li>
              <li>Sensitivity solver: test purchase price, rent, and interest rate scenarios.</li>
            </ul>
          </div>

          {/* Phase 2 — Fund */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-secondary font-bold mb-3 block type-caption">
              PHASE 02
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Phase 2: Fund
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Track earnest money, manage loan contingencies, organize title and inspection docs, and line up capital.
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant/90 pl-5 list-disc">
              <li>Contingency tracker: inspection, appraisal, and financing deadlines with alerts.</li>
              <li>Document vault: contracts, title commitments, and insurance binders in one place.</li>
              <li>Capital stack: track debt, equity, and investor commitments per deal.</li>
            </ul>
          </div>

          {/* Phase 3 — Hold */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-tertiary font-bold mb-3 block type-caption">
              PHASE 03
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Phase 3: Hold
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Manage rehab budgets, log tenant payments, track vendor draws, and monitor live property performance.
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant/90 pl-5 list-disc">
              <li>Rehab budget: line-item budget vs. actuals with contractor draw tracking.</li>
              <li>Connected accounts: transaction matching and automated rent logging.</li>
              <li>Live scorecard: NOI, cap rate, and DSCR updated as work happens.</li>
            </ul>
          </div>

          {/* Phase 4 — Exit */}
          <div className="glass-card rounded-2xl p-8 border border-white/8 bg-surface-container-low/30 backdrop-blur-xl">
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-outline font-bold mb-3 block type-caption">
              PHASE 04
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-on-surface mb-4 leading-tight type-h2">
              Phase 4: Exit
            </h2>
            <p className="text-base text-on-surface-variant leading-relaxed mb-6 type-body">
              Prepare disposition reports, run 1031 exchange scenarios, export CPA files, and lock final deal history.
            </p>
            <ul className="space-y-2 text-sm text-on-surface-variant/90 pl-5 list-disc">
              <li>Exit scenario solver: sale vs. refinance analysis with tax-impact estimates.</li>
              <li>CPA export: one-click P&amp;L and transaction ledger exports.</li>
              <li>Deal history: permanent record of every document, dollar, and decision.</li>
            </ul>
          </div>

        </div>
      </section>

      {/* ════════════ 7. ONE DEAL, ALL THE WAY THROUGH ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-8 leading-tight type-h2">
            One deal, all the way through
          </h2>
          <div className="space-y-6 text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            <p>
              Take one deal. Run a duplex through the Deal Analyzer; projected cap rate and cash-on-cash clear your bar. Save it to the pipeline, and those projections become your baseline.
            </p>
            <p>
              Under contract, the Project moves to Fund. The inspection deadline, appraisal contingency, and earnest money date get tracked with alerts; contracts and title work go into the vault.
            </p>
            <p>
              At Hold, you build the rehab budget line by line and log every contractor draw and invoice against it; rent comes in through connected accounts. Cost basis, holding costs, and cash-on-cash stay current without a spreadsheet, because the ledger is the work.
            </p>
            <p>
              When you sell or refinance, the Exit report reads from that same ledger: actual NOI, DSCR, equity multiple. Your CPA gets the P&amp;L export. The Project closes, the history stays, and your portfolio numbers update that day.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════ 8. LEAD INVESTOR AND TEAM ROLES ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Bring your team. Keep control of the keys.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed mb-6 type-body">
            An Investor account runs solo. An Investment Team account has a Lead Investor, the person running the team, who invites members, assigns tasks and phases, and controls what each can view or edit.
          </p>
          <ul className="space-y-3 mb-6 pl-5 list-disc text-base sm:text-lg text-on-surface-variant type-body">
            <li>Partners work the phases they&apos;re assigned.</li>
            <li>Your CPA reads everything and changes nothing.</li>
            <li>Contractors and vendors see only the work they&apos;re assigned, not your portfolio.</li>
          </ul>
          <p className="text-base sm:text-lg font-semibold text-on-surface leading-relaxed mb-4 type-body">
            Two investors can also team up on a single Project without merging accounts.
          </p>
          <p className="text-sm font-mono text-primary/90 bg-primary/10 border border-primary/20 p-4 rounded-xl">
            Role permissions: Admins, Editors, Viewers. Invite your CPA or private lenders as read-only
          </p>
        </div>
      </section>

      {/* ════════════ 9. REPORTING AND CPA EXPORTS ════════════ */}
      <section className="py-20 md:py-28 border-b border-white/5 bg-surface-container-low/20">
        <div className="max-w-4xl mx-auto px-6 md:px-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight type-h2">
            Your CPA gets one clean export, not a shoebox.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed type-body">
            Every expense is categorized by project and phase as you log it. At tax time, export a CPA-ready P&amp;L and full CSVs. Performance reports for lenders and partners come from actuals, not a spreadsheet sprint.
          </p>
        </div>
      </section>

      {/* ════════════ 10. DEMO CTA ════════════ */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-surface-container-low/30">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <p className="text-base sm:text-lg text-on-surface mb-8 font-medium type-body-lg">
            Want to see it first? Walk through a live demo deal: pipeline, budgets, deadlines, and metrics included.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link
              href="/pricing"
              className="luminous-button inline-flex items-center gap-2.5 px-8 py-4 rounded-xl text-[15px] font-semibold tracking-wide cursor-pointer type-cta"
            >
              Start Free 14-Day Trial
              <span className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>

            {showDemoCta && (
              <Link
                href="/demo"
                className="px-6 py-4 rounded-xl border border-white/10 text-on-surface text-[15px] font-semibold hover:border-primary/40 hover:text-primary transition-all inline-flex items-center gap-2 type-cta"
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

    </div>
  );
}
