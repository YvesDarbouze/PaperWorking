'use client';

import Link from 'next/link';
import {
  dealCalculatorSectionTitle,
  dealCalculatorSectionBody,
  dealCalculatorSectionSub,
} from '@/lib/marketing/copy';
import ReilPhaseModules from '@/components/marketing/ReilPhaseModules';

/** Ported from PaperWorking `components/landing/HowItWorks.tsx`. */
export default function HowItWorks() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/5 pb-16 pt-10 md:pb-24 md:pt-12">
        <div className="pointer-events-none absolute left-1/2 top-1/4 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--color-primary)]/5 blur-[160px]" />

        <div className="relative z-10 mx-auto max-w-[1280px] px-6 text-center">
          {/* Client direction: the 4 phase cards only — no headline/narrative. */}
          <ReilPhaseModules />
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
                Secure capital and centralize all critical transaction documents before closing. Active
                countdown gauges monitor financing milestones, inspection windows, and title conditions.
              </p>
              <p>
                The secure document vault stores and verifies purchase agreements, title policies, and
                earnest money wiring confirmations, alerting all partners ahead of hard dates.
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
                Manage active renovations, contractor draw requests, and operating cashflow in real time.
                Every draw invoice is logged directly against your approved scope of work.
              </p>
              <p>
                The Vendor Marketplace earns its keep here: find and assign vetted contractors, appraisers,
                or real estate attorneys directly when project milestones demand them.
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
                Compile lender-ready disposition packages, 1031 exchange audit trails, and CPA tax
                exports with one click. Generate verified NOI, DSCR, and equity multiple reports.
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
    </div>
  );
}
