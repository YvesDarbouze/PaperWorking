import { Metadata } from 'next';
import Link from 'next/link';
import { Mail, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import LandingHeader from '@/components/landing/LandingHeader';
import LandingFooter from '@/components/landing/LandingFooter';

/* ═══════════════════════════════════════════════════════
   /contact — Contact page
   
   Obsidian glass theme. Unified LandingHeader navigation.
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
    <div className="min-h-screen bg-background text-on-surface dark">
      <LandingHeader />

      <main className="max-w-4xl mx-auto px-6 md:px-margin-desktop pt-32 pb-24">
        {/* ── Header ── */}
        <section className="mb-20">
          <p className="font-label-sm text-label-sm text-primary uppercase tracking-widest mb-6">
            Contact
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight leading-none mb-6">
            Talk to us.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed max-w-xl">
            Whether you need help with your account, want to explore team pricing,
            or have feedback — we&apos;re here.
          </p>
        </section>

        {/* ── Contact channels ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
          {CHANNELS.map((ch) => (
            <div
              key={ch.title}
              className="rounded-2xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(34,43,50,0.4), rgba(20,29,35,0.8))',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                borderLeft: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <ch.icon
                className="w-6 h-6 mb-5 text-primary"
                aria-hidden="true"
              />
              <h3 className="font-label-md text-label-md text-on-surface mb-2">
                {ch.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed flex-1 mb-4">
                {ch.body}
              </p>
              {ch.href && (
                <a
                  href={ch.href}
                  className="font-label-sm text-label-sm text-primary hover:underline decoration-primary/50 transition-colors"
                >
                  {ch.action}
                </a>
              )}
            </div>
          ))}
        </section>

        {/* ── Self-service CTA ── */}
        <section
          className="rounded-2xl p-10 sm:p-14 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(34,43,50,0.6), rgba(20,29,35,0.95))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            borderLeft: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mb-3">
            Need an answer right now?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mb-8 max-w-md mx-auto">
            Most questions are covered in our Support Hub — step-by-step guides
            for every phase of the investment lifecycle.
          </p>
          <Link
            href="/support"
            className="luminous-button inline-flex items-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md tracking-wide active:scale-95 transition-all duration-150"
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
