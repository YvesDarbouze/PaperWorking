import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Buildings,
  ChartLineUp,
  FolderOpen,
  ShieldCheck,
  ArrowRight,
} from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'About PaperWorking',
  description:
    'Project management and deal underwriting software built for real estate investors and investment teams across the Real Estate Investment Lifecycle (REIL).',
};

const REIL_PILLARS = [
  {
    phase: 'Phase 01',
    title: 'Acquisition',
    summary:
      'Underwrite prospective deals with the 33-metric Deal Calculator, model debt and equity scenarios, and track opportunities from initial screening to accepted offer.',
    icon: ChartLineUp,
  },
  {
    phase: 'Phase 02',
    title: 'Fund',
    summary:
      'Coordinate earnest money, lender requirements, closing checklists, and transaction documents in a single structured vault with automated deadline tracking.',
    icon: ShieldCheck,
  },
  {
    phase: 'Phase 03',
    title: 'Hold',
    summary:
      'Manage rehab milestones, vendor draws, and operating expenses against your underwriting baseline so budget-versus-actual variance stays visible in real time.',
    icon: FolderOpen,
  },
  {
    phase: 'Phase 04',
    title: 'Exit',
    summary:
      'Execute disposition or stabilization across outright sale, long-term rental, short-term rental, or refinance with an auditable performance record.',
    icon: Buildings,
  },
] as const;

const OPERATING_PRINCIPLES = [
  {
    title: 'Institutional rigor without spreadsheet fragility',
    body: 'Every formula in PaperWorking is deterministic, documented in our 33-metric playbook, and linked directly to project execution records.',
  },
  {
    title: 'One system across the entire deal lifecycle',
    body: 'Underwriting assumptions flow directly into closing checklists, renovation budgets, and hold-period cash flow tracking without manual re-entry.',
  },
  {
    title: 'Built for principals, operators, and field partners',
    body: 'Role-scoped workspaces let acquisition leads, asset managers, lenders, and verified contractors collaborate on the exact records they need.',
  },
] as const;

export default function AboutPage() {
  return (
    <div
      data-testid="about-page"
      className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 md:px-8 md:py-16"
    >
      {/* Hero section */}
      <header className="border-b border-border pb-10 md:pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Company &amp; Mission
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          About PaperWorking
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          PaperWorking is the operating system for real estate investors and investment teams. We unify deal underwriting, transaction funding, renovation execution, and exit reporting inside one architectural workspace built around the Real Estate Investment Lifecycle (REIL).
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/how-it-works"
            data-testid="about-cta-how-it-works"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-none bg-foreground px-5 py-2.5 text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90"
          >
            <span>Explore How It Works</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="/deal-calculator"
            data-testid="about-cta-calculator"
            className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted/50"
          >
            Open Deal Calculator
          </Link>
        </div>
      </header>

      {/* REIL Four Phases */}
      <section className="py-10 md:py-14" aria-labelledby="reil-architecture-heading">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The REIL Framework
          </p>
          <h2
            id="reil-architecture-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Four phases. One continuous record.
          </h2>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Real estate deals break down when acquisition models, closing documents, contractor budgets, and disposition reports live in disconnected tools. PaperWorking connects all four stages.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REIL_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                data-testid={`about-reil-card-${pillar.title.toLowerCase()}`}
                className="flex flex-col justify-between rounded-none border border-border bg-card p-6"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {pillar.phase}
                    </span>
                    <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {pillar.summary}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Operating Principles */}
      <section
        className="border-t border-border py-10 md:py-14"
        aria-labelledby="operating-principles-heading"
      >
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Product Standards
          </p>
          <h2
            id="operating-principles-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Designed for analytical precision
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {OPERATING_PRINCIPLES.map((item) => (
            <div
              key={item.title}
              className="rounded-none border border-border bg-card p-6"
            >
              <h3 className="text-base font-bold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Bar */}
      <section className="border-t border-border pt-10">
        <div className="flex flex-col items-start justify-between gap-6 rounded-none border border-border bg-card p-6 sm:p-8 md:flex-row md:items-center">
          <div className="max-w-xl">
            <h2 className="text-xl font-bold text-foreground">
              Ready to standardize your deal pipeline?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Start a 14-day trial or connect with our team to walk through your portfolio workflow.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-foreground px-5 py-2.5 text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted/50"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
