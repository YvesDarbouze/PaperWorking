import Link from 'next/link';
import type { Metadata } from 'next';
import ContactInquiryForm from '@/components/marketing/ContactInquiryForm';
import { CONTACT_CHANNELS } from '@/lib/marketing/support-data';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact PaperWorking support and sales.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10">
      <section className="mb-12 text-center">
        <p className="pw-section-eyebrow mb-3">Contact</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">
          Talk to our team
        </h1>
        <p
          className="mx-auto max-w-[52ch] text-base leading-relaxed"
          style={{ color: 'var(--color-on-surface-variant)' }}
        >
          Send a message below or reach us through the channel that fits your plan.
        </p>
      </section>

      <section className="mb-12 grid gap-4 md:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => (
          <article key={channel.id} className="pw-card p-5">
            <p className="pw-section-eyebrow mb-2">{channel.label}</p>
            <h2 className="mb-2 text-lg font-semibold">{channel.headline}</h2>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--color-on-surface-variant)' }}>
              {channel.description}
            </p>
            <Link href={channel.href} className="pw-pill-cta inline-flex w-fit text-[13px]">
              {channel.href.startsWith('mailto:') ? 'Send email' : 'Open channel'}
            </Link>
          </article>
        ))}
      </section>

      <section className="pw-card mx-auto max-w-xl p-6">
        <h2 className="mb-2 text-xl font-semibold">General inquiry</h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--color-on-surface-variant)' }}>
          We typically respond within one business day. Investment Team accounts receive priority
          handling during business hours.
        </p>
        <ContactInquiryForm />
        <div className="mt-6 border-t border-white/8 pt-4">
          <Link href="/support" className="text-sm underline-offset-2 hover:underline">
            Visit support center →
          </Link>
        </div>
      </section>
    </div>
  );
}
