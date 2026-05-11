import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import MarketingNavbar from '@/components/marketing/MarketingNavbar';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /contact — Contact page
   
   Provides investors a clear path to reach the team.
   Follows Antigravity grayscale design system.
   ═══════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: 'Contact Us | PaperWorking',
  description:
    'Get in touch with the PaperWorking team. We respond to every inquiry within one business day.',
};

const CHANNELS = [
  {
    icon: Mail,
    title: 'Email Support',
    body: 'For account, billing, or technical questions.',
    action: 'support@paperworking.co',
    href: 'mailto:support@paperworking.co',
  },
  {
    icon: MessageSquare,
    title: 'Sales & Partnerships',
    body: 'For enterprise plans, team licenses, or vendor integration.',
    action: 'sales@paperworking.co',
    href: 'mailto:sales@paperworking.co',
  },
  {
    icon: Clock,
    title: 'Response Time',
    body: 'We respond to every inquiry within one business day — usually faster.',
    action: null,
    href: null,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-canvas)' }}>
      <MarketingNavbar />

      <main className="max-w-4xl mx-auto px-6 pt-32 pb-24">
        {/* ── Header ── */}
        <section className="mb-20">
          <p
            className="text-[10px] font-black uppercase tracking-[0.35em] mb-6"
            style={{ color: 'var(--text-secondary)' }}
          >
            Contact
          </p>
          <h1
            className="text-5xl sm:text-6xl font-black tracking-tighter leading-none mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Talk to us.
          </h1>
          <p
            className="text-lg leading-relaxed max-w-xl"
            style={{ color: 'var(--text-secondary)' }}
          >
            Whether you need help with your account, want to explore team pricing,
            or have feedback — we&apos;re here.
          </p>
        </section>

        {/* ── Contact channels ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          {CHANNELS.map((ch) => (
            <div
              key={ch.title}
              className="rounded-xl p-8 flex flex-col"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-ui)',
              }}
            >
              <ch.icon
                className="w-6 h-6 mb-5"
                style={{ color: 'var(--text-primary)' }}
                aria-hidden="true"
              />
              <h3
                className="text-sm font-bold tracking-tight mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {ch.title}
              </h3>
              <p
                className="text-sm leading-relaxed flex-1 mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                {ch.body}
              </p>
              {ch.href && (
                <a
                  href={ch.href}
                  className="text-xs font-bold uppercase tracking-widest hover:underline"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {ch.action}
                </a>
              )}
            </div>
          ))}
        </section>

        {/* ── Self-service CTA ── */}
        <section
          className="rounded-xl p-10 sm:p-14 text-center"
          style={{
            background: '#0d0d0d',
            color: '#FFFFFF',
          }}
        >
          <h2 className="text-2xl font-bold tracking-tight mb-3">
            Need an answer right now?
          </h2>
          <p className="text-sm text-white/60 mb-8 max-w-md mx-auto">
            Most questions are covered in our Support Hub — step-by-step guides
            for every phase of the investment lifecycle.
          </p>
          <Link
            href="/support"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-[#0d0d0d] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/90 transition-colors"
          >
            Browse Support Articles
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
