import Link from 'next/link';
import type { Metadata } from 'next';
import { CONTACT_CHANNELS } from '@/lib/marketing/support-data';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contact PaperWorking support and sales.',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 md:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20">
      <section className="mb-12 text-center">
        <p className="mb-2.5 font-[family-name:var(--font-jetbrains-mono)] text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Contact
        </p>
        <h1 className="landing-display mb-4 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl md:text-5xl">
          Talk to our team
        </h1>
        <p className="mx-auto max-w-[52ch] text-base leading-relaxed text-muted-foreground">
          Connect with our team directly through our Support Center, explore our platform guides, or request a scheduled callback.
        </p>
      </section>

      <section className="mb-12 grid gap-6 md:grid-cols-3">
        {CONTACT_CHANNELS.map((channel) => (
          <article
            key={channel.id}
            className="flex flex-col justify-between rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-colors hover:border-foreground/20"
          >
            <div>
              <p className="mb-2 font-[family-name:var(--font-jetbrains-mono)] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {channel.label}
              </p>
              <h2 className="mb-2 text-lg font-semibold text-foreground">{channel.headline}</h2>
              <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                {channel.description}
              </p>
            </div>
            <Link
              href={channel.href}
              className="inline-flex min-h-[44px] items-center justify-center rounded-none border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
            >
              {channel.href.startsWith('mailto:') ? 'Send email' : 'Open channel'}
            </Link>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-xl rounded-none border border-border bg-card p-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 text-center">
        <h2 className="mb-3 text-xl font-semibold text-foreground">General inquiry</h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          Have a question about the REIL framework, Deal Calculator, or institutional plans? Explore our knowledge base, ask Pepper AI, or request a call back from a specialist.
        </p>
        <Link
          href="/support"
          className="inline-flex min-h-[44px] items-center justify-center rounded-none bg-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm"
        >
          Visit Support Center
        </Link>
      </section>
    </div>
  );
}
