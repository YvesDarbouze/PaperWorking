'use client';

import Link from 'next/link';

/** Above-fold product preview — ported from PaperWorking LandingHero. */
function HeroDealCard() {
  return (
    <div className="glass-card w-full overflow-hidden rounded-[28px] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
        <div>
          <div className="mb-0.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-widest text-white/40">
            Deal Analyzer
          </div>
          <div className="text-[13px] font-semibold text-white">1247 Elm Street, Austin TX</div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-primary)]/20 bg-[color:var(--color-primary)]/10 px-3 py-1 text-[10px] font-semibold text-[color:var(--color-primary)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
          DEMO DATA
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 p-5">
        {[
          { label: 'Purchase Price', value: '$485,000' },
          { label: 'After Repair Value', value: '$620,000' },
          { label: 'Rehab Budget', value: '$68,000' },
          { label: 'Cap Rate', value: '6.2%' },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3.5"
          >
            <div className="mb-1.5 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-widest text-white/40">
              {label}
            </div>
            <div className="text-[17px] font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="px-5">
        <div className="rounded-2xl border border-[color:var(--color-primary)]/15 bg-[color:var(--color-primary)]/[0.08] px-5 py-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <div className="mb-1 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase tracking-widest text-[color:var(--color-primary)]/50">
                Projected IRR
              </div>
              <div className="text-[38px] font-extrabold leading-none tracking-tighter text-[color:var(--color-primary)]">
                24.8%
              </div>
            </div>
            <div className="text-right">
              <div className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[9px] uppercase text-white/40">
                Confidence
              </div>
              <div className="font-[family-name:var(--font-jetbrains-mono)] text-[16px] font-bold text-[color:var(--color-primary)]">
                84%
              </div>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/10">
            <div className="h-full w-[84%] rounded-full bg-[color:var(--color-primary)]/70" />
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] px-4 py-3">
          <span
            className="material-symbols-outlined shrink-0 text-[14px] text-amber-300/80"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden
          >
            notifications_active
          </span>
          <span className="text-[12px] leading-tight text-white/65">
            <span className="font-semibold text-amber-300">Alert:</span> Appraisal contingency
            expires in 3 days
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="pointer-events-none absolute right-0 top-0 h-[600px] w-[700px] rounded-full bg-[color:var(--color-primary)]/[0.08] blur-[160px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-10 px-6 pb-12 pt-8 md:gap-14 md:px-8 md:pb-16 md:pt-12 lg:grid-cols-[1fr_440px] lg:pb-20 lg:pt-16 xl:grid-cols-[1fr_480px]">
        <div className="flex flex-col items-start text-left">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[color:var(--color-primary)]" />
            <span className="font-[family-name:var(--font-jetbrains-mono)] text-[10px] uppercase tracking-widest text-white/60">
              Real Estate Investment Terminal
            </span>
          </span>

          <h1 className="landing-display mb-6 font-semibold leading-[1.05] tracking-[-0.025em] text-white">
            Finally, Project Management software made for serious real estate investors and
            Investments teams.
          </h1>

          <p className="max-w-[560px] text-[16px] font-normal leading-[1.65] text-white/65 md:text-[18px]">
            Real Estate investments have a unique lifecycle that is different from most work related
            projects. Real Estate Investments move through a unique lifecycle that includes the
            following phases &quot;Acquisition&quot;, &quot;Fund&quot;, &quot;Hold&quot;,
            &quot;Exit.&quot; PaperWorking organizes investments and investment teams to give Real
            Estate investors the tools to make their investments process more organized and
            informed.
          </p>
        </div>

        <div className="relative flex w-full flex-col items-center gap-5 lg:w-auto">
          <div className="relative w-full">
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl bg-[color:var(--color-primary)]/[0.06] blur-[60px]"
              aria-hidden
            />
            <div className="relative">
              <HeroDealCard />
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="group relative inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full bg-[color:var(--color-primary)] px-6 py-3 text-center text-[14px] font-semibold tracking-[-0.01em] text-[#0d0a0b] shadow-[0_0_24px_-4px_rgba(0,221,148,0.55)] transition hover:brightness-110 sm:w-auto"
            >
              <span
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                aria-hidden
              />
              <span>Start Your Free 14 Days Trial</span>
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                arrow_forward
              </span>
            </Link>

            <Link
              href="/support"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-3 text-center text-[14px] font-semibold text-white transition-all hover:border-[color:var(--color-primary)]/40 hover:text-[color:var(--color-primary)] sm:w-auto"
            >
              <span>33 KPIs</span>
              <span className="material-symbols-outlined text-[18px]">bar_chart</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
