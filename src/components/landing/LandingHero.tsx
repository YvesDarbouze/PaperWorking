import Link from 'next/link';

/* ═══════════════════════════════════════════════════════
   LandingHero — Responsive typography with proper
   mobile-first breakpoints.

   Breakpoints:
     default  → mobile phones (< 640px)
     sm       → large phones / small tablets (≥ 640px)
     md       → tablets (≥ 768px)
     lg       → laptops / desktops (≥ 1024px)
     xl       → wide screens (≥ 1280px)

   The h1 tops out at ~3.75rem (60px) on desktop —
   readable without colliding with the fixed header.
   ═══════════════════════════════════════════════════════ */

export default function LandingHero() {
  return (
    <section
      className="
        relative flex flex-col items-center justify-center text-center
        w-full h-full
        px-5 sm:px-8 lg:px-12
        pt-28 sm:pt-32 md:pt-36 lg:pt-40
        pb-16 sm:pb-20 lg:pb-24
      "
    >
      <div className="z-10 relative w-full max-w-3xl mx-auto space-y-8 sm:space-y-10">
        {/* ── Headline ── */}
        <h1
          className="
            text-[2rem] leading-[1.12]
            sm:text-[2.5rem]
            md:text-[3rem]
            lg:text-[3.5rem]
            xl:text-[3.75rem]
            tracking-[-0.025em]
            text-[var(--pw-black)]
          "
        >
          The Operating Engine for{' '}
          <br className="hidden md:block" />
          Modern Real Estate Investors.
        </h1>

        {/* ── Sub-copy ── */}
        <p
          className="
            text-base leading-relaxed
            sm:text-lg
            md:text-xl
            text-[var(--pw-subtle)]
            max-w-2xl mx-auto
            font-light
          "
        >
          Consolidate your deal pipeline, financial modeling, and asset
          management into a single, meticulously designed platform. Close
          deals with unprecedented clarity and speed.
        </p>

        {/* ── CTA ── */}
        <div className="pt-2 sm:pt-4">
          <Link
            href="/register"
            className="
              ag-button
              text-base sm:text-lg
              px-8 py-4 sm:px-10 sm:py-5
            "
            style={{
              backgroundColor: '#0d0d0d',
              color: '#ffffff',
            }}
          >
            Start Building Your Portfolio
          </Link>
        </div>
      </div>
    </section>
  );
}
