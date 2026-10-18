import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Code, CompassTool, ShieldCheck } from '@phosphor-icons/react/dist/ssr';

export const metadata: Metadata = {
  title: 'Careers at PaperWorking',
  description:
    'Join the engineering, product, and real estate financial systems team building PaperWorking.',
};

const OPEN_ROLES = [
  {
    id: 'senior-fullstack-engineer',
    title: 'Senior Full-Stack Engineer (Financial Engine & Workspace)',
    department: 'Engineering',
    location: 'Remote (US) / Hybrid',
    type: 'Full-Time',
    summary:
      'Architect and scale deterministic underwriting engines, real-time portfolio reporting, and collaborative REIL project workspaces using TypeScript, Next.js, and Google Cloud.',
  },
  {
    id: 'product-designer-systems',
    title: 'Senior Product Designer (Design Systems & Data Density)',
    department: 'Design',
    location: 'Remote (US) / Hybrid',
    type: 'Full-Time',
    summary:
      'Own high-density financial interfaces, mobile field workflows, and our Radix Lyra component architecture for institutional and independent real estate operators.',
  },
  {
    id: 'real-estate-solutions-lead',
    title: 'Real Estate Underwriting & Operations Specialist',
    department: 'Customer & Domain Operations',
    location: 'Remote (US)',
    type: 'Full-Time',
    summary:
      'Partner directly with investment teams, private lenders, and general contractors to onboard portfolios, validate underwriting models, and expand our 33-metric playbook.',
  },
] as const;

const TEAM_VALUES = [
  {
    title: 'Precision over approximation',
    description:
      'Investors rely on our calculations to commit capital. We verify every financial metric, boundary condition, and data pipeline with automated test coverage.',
    icon: ShieldCheck,
  },
  {
    title: 'Craftsmanship in high-density tools',
    description:
      'We build software that feels like an analytical terminal on desktop and a responsive field instrument on mobile.',
    icon: CompassTool,
  },
  {
    title: 'End-to-end ownership',
    description:
      'Engineers and designers work directly with active real estate operators to turn complex transaction workflows into clean, reliable software.',
    icon: Code,
  },
] as const;

export default function CareersPage() {
  return (
    <div
      data-testid="careers-page"
      className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 md:px-8 md:py-16"
    >
      {/* Hero */}
      <header className="border-b border-border pb-10 md:pb-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Careers at PaperWorking
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
          Build the operating system for real estate investment teams
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          We are a focused team of engineers, system designers, and real estate underwriting specialists replacing fragmented spreadsheets with a unified lifecycle platform.
        </p>
      </header>

      {/* Values */}
      <section className="py-10 md:py-14" aria-labelledby="careers-values-heading">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            How We Work
          </p>
          <h2
            id="careers-values-heading"
            className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
          >
            Engineering and domain standards
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {TEAM_VALUES.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-none border border-border bg-card p-6"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-none border border-border bg-muted/40">
                  <Icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Open Roles */}
      <section
        className="border-t border-border py-10 md:py-14"
        aria-labelledby="open-positions-heading"
      >
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Open Positions
            </p>
            <h2
              id="open-positions-heading"
              className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
            >
              Current opportunities
            </h2>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {OPEN_ROLES.length} open roles
          </p>
        </div>

        <div className="space-y-4">
          {OPEN_ROLES.map((role) => (
            <article
              key={role.id}
              data-testid={`career-role-${role.id}`}
              className="flex flex-col justify-between gap-6 rounded-none border border-border bg-card p-6 md:flex-row md:items-center"
            >
              <div className="max-w-2xl space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="rounded-none border border-border bg-muted/40 px-2 py-0.5 font-mono uppercase">
                    {role.department}
                  </span>
                  <span>•</span>
                  <span>{role.location}</span>
                  <span>•</span>
                  <span>{role.type}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground">{role.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {role.summary}
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href={`/contact?topic=careers&role=${encodeURIComponent(role.id)}`}
                  data-testid={`career-apply-${role.id}`}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-none bg-foreground px-5 py-2.5 text-sm font-semibold text-background no-underline transition-opacity hover:opacity-90 sm:w-auto"
                >
                  <span>Apply via Contact Desk</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
