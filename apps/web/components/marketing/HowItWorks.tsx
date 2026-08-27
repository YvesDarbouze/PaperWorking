'use client';

import Link from 'next/link';
import HowItWorksLifecycleGraphic from '@/components/marketing/HowItWorksLifecycleGraphic';
import {
  howItWorksHeader,
  howItWorksSubheadline,
  howItWorksBody,
  dealCalculatorSectionTitle,
  dealCalculatorSectionBody,
  dealCalculatorSectionSub,
} from '@/lib/marketing/copy';

const PHASE_CARDS = [
  {
    num: 'PHASE 01',
    title: 'Acquisition',
    color: 'text-[color:var(--color-primary)]',
    accentBg: 'bg-[color:var(--color-primary)]/10 border-[color:var(--color-primary)]/20',
    description:
      'Acquisition: Decide if the deal works before you buy. The Deal Calculator pulls live property data, an automated valuation, and projected cap rate, IRR, and cash-on-cash.',
  },
  {
    num: 'PHASE 02',
    title: 'Fund',
    color: 'text-sky-400',
    accentBg: 'bg-sky-400/10 border-sky-400/20',
    description:
      'Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest money, keep contracts in one vault, get alerted before dates go hard.',
  },
  {
    num: 'PHASE 03',
    title: 'Hold',
    color: 'text-amber-400',
    accentBg: 'bg-amber-400/10 border-amber-400/20',
    description:
      'Hold: Own it and improve it. Link milestones to your budget, log expenses as they happen, watch holding costs and budget-vs-actual in real time.',
  },
  {
    num: 'PHASE 04',
    title: 'Exit',
    color: 'text-white/50',
    accentBg: 'bg-white/5 border-white/15',
    description:
      'Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance record your buyer, lender, or appraiser expects.',
  },
] as const;

/** Ported from PaperWorking `components/landing/HowItWorks.tsx`. */
export default function HowItWorks() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/5 pb-16 pt-8 md:pb-24 md:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-primary)]">
            <span className="material-symbols-outlined text-sm">hub</span>
            {howItWorksHeader}
          </div>

          <h1 className="landing-display mx-auto mb-6 max-w-4xl font-semibold leading-[1.1] tracking-[-0.025em] text-white">
            {howItWorksSubheadline}
          </h1>

          <p className="mx-auto mb-14 max-w-3xl text-base leading-[1.65] text-white/65 sm:text-lg">
            {howItWorksBody}
          </p>

          <div className="grid grid-cols-1 gap-5 text-left md:grid-cols-2 md:gap-6 lg:grid-cols-4">
            {PHASE_CARDS.map((card) => (
              <div
                key={card.num}
                className="glass-card group flex flex-col justify-between rounded-[22px] border border-white/10 bg-[#0c090b]/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--color-primary)]/40 sm:p-7"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`font-[family-name:var(--font-jetbrains-mono)] text-[11px] font-medium uppercase tracking-[0.15em] ${card.color}`}
                    >
                      {card.num}
                    </span>
                    <span className={`h-2 w-2 rounded-full border ${card.accentBg}`} />
                  </div>
                  <h2 className="mb-3 text-2xl font-bold tracking-[-0.02em] text-white transition-colors group-hover:text-[color:var(--color-primary)]">
                    {card.title}
                  </h2>
                  <p className="text-[13.5px] leading-[1.6] text-white/60 sm:text-[14px]">
                    {card.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-white/[0.02] py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              What a Project is
            </h2>
            <p className="mb-5 text-base leading-[1.65] text-white/65 sm:text-lg">
              A Project is the home base for one investment. It holds the Deal (the property and its
              numbers), the phase it&apos;s in, the tasks and deadlines ahead, the documents, the
              budget, and the ledger of every dollar in and out. You work in the Project; PaperWorking
              calculates your metrics from it.
            </p>
            <p className="text-base font-semibold leading-relaxed text-white sm:text-lg">
              The work you already do becomes the numbers you need.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] space-y-10 px-6 md:px-10">
          <div className="mb-8 max-w-3xl">
            <span className="mb-2 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              DEEP-DIVE WORKFLOWS
            </span>
            <h2 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-white md:text-3xl">
              Inside each phase of your deal
            </h2>
          </div>

          <div className="glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10">
            <span className="mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-[color:var(--color-primary)]">
              {dealCalculatorSectionTitle}
            </span>
            <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">
              {dealCalculatorSectionBody}
            </h3>
            <div className="space-y-4 text-base leading-[1.65] text-white/65">
              <p>
                {dealCalculatorSectionSub}
              </p>
              <p>
                What you log here (purchase price, projected rents, rehab estimate) becomes the
                baseline your actuals are measured against later.
              </p>
              <p>
                Raising money from partners? List the deal on the Deal Marketplace to track interest
                from other real estate investors in your network and pledges from investors in the
                PaperWorking community. Interest and pledges are tracked here; every closing happens
                between the parties, off-platform. No money moves through PaperWorking.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10">
            <span className="mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-sky-400">
              PHASE 02 · CAPITAL & CONTINGENCIES
            </span>
            <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">
              Phase 2 — Fund
            </h3>
            <div className="space-y-4 text-base leading-[1.65] text-white/65">
              <p>
                Fund: Get the money and paperwork lined up. Track contingency deadlines and earnest
                money, keep contracts in one vault, get alerted before dates go hard.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10">
            <span className="mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-amber-400">
              PHASE 03 · EXECUTE & OPTIMIZE
            </span>
            <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">
              Phase 3 — Hold
            </h3>
            <div className="space-y-4 text-base leading-[1.65] text-white/65">
              <p>
                Hold: Own it and improve it. Link milestones to your budget, log expenses as they
                happen, watch holding costs and budget-vs-actual in real time.
              </p>
              <p>
                The Vendor Marketplace earns its keep here: find the contractor, appraiser, or attorney
                when the project needs them.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-xl sm:p-10">
            <span className="mb-3 block font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-medium uppercase tracking-widest text-white/50">
              PHASE 04 · REALIZE & PROVE
            </span>
            <h3 className="mb-4 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white">
              Phase 4 — Exit
            </h3>
            <div className="space-y-4 text-base leading-[1.65] text-white/65">
              <p>
                Exit: Sell it or keep it as a rental, and prove what it made. Generate the performance
                record your buyer, lender, or appraiser expects.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-white/[0.02] py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="mb-6 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl md:text-4xl">
              The Real Estate Investment Lifecycle
            </h2>
            <div className="space-y-5 text-base leading-[1.65] text-white/65 sm:text-lg">
              <p>
                Real Estate investments move through a unique lifecycle that is different from most
                traditional project management workflows. PaperWorking structures every deal around
                four core phases: Acquisition, Fund, Hold, and Exit. Each phase has its own specific
                inputs, milestones, compliance gates, and financial calculations.
              </p>
              <p>
                By organizing your work around these four phases, PaperWorking ensures that no critical
                deadline is missed, expenses are tracked from day one, and investment metrics are
                calculated automatically from your actual project data — per deal and across your
                entire portfolio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="mb-8 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
              One deal, all the way through
            </h2>
            <div className="space-y-6 text-base leading-[1.65] text-white/65 sm:text-lg">
              <p>
                Take one deal. You find a duplex and run the address through the Deal Calculator; the
                projected cap rate and cash-on-cash clear your bar, so you save it to the pipeline.
                Those projections become your baseline.
              </p>
              <p>
                You go under contract, and the Project moves to Fund. The inspection deadline, the
                appraisal contingency, and the earnest money date get tracked with alerts. Contracts
                and title work go into the vault.
              </p>
              <p>
                At Hold, you build the rehab budget line by line and link each milestone to it. Every
                contractor draw and invoice gets logged against a line item. Rent comes in through your
                connected accounts. You never open a spreadsheet, but cost basis, holding costs, and
                cash-on-cash stay current, because the ledger is the work.
              </p>
              <p>
                When you sell or refinance, the Exit report reads from that same ledger: actual NOI,
                DSCR, equity multiple. Your CPA gets the P&amp;L export. The Project closes, the history
                stays, and your portfolio numbers update the day it happens.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/5 bg-white/[0.02] py-14 md:py-20">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10">
          <div className="max-w-3xl">
            <h2 className="mb-6 text-3xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
              Lead Investor and Team roles
            </h2>
            <p className="mb-6 text-base leading-[1.65] text-white/65 sm:text-lg">
              An Investor account runs solo. An Investment Team account has a Lead Investor, the person
              running the team, who invites members, assigns tasks and phases, and controls what each
              can view or edit.
            </p>
            <ul className="mb-6 list-disc space-y-3 pl-5 text-base text-white/65 sm:text-lg">
              <li>Partners work the phases they&apos;re assigned.</li>
              <li>Your CPA reads the books without being able to touch them.</li>
              <li>Contractors and vendors see only the work they&apos;re assigned.</li>
            </ul>
            <p className="mb-4 text-base font-semibold leading-relaxed text-white sm:text-lg">
              Two investors can also team up on a single Project without merging accounts.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-white/5 bg-white/[0.03] py-14 md:py-20 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[color:var(--color-primary)]/[0.03] to-transparent" />
        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
          <p className="mb-8 text-base font-medium text-white sm:text-lg">
            Want to see it first? Walk through a live demo deal: pipeline, budgets, deadlines, and
            metrics included.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-[color:var(--color-primary)] px-8 py-4 text-[15px] font-semibold tracking-wide text-[#0a0a0f] shadow-[0_0_24px_-4px_rgba(0,221,148,0.45)]"
            >
              Start Free 14-Day Trial
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      <HowItWorksLifecycleGraphic />
    </div>
  );
}
