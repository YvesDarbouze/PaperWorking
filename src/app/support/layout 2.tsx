import type { Metadata } from 'next';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /support Layout — Foundational Wrapper

   Architecture:
   ┌──────────────────────────────────────────────────────┐
   │  LandingHeader (sticky, full-bleed)                 │
   ├──────────────────────────────────────────────────────┤
   │  ┌─────────── max-w-7xl · mx-auto ───────────┐     │
   │  │  <main>  — single-column scroll content    │     │
   │  │  px-6 / lg:px-8 for gutter safety          │     │
   │  └────────────────────────────────────────────┘     │
   ├──────────────────────────────────────────────────────┤
   │  LandingFooter (full-bleed)                         │
   └──────────────────────────────────────────────────────┘

   Design System Compliance:
   • bg → var(--pw-bg)   adapts light (#f2f2f2) / dark (#121212)
   • fg → var(--pw-fg)   adapts light (#595959) / dark (#f4f4f5)
   • All descendant text inherits high-contrast token cascade
   • Container max-w-7xl keeps reading lines ≤ 75ch on ultrawide
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Support & Knowledge Base | PaperWorking',
  description:
    'Technical documentation, standard operating procedures, and direct support for real estate investors.',
  openGraph: {
    title: 'Support & Knowledge Base | PaperWorking',
    description:
      'Technical documentation, standard operating procedures, and direct support for real estate investors.',
    siteName: 'PaperWorking',
    type: 'website',
  },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundColor: 'var(--pw-bg)',
        color: 'var(--pw-fg)',
      }}
    >
      {/* ── Sticky Header — full-bleed, owns its own max-width ── */}
      <LandingHeader />

      {/* ── Main Content — single-column, capped width ──
          pt-20 accounts for the fixed header height (h-16/h-20).
          The vertical padding between sections is owned by page.tsx
          so that individual sections can control their own spacing. */}
      <main
        className="flex-1 w-full mx-auto max-w-7xl px-6 lg:px-8 pt-20"
        role="main"
        aria-label="Support content"
      >
        {children}
      </main>

      {/* ── Footer — full-bleed, owns its own max-width ── */}
      <LandingFooter />
    </div>
  );
}
