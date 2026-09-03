'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { resolveAppHomeRoute } from '@/lib/auth/post-auth-redirect';

// TODO(VERIFY): Confirm demo KPIs show real, non-zero values before promoting demo content.

/* ─── Above-fold product preview card (1247 Elm Street demo data) ─── */
function HeroDealCard() {
  return (
    <div className="glass-card rounded-[28px] overflow-hidden w-full border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">

      {/* Card header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
        <div>
          <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-0.5 type-eyebrow">
            Deal Analyzer
          </div>
          <div className="text-[13px] font-semibold text-on-surface">1247 Elm Street, Austin TX</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 type-caption">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          DEMO DATA
        </span>
      </div>

      {/* Metrics 2×2 */}
      <div className="grid grid-cols-2 gap-2.5 p-5">
        {[
          { label: 'Purchase Price',    value: '$485,000' },
          { label: 'After Repair Value', value: '$620,000' },
          { label: 'Rehab Budget',      value: '$68,000'  },
          { label: 'Cap Rate',          value: '6.2%'     },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-container-low/60 rounded-2xl px-4 py-3.5 border border-white/5">
            <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase tracking-widest mb-1.5 type-eyebrow">
              {label}
            </div>
            <div className="text-[17px] font-bold text-on-surface type-metric">{value}</div>
          </div>
        ))}
      </div>

      {/* IRR highlight */}
      <div className="px-5">
        <div className="bg-primary/8 border border-primary/15 rounded-2xl px-5 py-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-jetbrains text-[9px] text-primary/50 uppercase tracking-widest mb-1 type-eyebrow">
                Projected IRR
              </div>
              <div className="text-[38px] font-extrabold text-primary luminous-text tracking-tighter leading-none type-metric">
                24.8%
              </div>
            </div>
            <div className="text-right">
              <div className="font-jetbrains text-[9px] text-on-surface-variant/40 uppercase mb-2 type-eyebrow">
                Confidence
              </div>
              <div className="font-jetbrains text-[16px] font-bold text-primary type-metric">84%</div>
            </div>
          </div>
          {/* Static bar */}
          <div className="h-2 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full w-[84%] rounded-full bg-primary/70" />
          </div>
        </div>
      </div>

      {/* Deadline alert */}
      <div className="p-5">
        <div className="bg-tertiary/6 border border-tertiary/15 rounded-2xl px-4 py-3 flex items-center gap-3">
          <span
            className="material-symbols-outlined text-[14px] text-tertiary/80 flex-shrink-0"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            notifications_active
          </span>
          <span className="text-[12px] text-on-surface-variant leading-tight type-caption">
            <span className="font-semibold text-tertiary">Alert:</span> Appraisal contingency expires in 3 days
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Hero Component (Section 1) ─── */
export default function LandingHero() {
  const { authenticated, loading, profile } = useAuth();
  const appHomeHref = resolveAppHomeRoute(profile?.accountType);

  return (
    <section className="relative w-full overflow-hidden" style={{ paddingTop: 72 }}>

      {/* Ambient glow */}
      <div
        className="absolute top-0 right-0 w-[700px] h-[600px] bg-primary/8 blur-[160px] rounded-full pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 md:px-8 pt-8 pb-12 md:pt-12 md:pb-16 lg:pt-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_480px] gap-10 lg:gap-14 items-center">

        {/* ── LEFT: Verbatim Section 1 Copy ────────────────── */}
        <div className="flex flex-col items-start text-left">

          {/* Eyebrow (pill) */}
          <span className="inline-flex items-center gap-2 glass-panel px-4 py-1.5 rounded-full mb-8 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-jetbrains text-[10px] uppercase tracking-widest text-on-surface-variant type-eyebrow">
              Real Estate Investment Terminal
            </span>
          </span>

          {/* Headline — verbatim COPY-L1 (medium-weight 500-600, clamp scale, tight tracking) */}
          <h1 className="leading-[1.05] font-semibold tracking-[-0.025em] text-on-surface mb-6 type-display">
            Finally, Project Management software made for serious real estate investors and Investments teams.
          </h1>

          {/* Body — verbatim approved copy */}
          <p className="text-[16px] md:text-[18px] leading-[1.65] font-normal text-on-surface-variant max-w-[560px] type-body-lg">
            Every real estate deal runs through the same four phases: Acquisition, Fund, Hold, Exit. PaperWorking manages all four phases of an investment in one place and turns the work you&apos;re already doing into the 33 numbers that show whether your investments are actually working. NOI, cap rate, DSCR, cash-on-cash, IRR — calculated from your own project data, per deal and across your portfolio.
          </p>
        </div>

        {/* ── RIGHT: Product proof Deal Card + Two CTAs Directly Underneath ── */}
        <div className="relative w-full lg:w-auto flex flex-col items-center gap-5">
          <div className="relative w-full">
            <div
              className="absolute inset-0 bg-primary/6 blur-[60px] rounded-3xl pointer-events-none"
              aria-hidden
            />
            <div className="relative">
              <HeroDealCard />
            </div>
          </div>

          {/* TWO buttons directly underneath the demo KPI card + microcopy */}
          <div className="flex flex-col items-center gap-2 w-full">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              {!loading && authenticated ? (
                <Link
                  href={appHomeHref}
                  className="luminous-button relative overflow-hidden px-6 py-3 min-h-[44px] rounded-full font-semibold text-[14px] tracking-[-0.01em] inline-flex items-center justify-center gap-2 group cursor-pointer type-cta w-full sm:w-auto text-center"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    aria-hidden
                  />
                  <span className="material-symbols-outlined text-[18px]">dashboard</span>
                  <span>Go to Dashboard</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              ) : (
                <Link
                  href="/pricing"
                  className="luminous-button relative overflow-hidden px-6 py-3 min-h-[44px] rounded-full font-semibold text-[14px] tracking-[-0.01em] inline-flex items-center justify-center gap-2 group cursor-pointer type-cta w-full sm:w-auto text-center"
                >
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                    aria-hidden
                  />
                  <span>Start Free 14-Day Trial</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              )}

              <Link
                href="/support/metrics"
                className="px-6 py-3 min-h-[44px] rounded-full border border-white/15 text-on-surface text-[14px] font-semibold hover:border-primary/40 hover:text-primary transition-all inline-flex items-center justify-center gap-2 type-cta w-full sm:w-auto text-center"
              >
                <span>See the 33 metrics</span>
                <span className="material-symbols-outlined text-[18px]">
                  bar_chart
                </span>
              </Link>
            </div>
            <p className="text-[12px] text-on-surface-variant/70 text-center type-caption">
              {!loading && authenticated
                ? 'Welcome back — pick up where you left off.'
                : 'Free 14-day trial.'}
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
